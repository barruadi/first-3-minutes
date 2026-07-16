import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["ENABLE_SPATIAL_FALLBACK"] = "true"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.fixtures.seed import seed
from app.main import app

engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)


@pytest.fixture(autouse=True)
def isolated_ai_settings(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    monkeypatch.setattr(settings, "enable_spatial_fallback", True)
    monkeypatch.setattr(settings, "spatial_ai_timeout_seconds", 8.0)


@pytest.fixture
def db(tmp_path):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    settings.storage_dir = str(tmp_path / "storage")
    with TestingSession() as session:
        seed(session)
        yield session


@pytest.fixture
def client(db):
    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
