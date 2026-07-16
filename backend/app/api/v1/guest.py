from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.guest import GuestRouteResponse
from app.services.qr import resolve_guest_route

router = APIRouter(prefix="/guest", tags=["guest"])


@router.get("/rescue/{token}", response_model=GuestRouteResponse)
def get_guest_route(token: str, db: Session = Depends(get_db)):
    return resolve_guest_route(db, token)
