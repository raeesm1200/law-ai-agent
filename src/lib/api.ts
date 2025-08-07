import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
