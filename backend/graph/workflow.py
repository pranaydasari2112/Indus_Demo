from langgraph.graph import StateGraph, START, END
from graph.state import AnalyticsState
from graph.nodes import (
    intent_node,
    sql_generator_node,
    sql_validator_node,
    sql_fix_node,
    query_execution_node,
    result_analysis_node,
    visualization_node,
    final_response_node
)

def route_after_validation(state: AnalyticsState) -> str:
    """Routes state based on validation status and retry count."""
    error = state.get("validation_error")
    if error:
        if state.get("retry_count", 0) >= 3 or error in ["unrelated", "modification"] or "Security violation" in error:
            return "result_analysis"
        return "sql_fix"
    return "query_execution"

def route_after_execution(state: AnalyticsState) -> str:
    """Routes state after execution to check for execution errors."""
    if state.get("validation_error"):
        if state.get("retry_count", 0) >= 3:
            return "result_analysis"
        return "sql_fix"
    return "result_analysis"

# Initialize StateGraph
workflow = StateGraph(AnalyticsState)

# Add Nodes
workflow.add_node("intent", intent_node)
workflow.add_node("sql_generator", sql_generator_node)
workflow.add_node("sql_validator", sql_validator_node)
workflow.add_node("sql_fix", sql_fix_node)
workflow.add_node("query_execution", query_execution_node)
workflow.add_node("result_analysis", result_analysis_node)
workflow.add_node("visualization", visualization_node)
workflow.add_node("final_response", final_response_node)

# Set up edges
workflow.add_edge(START, "intent")
workflow.add_edge("intent", "sql_generator")
workflow.add_edge("sql_generator", "sql_validator")

# SQL Validator routes conditionally
workflow.add_conditional_edges(
    "sql_validator",
    route_after_validation,
    {
        "sql_fix": "sql_fix",
        "query_execution": "query_execution",
        "result_analysis": "result_analysis"
    }
)

# SQL Fixer loop back to validator
workflow.add_edge("sql_fix", "sql_validator")

# Query Execution routes conditionally (in case of runtime DB errors)
workflow.add_conditional_edges(
    "query_execution",
    route_after_execution,
    {
        "sql_fix": "sql_fix",
        "result_analysis": "result_analysis"
    }
)

# Core response flow
workflow.add_edge("result_analysis", "visualization")
workflow.add_edge("visualization", "final_response")
workflow.add_edge("final_response", END)

# Compile LangGraph app
app_graph = workflow.compile()
