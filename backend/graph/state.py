from typing import List, Dict, Any, TypedDict, Optional

class AnalyticsState(TypedDict):
    question: str
    history: List[Dict[str, Any]]
    sql: Optional[str]
    validation_error: Optional[str]
    query_result: Optional[List[Dict[str, Any]]]
    answer: Optional[str]
    chart: Optional[Dict[str, Any]]
    intent: Optional[str]
    retry_count: int
