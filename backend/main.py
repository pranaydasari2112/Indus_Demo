import os
import json
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from sqlalchemy import text

# Load environment variables
load_dotenv()

# Verify API key configuration
if not os.getenv("GEMINI_API_KEY"):
    print("WARNING: GEMINI_API_KEY is not set in environment variables.")

from database.connection import SessionLocalRO
from graph.workflow import app_graph

app = FastAPI(title="Indus - Procurement Intelligence API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    question: str
    history: List[Dict[str, Any]] = []

class ChartSpec(BaseModel):
    type: str = ""
    x: str = ""
    y: str = ""
    title: str = ""

class ChatResponse(BaseModel):
    question: str
    answer: str
    sql: str
    data: List[Dict[str, Any]]
    chart: ChartSpec

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main conversational analytics endpoint.
    Runs the user request through the LangGraph StateGraph.
    """
    initial_state = {
        "question": request.question,
        "history": request.history,
        "sql": "",
        "validation_error": None,
        "query_result": [],
        "answer": "",
        "chart": {},
        "intent": "",
        "retry_count": 0
    }
    
    try:
        # Run graph workflow
        final_state = app_graph.invoke(initial_state)
        
        # Prepare chart representation matching response requirement
        chart_info = final_state.get("chart") or {}
        chart_spec = ChartSpec(
            type=chart_info.get("type", ""),
            x=chart_info.get("x", ""),
            y=chart_info.get("y", ""),
            title=chart_info.get("title", "")
        )
        
        return ChatResponse(
            question=final_state.get("question", ""),
            answer=final_state.get("answer", ""),
            sql=final_state.get("sql", ""),
            data=final_state.get("query_result") or [],
            chart=chart_spec
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent runtime error: {str(e)}")

@app.get("/api/kpi")
async def get_kpis():
    """
    Retrieves high-level summary KPIs directly from the SQLite database
    to drive the corporate dashboard KPI cards.
    """
    db = SessionLocalRO()
    try:
        # 1. Open Commitment (Outstanding PO value in INR)
        q_commitment = text("SELECT SUM(open_po_amount_inr) FROM purchase_orders")
        commitment = db.execute(q_commitment).scalar() or 0.0
        
        # 2. Active POs
        q_active_pos = text("SELECT COUNT(DISTINCT po_number) FROM purchase_orders WHERE po_status IN ('Open', 'Partially Fulfilled')")
        active_pos = db.execute(q_active_pos).scalar() or 0
        
        # 3. Vendors Engaged
        q_vendors = text("SELECT COUNT(DISTINCT vendor_id) FROM purchase_orders")
        vendors = db.execute(q_vendors).scalar() or 0
        
        # 4. Average Cycle Time (average PO ageing in days for open records)
        q_cycle_time = text("SELECT AVG(po_ageing_days) FROM purchase_orders WHERE po_status IN ('Open', 'Partially Fulfilled')")
        cycle_time = db.execute(q_cycle_time).scalar() or 0.0
        
        return {
            "open_commitment": round(commitment, 2),
            "active_pos": active_pos,
            "vendors_engaged": vendors,
            "avg_cycle_time": round(cycle_time, 1)
        }
    except Exception as e:
        # Fallback values if database is empty/not seeded yet
        return {
            "open_commitment": 0.0,
            "active_pos": 0,
            "vendors_engaged": 0,
            "avg_cycle_time": 0.0,
            "error": str(e)
        }
    finally:
        db.close()

@app.get("/api/dashboard-charts")
async def get_dashboard_charts():
    """
    Returns aggregated metrics from SQLite for dashboard static visualizations.
    """
    db = SessionLocalRO()
    try:
        # 1. Commitment by Region
        q_region = text("""
            SELECT region_name as name, SUM(open_po_amount_inr) as value 
            FROM purchase_orders 
            WHERE region_name IS NOT NULL AND region_name != '' 
            GROUP BY region_name
        """)
        region_res = db.execute(q_region).all()
        region_data = [{"name": r[0], "value": round(r[1], 2)} for r in region_res]

        # 2. Top 5 Vendors by Open Commitment
        q_vendors = text("""
            SELECT vendor_name as name, SUM(open_po_amount_inr) as value 
            FROM purchase_orders 
            WHERE vendor_name IS NOT NULL AND vendor_name != '' 
            GROUP BY vendor_name 
            ORDER BY value DESC 
            LIMIT 5
        """)
        vendors_res = db.execute(q_vendors).all()
        vendors_data = [{"name": v[0], "value": round(v[1], 2)} for v in vendors_res]

        # 3. Open POs by Ageing Slab
        q_ageing = text("""
            SELECT po_ageing_slab as name, COUNT(DISTINCT po_number) as value 
            FROM purchase_orders 
            WHERE po_status IN ('Open', 'Partially Fulfilled') AND po_ageing_slab IS NOT NULL AND po_ageing_slab != '' 
            GROUP BY po_ageing_slab
        """)
        ageing_res = db.execute(q_ageing).all()
        ageing_data = [{"name": a[0], "value": a[1]} for a in ageing_res]

        # 4. PO Status Distribution
        q_status = text("""
            SELECT po_status as name, COUNT(DISTINCT po_number) as value 
            FROM purchase_orders 
            WHERE po_status IS NOT NULL AND po_status != '' 
            GROUP BY po_status
        """)
        status_res = db.execute(q_status).all()
        status_data = [{"name": s[0], "value": s[1]} for s in status_res]

        return {
            "region_commitment": region_data,
            "top_vendors": vendors_data,
            "ageing_slabs": ageing_data,
            "po_status": status_data
        }
    except Exception as e:
        return {
            "region_commitment": [],
            "top_vendors": [],
            "ageing_slabs": [],
            "po_status": [],
            "error": str(e)
        }
    finally:
        db.close()
