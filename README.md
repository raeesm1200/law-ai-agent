# Italian Legal AI Agent 🇮🇹⚖️

A sophisticated legal assistance chatbot built with React frontend and FastAPI backend, providing intelligent legal consultations using Retrieval-Augmented Generation (RAG) with 49,000+ Italian legal documents.

## 🚀 Features

- **Modern React UI**: Beautiful, responsive chat interface with gradient themes
- **FastAPI Backend**: High-performance Python API serving the legal RAG system
- **Italian Legal RAG**: 49,059 Italian legal documents in Qdrant vector database
- **Groq LLM Integration**: Uses llama-3.3-70b-versatile for intelligent legal responses
- **Semantic Search**: Multilingual embeddings with sentence-transformers
- **Real-time Chat**: Seamless conversation experience with loading states
- **Production Ready**: Complete deployment configuration for Render.com
- **Mobile Responsive**: Professional UI that works on all devices

## 🏗️ Architecture

```mermaid
Frontend (React + TypeScript + Tailwind CSS)
    ↓ HTTP API calls
Backend (FastAPI + Python)
    ↓ RAG Pipeline
Legal Document Database (Qdrant Vector Store - 49K+ docs)
    ↓ LLM Processing
Groq (llama-3.3-70b-versatile Model)
```

## 📋 Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.11+ (recommended for NumPy 2.0 compatibility)
- **Qdrant Cloud** account or local instance
- **Groq API Key** for LLM access

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/raeesm1200/law-ai-agent.git
cd law-ai-agent

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies  
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with your API keys:

```env
# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here

# Qdrant Vector Database Configuration
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=law_chunks

# Optional: Local development settings
PORT=8000
ENVIRONMENT=development
```

### 3. Database Setup

The application uses Qdrant Cloud with 49,059 pre-loaded Italian legal documents. Ensure your Qdrant instance is accessible with the correct collection name (`law_chunks`).

### 4. Start the Applications

#### Development Mode (Recommended)

```bash
# Terminal 1: Start FastAPI backend
python api_server.py

# Terminal 2: Start React frontend  
npm run dev
```

### 5. Access the Application

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8000>
- **API Documentation**: <http://localhost:8000/docs>

## � Production Deployment

This project is configured for easy deployment on Render.com:

### Deploy to Render.com

1. Fork this repository
2. Connect your GitHub account to Render.com
3. Create a new Web Service from your repository
4. Render will automatically detect the `render.yaml` configuration
5. Add your environment variables in the Render dashboard
6. Deploy!

The `render.yaml` file includes configuration for both backend and frontend deployment.

## �🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check endpoint |
| `/api/chat` | POST | Send message to legal assistant |
| `/api/system-info` | GET | Get system information |
| `/docs` | GET | Interactive API documentation |

## 💻 Usage

1. **Start Conversation**: Click "New Legal Consultation" in the sidebar
2. **Ask Questions**: Type legal questions about Italian law in natural language
3. **Get AI Responses**: The system searches through 49K+ legal documents and provides intelligent answers
4. **View Citations**: Legal responses include relevant document references
5. **Chat History**: Previous conversations are maintained in the sidebar

## 🎨 Technology Stack

### Frontend

- **React 18** with TypeScript
- **Tailwind CSS** for styling with custom gradient themes
- **Vite** for fast development and building
- **Radix UI** components for accessibility
- **Lucide React** for icons

### Backend

- **FastAPI** for high-performance API
- **Python 3.11+** with modern async/await
- **sentence-transformers** for semantic embeddings
- **LangChain** for RAG pipeline
- **Qdrant** vector database integration
- **Groq** for LLM inference

## 🔒 Security & Privacy

- All conversations are processed securely
- No personal data is stored permanently
- API keys are managed through environment variables
- CORS configured for production domains

## ⚖️ Legal Disclaimer

This application provides general legal information for educational purposes only. It does not constitute legal advice. Always consult with qualified legal professionals for specific legal matters.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for legal professionals and AI enthusiasts
