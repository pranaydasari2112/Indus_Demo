import os
import json
from sqlalchemy import text
from langchain_mistralai import ChatMistralAI
from database.connection import get_db_schema, SessionLocalRO
from database.business_glossary import BUSINESS_GLOSSARY
from ai.prompts.sql_prompt import SQL_GENERATOR_PROMPT, SQL_FIXER_PROMPT
from ai.prompts.response_prompt import RESPONSE_ANALYSIS_PROMPT
from ai.prompts.chart_prompt import CHART_DECISION_PROMPT
from graph.state import AnalyticsState

# Initialize Mistral AI model
model_name = os.getenv("MODEL_NAME", "mistral-large-latest")
api_key = os.getenv("MISTRAL_API_KEY")
llm = ChatMistralAI(
    model=model_name,
    mistral_api_key=api_key,
    temperature=0.0
)

def get_content_string(content) -> str:
    """Helper to convert list or text types returned by Gemini to strings."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and "text" in part:
                parts.append(part["text"])
            else:
                parts.append(str(part))
        return "".join(parts)
    return str(content) if content is not None else ""

def clean_sql_output(sql) -> str:
    """Removes backticks and wraps from generated SQL statements."""
    sql = get_content_string(sql).strip()
    if sql.startswith("```"):
        lines = sql.split("\n")
        if lines[0].startswith("```sql") or lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        sql = "\n".join(lines).strip()
    if sql.startswith("`") and sql.endswith("`"):
        sql = sql.strip("`").strip()
        if sql.startswith("sql"):
            sql = sql[3:].strip()
    if sql.endswith(";"):
        sql = sql[:-1].strip()
    return sql

def clean_json_output(json_str) -> str:
    """Removes backticks and wraps from LLM json output."""
    json_str = get_content_string(json_str).strip()
    if json_str.startswith("```"):
        lines = json_str.split("\n")
        if lines[0].startswith("```json") or lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        json_str = "\n".join(lines).strip()
    return json_str

def intent_node(state: AnalyticsState) -> dict:
    """Understands user requirement and classifies the intent."""
    question = state.get("question", "")
    
    prompt = f"""You are an expert NLP classifier.
Classify the user requirement for this question: "{question}".
Identify the query intent from these types:
- aggregation: For summarizing, grouping, counting, or averaging procurement data (e.g., total PO value, average ageing).
- comparison: For comparing procurement data across groups, vendors, regions, or timeframes.
- trend: For analyzing procurement metrics over time (e.g., monthly spend, PO count trend).
- ranking: For finding top/bottom vendors, materials, or regions based on a specific metric.
- filtering: For listing specific POs, vendors, or invoices based on specific criteria.
- visualization request: For questions explicitly asking for charts, graphs, or visual representations.
- unrelated: Use this ONLY if the question is completely unrelated to procurement, purchase orders, vendors, materials, circles/regions, payments, invoices, or other topics in our procurement database (e.g., sports, movies, weather, general history, personal questions).
- modification: Use this if the user is asking to modify, drop, delete, update, insert, alter, or write data in the database (e.g., "drop rows", "delete vendor", "update status", "add a column", "create table").
- ambiguous: Use this if the question is incomplete, lacks sufficient parameters, or is too vague to write a specific SQL query without making major assumptions (e.g., "show me top PO", "show me top pos", "list purchase orders", "get the purchase orders", "filter list"). If the user asks for "top" or "bottom" without specifying the metric (like line amount, open commitment value, or ageing days) or asks to "list/show/get POs" without specific filters/conditions, ALWAYS classify it as ambiguous.

