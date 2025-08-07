# Legal RAG Chatbot - React & FastAPI

A modern legal assistance chatbot built with React frontend and FastAPI backend, providing intelligent legal consultations using Retrieval-Augmented Generation (RAG) with Italian legal documents.

## 🚀 Features

- **Modern React UI**: Beautiful, responsive chat interface based on Figma design
- **FastAPI Backend**: High-performance Python API serving the legal RAG system
- **Legal RAG System**: Retrieves relevant legal documents from Qdrant vector store
- **Groq LLM Integration**: Uses Llama 3.1 for intelligent legal responses
- **Real-time Chat**: Seamless conversation experience with loading states
- **Document Search**: Direct search functionality for legal documents
- **Conversation History**: Maintains chat history within sessions

## 🏗️ Architecture

```
Frontend (React + TypeScript + Tailwind CSS)
    ↓ HTTP API calls
Backend (FastAPI + Python)
    ↓ RAG Pipeline
Legal Document Database (Qdrant Vector Store)
    ↓ LLM Processing
Groq (Llama 3.1 Model)
```

## 📋 Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.8+
- **Qdrant** vector database (running locally or cloud)
- **Groq API Key** for LLM access

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies  
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your actual values:
# - GROQ_API_KEY: Your Groq API key
# - QDRANT_URL: Your Qdrant instance URL
# - QDRANT_API_KEY: Your Qdrant API key (if needed)
# - QDRANT_COLLECTION: Collection name (default: law_chunks)
```

### 3. Database Setup

Ensure your Qdrant vector database is running and contains legal document embeddings in the specified collection.

### 4. Start the Applications

#### Option A: Development Mode (Recommended)

```bash
# Terminal 1: Start FastAPI backend
python api_server.py

# Terminal 2: Start React frontend  
npm run dev
```

#### Option B: Using Scripts

```bash
# Start backend (Windows)
.\start-backend.bat

# Start frontend (Windows)
.\start-frontend.bat
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/chat` | POST | Send message to legal assistant |
| `/api/search` | GET | Search legal documents |
| `/docs` | GET | Interactive API documentation |

## 💻 Usage

1. **Start Conversation**: Click "New Legal Consultation" in the sidebar
2. **Ask Questions**: Type legal questions in natural language
3. **View Sources**: Legal responses include citations and source links
4. **Chat History**: Previous conversations are saved in the sidebar

## 🎨 UI Components

Built with modern design principles:

- **Chat Interface**: Clean, professional legal consultation UI
- **Message Bubbles**: User and assistant messages with timestamps
- **Sidebar**: Conversation history and new chat functionality
- **Loading States**: Smooth loading animations during processing
- **Responsive Design**: Works on desktop and mobile devices

## ⚖️ Legal Disclaimer

This application provides general legal information for educational purposes only. It does not constitute legal advice. Always consult with qualified legal professionals for specific legal matters.



**Built with ❤️ for legal professionals**
