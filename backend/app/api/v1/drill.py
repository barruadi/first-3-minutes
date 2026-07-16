from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.drill import DrillCompletionResponse, DrillMetricsRequest
from app.services.rating import complete_drill

router = APIRouter(prefix="/drills", tags=["drill"])


@router.post("/{drill_id}/complete", response_model=DrillCompletionResponse)
def complete_drill_endpoint(
    drill_id: str,
    body: DrillMetricsRequest,
    db: Session = Depends(get_db),
):
    return complete_drill(db, drill_id, body)
