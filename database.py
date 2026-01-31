"""
Database configuration and session management
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine.url import make_url
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./law_chatbot.db")

# Create engine with proper connection pool settings for Neon/Postgres
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL/Neon configuration
    db_url = make_url(DATABASE_URL)
    connect_args = {
        "connect_timeout": 10,  # Connection timeout
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5
    }

    # Neon pooler connections reject startup parameters like statement_timeout
    if not (db_url.host and "pooler" in db_url.host):
        connect_args["options"] = "-c statement_timeout=30000"  # 30 second statement timeout

    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Test connections before using them (handles stale connections)
        pool_size=3,  # Reduced for Neon pooler limits
        max_overflow=1,  # Minimal overflow
        pool_recycle=60,  # Recycle connections after 1 minute (Neon pooler closes idle connections quickly)
        pool_timeout=30,  # Timeout waiting for connection from pool
        connect_args=connect_args
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create all tables
def create_tables():
    from models import Base
    Base.metadata.create_all(bind=engine)
