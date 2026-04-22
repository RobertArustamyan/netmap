from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Database (direct connection, not pooled — required for Alembic migrations)
    database_url: str  # postgresql+asyncpg://postgres:[password]@db.[ref].supabase.co:5432/postgres

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_pro: str = ""

    # Email (Resend)
    resend_api_key: str = ""
    resend_from_domain: str = "netmap.app"

    # PostHog
    posthog_api_key: str = ""

    # App
    cors_origins: list[str] = ["http://localhost:3000"]
    environment: str = "development"


settings = Settings()
