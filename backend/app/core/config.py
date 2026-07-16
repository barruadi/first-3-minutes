from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    postgres_db: str = "three_minutes"
    postgres_user: str = "three_minutes"
    postgres_password: str = "change_me"
    database_url: str = "postgresql+psycopg://three_minutes:change_me@localhost:5432/three_minutes"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    demo_building_id: str = "building-demo-001"
    qr_token_secret: str = "insecure-placeholder-change-me"

    enable_spatial_fallback: bool = True
    log_level: str = "INFO"


settings = Settings()
