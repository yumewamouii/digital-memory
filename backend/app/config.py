from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load backend/.env (not cwd-relative, not .env.example)
_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ГисМемориал"
    secret_key: str = "change_me_in_prod"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = "sqlite:///./digital_memory.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    public_frontend_url: str = "http://localhost:5173"
    algorithm: str = "HS256"

    notification_backend: str = "log"

    oauth_redirect_base: str = "http://localhost:8080"
    google_client_id: str = ""
    google_client_secret: str = ""
    vk_client_id: str = ""
    vk_client_secret: str = ""
    mailru_client_id: str = ""
    mailru_client_secret: str = ""

    # Bootstrap super admin by email after seed (optional)
    super_admin_email: str = ""

    # Auto-moderation for free (brief) memorial pages
    moderation_enabled: bool = True
    moderation_max_photo_bytes: int = 5 * 1024 * 1024
    moderation_nsfw_enabled: bool = True
    moderation_nsfw_threshold: float = 0.6
    moderation_report_threshold: int = 15
    moderation_max_age_years: int = 140
    moderation_max_repeat_chars: int = 4

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return origins or ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
