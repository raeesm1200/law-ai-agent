import axios from 'axios';

// Smart API URL detection for Render deployment
const getAPIBaseURL = () => {
  // If environment variable is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // If we're on Render (onrender.com domain), try to detect backend URL
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    const hostname = window.location.hostname;
    // Try common Render naming patterns
    const possibleBackendHosts = [
      hostname.replace('-1', ''), // law-ai-agent.onrender.com
      hostname.replace('frontend', 'api'), // if it contains 'frontend'
      'law-ai-agent.onrender.com', // fallback
      'legal-rag-chatbot-api.onrender.com' // original planned name
    ];
    
    // Return the first possible host (we'll handle connection errors in the client)
    return `https://${possibleBackendHosts[0]}`;
  }
  
  // Development fallback
  return 'http://localhost:8000';
};

const API_BASE_URL = getAPIBaseURL();

export interface ChatMessage {
  message: string;
  country?: string;
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

  async sendMessage(message: string, country: string = "italy"): Promise<ChatResponse> {
    try {
      const response = await this.client.post('/api/chat', { message, country });
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
