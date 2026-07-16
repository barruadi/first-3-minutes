from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.resident import ResidentHistoryResponse, ResidentHomeResponse, ResidentRewardsResponse
from app.services.resident import get_history, get_home, get_rewards

router = APIRouter(prefix="/resident", tags=["resident"])


@router.get("/home", response_model=ResidentHomeResponse)
def resident_home(
    installation_id: str = Query(..., alias="installationId"),
    db: Session = Depends(get_db),
):
    return get_home(db, installation_id)


@router.get("/rewards", response_model=ResidentRewardsResponse)
def resident_rewards(
    installation_id: str = Query(..., alias="installationId"),
    db: Session = Depends(get_db),
):
    return get_rewards(db, installation_id)


@router.get("/history", response_model=ResidentHistoryResponse)
def resident_history(
    installation_id: str = Query(..., alias="installationId"),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_history(db, installation_id, limit, cursor)
