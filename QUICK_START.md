# Legal RAG Chatbot - Quick Start Guide

## Installation Commands

### Option 1: Automated Setup (Recommended)
```bash
setup-dev.bat
```

### Option 2: Manual Installation
```bash
# Navigate to the MAIN directory
cd "C:\Users\Fakhi\Desktop\Law\MAIN"

# Activate your virtual environment (if using one)
# From C:\Users\Fakhi\Desktop\Law: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies  
npm install

# Create environment file
copy .env.example .env
```

## Environment Configuration

Edit `.env` file with your credentials:
```bash
GROQ_API_KEY=your_groq_api_key_here
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key_here
QDRANT_COLLECTION=law_chunks
```

## Starting the Application

### Terminal 1: Start Backend (Real Legal RAG System)
```bash
python api_server.py
```
*Backend will run on: http://localhost:8000*
*This connects to your real legal_rag_chatbot.py system with Qdrant database*

### Terminal 2: Start Frontend  
```bash
npm run dev
```
*Frontend will run on: http://localhost:3000*

**Important**: Make sure your backend shows:
- ✅ Chatbot initialized successfully!
- ✅ Qdrant vector store connected
- ✅ Groq LLM initialized

## Dark Theme Applied
The interface now uses a professional dark theme matching your design:
- Dark blue sidebar (matching legal professional aesthetic)
- Blue accent colors for primary actions
- Proper contrast for readability

## Alternative: Use Batch Files
```bash
# Terminal 1
start-backend.bat

# Terminal 2  
start-frontend.bat
```

## Verification

1. Backend API: http://localhost:8000/docs
2. Frontend App: http://localhost:3000
3. Health Check: http://localhost:8000/api/health

## Troubleshooting

- **Python errors**: Ensure Python 3.8+ and pip are installed
- **Node errors**: Ensure Node.js 18+ and npm are installed  
- **API errors**: Check .env file configuration
- **Qdrant errors**: Ensure Qdrant database is running and accessible
- **Import errors**: Run `python fix_imports.py` to fix UI component imports
- **Empty chat**: The app now starts with empty chat - click "New Legal Consultation" to begin

## Recent Updates

✅ **Real Legal RAG System Connected**:
- Backend now uses your actual legal_rag_chatbot.py with Qdrant database
- **Model**: Llama 3.1 8B Instant (via Groq)
- **Embeddings**: intfloat/multilingual-e5-base
- **Knowledge Base**: Italian Legal Documents (your Qdrant collection)
- **Status**: Dynamically fetched from backend
- Removed all mock conversations - starts completely empty
- Added proper error handling with backend connection status
- Console logging for debugging API calls

✅ **Professional Dark Theme**:
- Applied dark blue theme matching your design screenshot
- Blue accent colors for legal professional look
- Proper contrast and readability
- Responsive message width with proper text wrapping

✅ **System Requirements**:
- Backend must be running with legal RAG system initialized
- Qdrant database must be connected and populated with Italian legal documents
- Groq LLM must be configured with valid API key
- System info now shows authentic model details (Llama 3.1 8B, multilingual embeddings)
- Removed fake specialties - shows real knowledge base information
