import axios from 'axios';

// Smart API URL detection for Render deployment
const getAPIBaseURL = () => {
  // If environment variable is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // If we're on Render (onrender.com domain), use the Modal backend URL
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return 'https://cybophee2001--legal-rag-chatbot-api-api-server.modal.run';
  }
  
  // Development fallback
  return 'http://localhost:8000';
};

const API_BASE_URL = getAPIBaseURL();

export interface ChatMessage {
  message: string;
  country?: string;
  language?: string; // NEW
}

export interface ChatResponse {
  response: string;
  conversation_id?: string;
}

class ApiClient {
  private client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  async sendMessage(
    message: string,
    country: string = "italy",
    language: string = "english",
    conversation_id?: string // NEW
  ): Promise<ChatResponse> {
    try {
      const response = await this.client.post('/api/chat', { message, country, language, conversation_id }); // UPDATED
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to send message to legal assistant');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async getSystemInfo(): Promise<any> {
    try {
      const response = await this.client.get('/api/system-info');
      return response.data;
    } catch (error) {
      console.error('System Info Error:', error);
      throw new Error('Failed to get system information');
    }
  }
}

export const apiClient = new ApiClient();
