"""Development-only reset for the demo schema.

Run from backend: python -m app.fixtures.reset
"""
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.fixtures.seed import seed


def reset_demo() -> None:
    if settings.app_env not in {"development", "test"}:
        raise RuntimeError("Demo database reset is disabled outside development/test")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)


if __name__ == "__main__":
    reset_demo()
    print("Demo database reset and seed completed.")
