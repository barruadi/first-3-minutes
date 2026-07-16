from fastapi import APIRouter

router = APIRouter(prefix="/locations", tags=["location"])


@router.get("")
def list_all_locations():
    return {"items": [], "message": "NOT_IMPLEMENTED"}
