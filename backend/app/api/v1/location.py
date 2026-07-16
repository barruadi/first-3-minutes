from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.admin import LocationResponse
from app.services.admin import list_locations

router = APIRouter(prefix="/locations", tags=["location"])


@router.get("", response_model=list[LocationResponse])
def list_all_locations(db: Session = Depends(get_db)):
    return list_locations(db)