Also decide if the user explicitly requested or strongly implied a chart or visualization.
Generate a valid JSON object only with structure:
{{
  "type": "aggregation" | "comparison" | "trend" | "ranking" | "filtering" | "visualization request" | "unrelated" | "modification" | "ambiguous",
  "visualization": true | false
}}
"""
    try:
        res = llm.invoke(prompt)
        content = clean_json_output(res.content)
        intent_data = json.loads(content)
        return {"intent": json.dumps(intent_data)}
    except Exception as e:
        # Default fallback intent
        return {"intent": json.dumps({"type": "aggregation", "visualization": False})}

def sql_generator_node(state: AnalyticsState) -> dict:
    """Generates SQLite SELECT query based on schema and business rules."""
    question = state.get("question", "")
    history = state.get("history", [])
    schema = get_db_schema()
    
    intent_str = state.get("intent", "{}")
    try:
        intent_data = json.loads(intent_str)
    except Exception:
        intent_data = {}
        
    if intent_data.get("type") in ["unrelated", "modification", "ambiguous"]:
        return {
            "sql": "",
            "validation_error": intent_data.get("type"),
            "retry_count": 0
        }
        
    prompt = SQL_GENERATOR_PROMPT.format(
        schema=schema,
        business_glossary=BUSINESS_GLOSSARY,
        history=str(history),
        question=question
    )
    
    res = llm.invoke(prompt)
    sql = clean_sql_output(res.content)
    
    return {
        "sql": sql,
        "validation_error": None,
        "retry_count": 0
    }

def sql_validator_node(state: AnalyticsState) -> dict:
    """Validates query security parameters and syntax structures."""
    validation_error = state.get("validation_error", "")
    if validation_error in ["unrelated", "modification", "ambiguous"]:
        return {"validation_error": validation_error}
        
    sql = state.get("sql", "")
    if not sql:
        return {"validation_error": "No SQL query generated."}
        
    cleaned_sql = sql.strip().upper()
    forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "ATTACH", "PRAGMA"]
    for keyword in forbidden:
        if f" {keyword} " in f" {cleaned_sql} " or cleaned_sql.startswith(keyword):
            return {"validation_error": f"Security violation: Forbidden keyword '{keyword}' detected. Only SELECT operations are permitted."}
            
    if not cleaned_sql.startswith("SELECT"):
        return {"validation_error": "Security violation: Query must be a SELECT statement."}
        
    # Syntax compile check using SQLite EXPLAIN (Safe check: compiles but does not execute)
    db = SessionLocalRO()
    try:
        db.execute(text(f"EXPLAIN {sql}"))
        error = None
    except Exception as e:
        error = f"SQLite compile error: {str(e)}"
    finally:
        db.close()
        
    return {"validation_error": error}

def sql_fix_node(state: AnalyticsState) -> dict:
    """Corrects SQL when validations or executions fail."""
    question = state.get("question", "")
    failed_sql = state.get("sql", "")
    error_message = state.get("validation_error", "")
    schema = get_db_schema()
    retry_count = state.get("retry_count", 0)
    
    prompt = SQL_FIXER_PROMPT.format(
        schema=schema,
        business_glossary=BUSINESS_GLOSSARY,
        question=question,
        failed_sql=failed_sql,
        error_message=error_message
    )
    
    res = llm.invoke(prompt)
    fixed_sql = clean_sql_output(res.content)
    
    return {
        "sql": fixed_sql,
        "retry_count": retry_count + 1
    }

def query_execution_node(state: AnalyticsState) -> dict:
    """Executes the validated SQL query on the SQLite DB."""
    sql = state.get("sql", "")
    validation_error = state.get("validation_error", "")
    
    if validation_error:
        return {"query_result": []}
        
    db = SessionLocalRO()
    try:
        result = db.execute(text(sql))
        columns = result.keys()
        rows = [dict(zip(columns, row)) for row in result.fetchall()]
        db.close()
        return {
            "query_result": rows,
            "validation_error": None
        }
    except Exception as e:
        db.close()
        return {
            "validation_error": f"SQLite runtime error: {str(e)}"
        }

def result_analysis_node(state: AnalyticsState) -> dict:
    """Translates SQL output into business insights."""
    question = state.get("question", "")
    sql = state.get("sql", "")
    query_result = state.get("query_result", [])
    validation_error = state.get("validation_error", "")
    
    if validation_error == "unrelated":
        prompt = f"""You are a procurement analyst and assistant for a corporate purchase orders database.
The user asked: "{question}".
This request is completely unrelated to procurement, purchase orders, vendors, materials, circles/regions, payments, invoices, or other topics in our database.
Explain politely, conversationally, and professionally that you cannot answer this because your expertise and database access are limited to procurement data and corporate analytics.
Kindly ask the user to ask something related to procurement or the purchase orders database.
Do NOT include any markdown formatting wrappers or codeblocks. Simply return the text response directly.
"""
        res = llm.invoke(prompt)
        return {"answer": get_content_string(res.content)}
        
    if validation_error == "modification" or (validation_error and "Security violation" in validation_error):
        prompt = f"""You are a read-only database assistant and procurement analyst.
The user asked: "{question}".
This request involves modifying, deleting, inserting, or altering the database structure/data (e.g., dropping rows/tables, updating columns).
Explain politely and professionally that you are operating in a read-only environment, so database modifications, deletions, or schema changes are not allowed.
Detail exactly what they requested and explain that you can only perform SELECT queries to analyze or display the data, but cannot write or modify it.
Do NOT include any markdown formatting wrappers or codeblocks. Simply return the text response directly.
"""
        res = llm.invoke(prompt)
        return {"answer": get_content_string(res.content)}
        
    if validation_error == "ambiguous":
        prompt = f"""You are a database assistant and procurement analyst.
