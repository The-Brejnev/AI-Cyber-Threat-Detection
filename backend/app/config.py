from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/cyber_threat_detection"
    JWT_SECRET_KEY: str = "root"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 587
    EMAIL_USERNAME: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    EMAIL_FROM_NAME: str = "CyberGuard AI"
    
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    SMS_ENABLED: bool = False
    
    GEOIP_PROVIDER: str = "ip-api"
    MAXMIND_API_KEY: str = ""
    
    SIMULATION_INTERVAL_SECONDS: int = 8
    ENVIRONMENT: str = "development"  # "development", "production", "testing"
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:5173"  # Comma-separated for multiple origins
    
    # Optional: Add validation method
    def validate(self):
        """Validate critical settings."""
        if not self.DATABASE_URL:
            raise ValueError("DATABASE_URL is required")
        if not self.JWT_SECRET_KEY:
            raise ValueError("JWT_SECRET_KEY is required")
        if self.ENVIRONMENT == "production":
            if self.JWT_SECRET_KEY == "root":
                raise ValueError("Cannot use default JWT_SECRET_KEY in production")
            if not self.FRONTEND_URL:
                raise ValueError("FRONTEND_URL is required in production")

    class Config:
        env_file = ".env"

settings = Settings()