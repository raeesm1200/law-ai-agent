#!/usr/bin/env python3
"""
FastAPI backend for Legal RAG Chatbot
Serves the existing legal_rag_chatbot.py functionality via REST API
"""

import os
import sys
import asyncio
from typing import Optional, Dict
from contextlib import asynccontextmanager
import uuid

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import the existing chatbot
from legal_rag_chatbot import LegalRAGChatbot

# Global chatbot instance
chatbot: Optional[LegalRAGChatbot] = None
chat_histories: Dict[str, list] = {}  # conversation_id -> chat history

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup the chatbot"""
    global chatbot
    try:
        print("🚀 Initializing Legal RAG Chatbot...")
        chatbot = LegalRAGChatbot()
        print("✅ Chatbot initialized successfully!")
        yield
    except Exception as e:
        print(f"❌ Failed to initialize chatbot: {e}")
        sys.exit(1)
    finally:
        print("🔄 Shutting down chatbot...")

# FastAPI app with lifespan management
app = FastAPI(
    title="Legal RAG Chatbot API",
    description="REST API for Italian Legal Assistant using RAG",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "https://law-ai-agent-1.onrender.com",  # Your frontend URL
        "https://*.render.com",
        "https://*.modal.run",  # Allow Modal domains
        "https://*.vercel.app",
        "https://*.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    country: Optional[str] = "italy"
    language: Optional[str] = "english"
    conversation_id: Optional[str] = None  # NEW

class ChatResponse(BaseModel):
    response: str
    conversation_id: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    message: str

class ClearHistoryRequest(BaseModel):
    conversation_id: Optional[str] = None

# API Routes
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if chatbot is not None else "unhealthy",
        message="Legal RAG Chatbot API is running" if chatbot is not None else "Chatbot not initialized"
    )

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        language = (request.language or "english").lower()
        if language == "italian":
            collection = "law_chunks_italian_language"
        else:
            collection = "law_chunks"

        # Use conversation_id to manage chat history
        conversation_id = request.conversation_id or "default"
        if conversation_id not in chat_histories:
            chat_histories[conversation_id] = []

        # Set chatbot's chat history for this conversation
        chatbot.chat_history = chat_histories[conversation_id]

        # Get response
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            chatbot.get_response,
            request.message,
            collection,
            language
        )

        # Save updated history back to the dict
        chat_histories[conversation_id] = chatbot.chat_history

        return ChatResponse(
            response=response,
            conversation_id=conversation_id
        )
    except Exception as e:
        print(f"❌ Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/system-info")
async def get_system_info():
    """Get system information endpoint"""
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")
    
    try:
        # Get collection info from Qdrant
        collection_info = chatbot.qdrant_client.get_collection(chatbot.qdrant_collection)
        vector_count = collection_info.vectors_count if collection_info else 0
        
        return {
            "model": chatbot.llm_model_name,
            "embedding_model": chatbot.embedding_model_name,
            "knowledge_base": f"Italian Legal Documents ({vector_count:,} vectors)",
            "status": "Online",
            "qdrant_collection": chatbot.qdrant_collection,
            "qdrant_url": chatbot.qdrant_url.replace(chatbot.qdrant_api_key or "", "***") if chatbot.qdrant_api_key else chatbot.qdrant_url
        }
    except Exception as e:
        return {
            "model": "llama-3.1-8b-instant",
            "embedding_model": "intfloat/multilingual-e5-base", 
            "knowledge_base": "Italian Legal Documents",
            "status": "Online",
            "error": str(e)
        }

@app.get("/api/search")
async def search_documents_endpoint(query: str, limit: int = 5):
    """Search legal documents endpoint"""
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")
    
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        # Search documents
        loop = asyncio.get_event_loop()
        documents = await loop.run_in_executor(None, chatbot.search_documents, query, limit)
        
        # Format documents for response
        formatted_docs = []
        for i, doc in enumerate(documents):
            formatted_docs.append({
                "id": i + 1,
                "content": doc.page_content,
                "metadata": doc.metadata,
                "law_name": doc.metadata.get('law_name', 'Unknown Law'),
                "english_law_name": doc.metadata.get('english_law_name', ''),
                "article_number": doc.metadata.get('article_number', ''),
                "article_title": doc.metadata.get('article_title', ''),
                "source_url": doc.metadata.get('source_url', '')
            })
        
        return {
            "query": query,
            "documents": formatted_docs,
            "total_found": len(formatted_docs)
        }
    
    except Exception as e:
        print(f"❌ Error in search endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/clear-history")
async def clear_history_endpoint(request: ClearHistoryRequest):
    """Clear the chatbot's conversation history for a conversation_id and return a new one."""
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")
    # Generate a new conversation ID
    new_convo_id = str(uuid.uuid4())
    chat_histories[new_convo_id] = []
    chatbot.clear_history()
    return {"status": "cleared", "conversation_id": new_convo_id}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Legal RAG Chatbot API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "chat": "/api/chat",
            "search": "/api/search",
            "docs": "/docs"
        }
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "message": "Please check the API documentation at /docs"
        }
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "Something went wrong on our end"
        }
    )

if __name__ == "__main__":
    print("🚀 Starting Legal RAG Chatbot API Server...")
    # Use PORT environment variable (for Render.com) or default to 8000
    port = int(os.environ.get("PORT", 8000))
    print(f"📡 Starting server on port {port}")
    
    # Disable reload in production
    is_production = os.environ.get("ENVIRONMENT") == "production"
    
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=port,
        reload=not is_production,
        reload_dirs=["./"] if not is_production else None,
        log_level="info"
    )