The user asked: "{question}".
This question is too ambiguous, vague, or incomplete to construct a precise SQL database query (e.g., it asks for "top PO" but doesn't specify if it should be ranked by line amount, open commitment value, delay days, etc., or filtered by vendor/region).
Politely explain what is missing or why the query cannot be generated directly.
Suggest specific clarifications they can provide to help you answer, such as:
- Do they want to rank POs by total amount, outstanding commitment, or ageing days?
- Are they interested in a specific vendor, region, circle, or time period?
Do NOT include any markdown formatting wrappers or codeblocks. Simply return the text response directly.
"""
        res = llm.invoke(prompt)
        return {"answer": get_content_string(res.content)}
        
    if validation_error:
        return {"answer": f"### Error\nI encountered an error trying to process this request:\n\n`{validation_error}`"}
        
    # Check if empty or only contains None values (common for SUM/AVG aggregate on empty rows)
    is_empty = not query_result
    if not is_empty and len(query_result) == 1:
        first_val = list(query_result[0].values())[0]
        if first_val is None:
            is_empty = True

    if is_empty:
        prompt = f"""You are a database assistant and procurement analyst.
The user asked: "{question}".
The SQLite query generated was: "{sql}".
However, this query returned no records or empty/NULL results from the database.
Identify what specific search term, vendor, region, circle, or parameter in the user's question likely does not exist in the database (e.g., if they asked for a vendor like "Google" or a region like "North" that isn't in our procurement data).
Generate a polite and conversational response explaining that no records were found matching those criteria.
Suggest verifying the spelling of the vendor name, circle, or dates, and mention that they can query the database schema catalog or ask for a list of valid vendors/regions to see what data is available.
Do NOT include any markdown formatting wrappers or codeblocks. Simply return the text response directly.
"""
        res = llm.invoke(prompt)
        return {"answer": get_content_string(res.content)}
        
    prompt = RESPONSE_ANALYSIS_PROMPT.format(
        question=question,
        sql=sql,
        query_result=str(query_result[:50])  # limit tokens
    )
    
    res = llm.invoke(prompt)
    return {"answer": get_content_string(res.content)}

def visualization_node(state: AnalyticsState) -> dict:
    """Decides if chart is required and returns formatting structure."""
    question = state.get("question", "")
    sql = state.get("sql", "")
    query_result = state.get("query_result", [])
    intent = state.get("intent", "")
    validation_error = state.get("validation_error", "")
    
    if validation_error or not query_result or len(query_result) < 2:
        return {"chart": {}}
        
    prompt = CHART_DECISION_PROMPT.format(
        question=question,
        sql=sql,
        query_result=str(query_result[:50]),
        intent=intent
    )
    
    try:
        res = llm.invoke(prompt)
        content = clean_json_output(res.content)
        chart_data = json.loads(content)
        if chart_data.get("generate_chart", False):
            sample_row = query_result[0]
            x_col = chart_data.get("x")
            y_col = chart_data.get("y")
            
            # Case-insensitive column matching to prevent mismatch errors
            actual_cols = list(sample_row.keys())
            matched_x = next((c for c in actual_cols if c.lower() == str(x_col).lower()), None)
            matched_y = next((c for c in actual_cols if c.lower() == str(y_col).lower()), None)
            
            if matched_x and matched_y:
                # Helper to check if a value is numeric
                def is_numeric(val) -> bool:
                    if isinstance(val, (int, float)):
                        return True
                    if isinstance(val, str):
                        try:
                            float(val)
                            return True
                        except ValueError:
                            return False
                    return False

                # Runtime check: Ensure Y is numeric and X is categorical.
                # If X is numeric and Y is not numeric, swap them to prevent blank charts.
                x_val = sample_row[matched_x]
                y_val = sample_row[matched_y]
                if chart_data.get("type", "").lower() != "scatter" and is_numeric(x_val) and not is_numeric(y_val):
                    matched_x, matched_y = matched_y, matched_x

                return {
                    "chart": {
                        "type": chart_data.get("type"),
                        "x": matched_x,
                        "y": matched_y,
                        "title": chart_data.get("title")
                    }
                }
        return {"chart": {}}
    except Exception:
        return {"chart": {}}


def final_response_node(state: AnalyticsState) -> dict:
    """Prepares final state structure for routing API."""
    return state
