#!/usr/bin/env python3
"""
Modal deployment for Legal RAG Chatbot API
Uses existing api_server.py and legal_rag_chatbot.py files directly
"""

import modal

# Define the Modal image with exact versions
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")
    .pip_install([
        # Core web framework
        "fastapi==0.116.1",
        "uvicorn==0.35.0", 
        "pydantic[email]==2.11.7",
        "email-validator>=2.0.0",
        
        # LangChain Framework
        "langchain==0.3.27",
        "langchain_community==0.3.27",
        "langchain_groq==0.3.7",
        
        # Vector database
        "qdrant-client==1.15.1",
        
        # ML/Embeddings
        "sentence-transformers==3.0.1",
        "torch>=2.0.0",
        "torchvision>=0.15.0",
        "torchaudio>=2.0.0",
        
        # Database & Authentication
        "sqlalchemy==2.0.23",
        "alembic==1.12.1",
        "psycopg2-binary==2.9.7",  # PostgreSQL driver
        "python-jose[cryptography]==3.3.0",  # JWT tokens
        "passlib[bcrypt]==1.7.4",  # Password hashing
        "bcrypt==4.0.1",
        
        # Payments & External APIs
        
        "stripe>=12.0.0,<13.0.0",
        "google-auth==2.23.4",
        "google-auth-oauthlib==1.1.0",
        "requests==2.31.0",
        "httpx==0.25.2",
        
        # Utilities
        "colorama==0.4.6",
        "python-dotenv==1.1.1",
    ])
    .env({
        "TOKENIZERS_PARALLELISM": "false",
        "TRANSFORMERS_CACHE": "/tmp/transformers_cache",
        "HF_HOME": "/tmp/huggingface_cache"
    })
    # Add essential Python files directly to the image
    .add_local_file("api_server.py", "/project/api_server.py")
    .add_local_file("legal_rag_chatbot.py", "/project/legal_rag_chatbot.py")
    .add_local_file("models.py", "/project/models.py")
    .add_local_file("database.py", "/project/database.py")
    .add_local_file("auth.py", "/project/auth.py")
    .add_local_file("schemas.py", "/project/schemas.py")
    .add_local_file("stripe_service.py", "/project/stripe_service.py")
    .add_local_file("requirements.txt", "/project/requirements.txt")
    .add_local_file("requirements-modal.txt", "/project/requirements-modal.txt")
    .add_local_file("alembic.ini", "/project/alembic.ini")
    .add_local_dir("alembic/", "/project/alembic/")
)

# Create Modal app
app = modal.App("legal-rag-chatbot-api", image=image)

@app.function(
    secrets=[
        modal.Secret.from_name("groq-api-key"),
        modal.Secret.from_name("qdrant-config"),
        modal.Secret.from_name("stripe-config"),
        modal.Secret.from_name("jwt-config"),
        modal.Secret.from_name("google-oauth"),
        modal.Secret.from_name("database-config")
    ],
    timeout=1800,
    cpu=2.0,
    memory=4096,
)
@modal.asgi_app()
def api_server():
    """Deploy the existing FastAPI application"""
    import sys
    sys.path.insert(0, "/project")
    
    # Import your existing API server
    from api_server import app as fastapi_app
    
    return fastapi_app

@app.function(
    secrets=[
        modal.Secret.from_name("groq-api-key"),
        modal.Secret.from_name("qdrant-config"),
        modal.Secret.from_name("stripe-config"),
        modal.Secret.from_name("jwt-config"),
        modal.Secret.from_name("google-oauth"),
        modal.Secret.from_name("database-config")
    ],
    timeout=300,
)
def test_deployment():
    """Test the deployment by importing and testing the chatbot"""
    import sys
    sys.path.insert(0, "/project")
    
    try:
        print("🧪 Testing Modal deployment...")
        
        # Import your existing chatbot
        from legal_rag_chatbot import LegalRAGChatbot
        
        print("🚀 Initializing chatbot...")
        chatbot = LegalRAGChatbot()
        
        # Test search
        test_query = "employment law"
        print(f"🔍 Testing search: '{test_query}'")
        docs = chatbot.search_documents(test_query, k=2)
        print(f"✅ Found {len(docs)} documents")
        
        # Test response generation
        test_question = "What are employment contract requirements in Italy?"
        print(f"❓ Testing response: '{test_question}'")
        response = chatbot.get_response(test_question)
        print(f"✅ Response generated ({len(response)} chars)")
        print(f"Preview: {response[:150]}...")
        
        print("🎉 Deployment test passed!")
        return {"status": "success", "message": "All tests passed"}
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    with app.run():
        # Test the deployment
        result = test_deployment.remote()
        print(f"Test result: {result}")
        import sys
        import os
        print('sys.path:', sys.path)
        print('Current working directory:', os.getcwd())
        print('Files in current directory:', os.listdir(os.getcwd()))
        print('Files in script directory:', os.listdir(os.path.dirname(__file__)))

# Database migration functions for production deployment
@app.function(
    secrets=[
        modal.Secret.from_name("database-config")
    ],
    timeout=300,
)
def run_migrations():
    """Run Alembic database migrations on deployment"""
    import sys
    sys.path.insert(0, "/project")
    
    try:
        import subprocess
        import os
        
        # Change to project directory
        os.chdir("/project")
        
        # Run migrations
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            check=True
        )
        
        print("✅ Database migrations completed successfully")
        print(f"Output: {result.stdout}")
        return {"status": "success", "output": result.stdout}
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Migration failed: {e}")
        print(f"Error output: {e.stderr}")
        return {"status": "error", "message": str(e), "stderr": e.stderr}
    except Exception as e:
        print(f"❌ Migration error: {e}")
        return {"status": "error", "message": str(e)}

@app.function(
    secrets=[
        modal.Secret.from_name("database-config")
    ],
    timeout=300,
)
def create_migration(message: str = "Auto-generated migration"):
    """Create a new Alembic migration"""
    import sys
    sys.path.insert(0, "/project")
    
    try:
        import subprocess
        import os
        
        # Change to project directory
        os.chdir("/project")
        
        # Create migration
        result = subprocess.run(
            ["alembic", "revision", "--autogenerate", "-m", message],
            capture_output=True,
            text=True,
            check=True
        )
        
        print(f"✅ Migration created successfully: {message}")
        print(f"Output: {result.stdout}")
        return {"status": "success", "output": result.stdout}
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Migration creation failed: {e}")
        print(f"Error output: {e.stderr}")
        return {"status": "error", "message": str(e), "stderr": e.stderr}
    except Exception as e:
        print(f"❌ Migration creation error: {e}")
        return {"status": "error", "message": str(e)}
