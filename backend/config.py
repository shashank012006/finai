import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'finai_super_secret_jwt_key_2026_production_secure_key_64_bytes')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'finai_jwt_secret_token_key_9988_super_secure_64bytes_key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    
    # PostgreSQL connection URL
    # Format: postgresql://username:password@localhost:5432/database_name
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        'postgresql+psycopg2://shashankv@localhost:5432/finai_db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # File Upload settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload limit
    
    # LLM & RAG settings
    LLM_API_KEY = os.environ.get('LLM_API_KEY', '')
    LLM_PROVIDER = os.environ.get('LLM_PROVIDER', 'gemini') # gemini / openai / custom
    LLM_MODEL = os.environ.get('LLM_MODEL', 'gemini-1.5-flash')
    
    # Model storage path
    MODEL_DIR = os.environ.get(
        'MODEL_DIR',
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
    )
