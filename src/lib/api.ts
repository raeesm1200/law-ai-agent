  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await this.client.post('/api/auth/reset-password', {
        token,
        new_password: newPassword
      });
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error.message || 'Failed to reset password';
      throw new Error(msg);
    }
  }
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
  language?: string;
}

export interface ChatResponse {
  response: string;
  conversation_id?: string;
}

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  questions_used?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
}

export interface SubscriptionPlansResponse {
  plans: SubscriptionPlan[];
}

export interface CreateCheckoutSessionRequest {
  plan_type: string;
}

export interface CreateCheckoutSessionResponse {
  session_id: string;
  session_url: string;
}

export interface SubscriptionStatus {
  has_subscription: boolean;
  plan_type: string | null;
  status: string;
  start_date?: string;
  end_date?: string;
}

// Add interface for feature flags
export interface FeatureFlags {
  subscription_disabled: boolean;
}


class ApiClient {
  private client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.status, error.response?.data);
        
        if (error.response?.status === 401) {
          console.log('🔑 401 Unauthorized - clearing token and redirecting to login');
          localStorage.removeItem('token');
          
          // Only redirect if we're not already on the login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await this.client.post('/api/auth/reset-password', {
        token,
        new_password: newPassword
      });
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error.message || 'Failed to reset password';
      throw new Error(msg);
    }
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.client.post('/api/auth/login', { email, password });
      return response.data;
    } catch (error) {
      console.error('Login Error:', error);
      throw new Error('Invalid email or password');
    }
  }

  async register(email: string, password: string): Promise<User> {
    try {
      const response = await this.client.post('/api/auth/register', { email, password });
      return response.data;
    } catch (error: any) {
      console.error('Registration Error:', error);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to create account');
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.client.get('/api/auth/me');
      return response.data;
    } catch (error) {
      console.error('Get User Error:', error);
      throw new Error('Failed to get user information');
    }
  }

  // Subscription endpoints
  async getSubscriptionPlans(): Promise<SubscriptionPlansResponse> {
    try {
      const response = await this.client.get('/api/subscription/plans');
      return response.data;
    } catch (error) {
      console.error('Get Plans Error:', error);
      throw new Error('Failed to get subscription plans');
    }
  }

  async createCheckoutSession(planType: string): Promise<CreateCheckoutSessionResponse> {
    try {
      const response = await this.client.post('/api/subscription/create-checkout-session', {
        plan_type: planType
      });
      return response.data;
    } catch (error: any) {
      console.error('Checkout Session Error:', error);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to create checkout session');
    }
  }

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const response = await this.client.get('/api/subscription/status');
      return response.data;
    } catch (error) {
      console.error('Subscription Status Error:', error);
      throw new Error('Failed to get subscription status');
    }
  }

  async createBillingPortalSession(): Promise<{ portal_url: string }> {
    try {
      const response = await this.client.get('/api/subscription/billing-portal');
      return response.data;
    } catch (error) {
      console.error('Billing Portal Error:', error);
      throw new Error('Failed to create billing portal session');
    }
  }

  // Chat endpoints
  async sendMessage(
    message: string,
    country: string = "italy",
    language: string = "english",
    conversation_id?: string
  ): Promise<ChatResponse> {
    try {
      const response = await this.client.post('/api/chat', { 
        message, 
        country, 
        language, 
        conversation_id 
      });
      return response.data;
    } catch (error: any) {
      console.error('API Error:', error);
      // Bubble up meaningful error messages from backend
      const backendMsg = error.response?.data?.detail || error.response?.data?.error;
      if (backendMsg) {
        throw new Error(backendMsg);
      }

      if (error.response?.status === 403) {
        throw new Error('Active subscription required to use the chatbot');
      }
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

  // Google SSO
  async googleLogin(idToken: string): Promise<LoginResponse> {
    try {
      const response = await this.client.post('/api/auth/google', { id_token: idToken });
      return response.data;
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  async clearHistory(conversationId?: string): Promise<{ status: string; conversation_id: string }> {
    try {
      const response = await this.client.post('/api/clear-history', { 
        conversation_id: conversationId 
      });
      return response.data;
    } catch (error) {
      console.error('Clear History Error:', error);
      throw new Error('Failed to clear chat history');
    }
  }

  // Chat history endpoints
  async getChatHistory(language?: string): Promise<any[]> {
    try {
      const params: any = {};
      if (language) params.language = language;
      const response = await this.client.get('/api/chat/history', { params });
      return response.data;
    } catch (error) {
      console.error('Get Chat History Error:', error);
      throw new Error('Failed to get chat history');
    }
  }

  async saveChatHistory(conversations: any[]): Promise<{ status: string }> {
    try {
      const response = await this.client.post('/api/chat/save-history', { 
        conversations 
      });
      return response.data;
    } catch (error) {
      console.error('Save Chat History Error:', error);
      throw new Error('Failed to save chat history');
    }
  }

  async getFeatureFlags(): Promise<FeatureFlags> {
    try {
      const response = await this.client.get('/api/feature-flags');
      return response.data;
    } catch (error) {
      console.error('Feature Flags Error:', error);
      // Default to subscription enabled if API fails
      return { subscription_disabled: false };
    }
  }
}

export const apiClient = new ApiClient();
