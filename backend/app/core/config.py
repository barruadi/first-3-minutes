from pathlib import Path

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    postgres_db: str = "three_minutes"
    postgres_user: str = "three_minutes"
    postgres_password: str = "change_me"
    database_url: str = "postgresql+psycopg://three_minutes:change_me@localhost:5432/three_minutes"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    spatial_ai_timeout_seconds: float = 8.0
    spatial_max_file_bytes: int = 2 * 1024 * 1024
    spatial_max_payload_bytes: int = 4 * 1024 * 1024
    spatial_max_dimension: int = 4096

    demo_building_id: str = "building-demo-001"
    qr_token_secret: str = "insecure-placeholder-change-me"
    guest_base_url: str = Field(
        default="https://localhost:5174",
        validation_alias=AliasChoices("GUEST_BASE_URL", "VITE_GUEST_BASE_URL"),
    )
    storage_dir: str = "storage"
    floor_plan_max_bytes: int = 10 * 1024 * 1024

    rating_reaction_weight: float = 0.35
    rating_evacuation_weight: float = 0.35
    rating_posture_weight: float = 0.30
    rating_reaction_excellent_ms: int = 5_000
    rating_reaction_max_ms: int = 30_000
    rating_evacuation_excellent_ms: int = 45_000
    rating_evacuation_max_ms: int = 180_000
    rating_platinum_threshold: float = 85.0
    rating_gold_threshold: float = 70.0
    reward_window_days: int = 7
    rating_decay_grace_days: int = 30
    rating_decay_weekly_rate: float = 0.05

    api_base_url: str = "http://localhost:8000"

    enable_spatial_fallback: bool = True
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173,http://localhost:5174,https://localhost:5173,https://localhost:5174"

    @field_validator("storage_dir")
    @classmethod
    def normalize_storage_dir(cls, value: str) -> str:
        return str(Path(value))

    @field_validator("gemini_model")
    @classmethod
    def default_gemini_model(cls, value: str) -> str:
        return value.strip() or "gemini-3.5-flash"

    @model_validator(mode="after")
    def production_secrets(self) -> "Settings":
        if self.app_env == "production" and self.qr_token_secret in {"", "insecure-placeholder-change-me"}:
            raise ValueError("QR_TOKEN_SECRET must be configured in production")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
