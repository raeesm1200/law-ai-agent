import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../lib/api';

interface User {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  questions_used?: number;
}

interface Subscription {
  has_subscription: boolean;
  plan_type: string | null;
  status: string;
  start_date?: string;
  end_date?: string;
}

interface FeatureFlags {
  subscription_disabled: boolean;
}

interface AuthContextType {
  user: User | null;
  subscription: Subscription | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSubscription: () => Promise<void>;
  refreshUser: () => Promise<void>;
  featureFlags: FeatureFlags | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const loadFeatureFlags = async () => {
      try {
        const flags = await apiClient.getFeatureFlags();
        setFeatureFlags(flags);
      } catch (error) {
        console.error('Failed to load feature flags:', error);
        setFeatureFlags({ subscription_disabled: false });
      }
    };
    loadFeatureFlags();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      // First verify the token is still valid by calling /api/auth/me
  const userData = await apiClient.getCurrentUser();
  setUser(userData);
      console.log('✅ User authenticated:', userData.email);
      
      // Then get subscription status
      await fetchSubscriptionStatus();
    } catch (error: any) {
      console.error('Auth check failed:', error);
      
      // If we get a 401, the token is invalid/expired
      if (error.response?.status === 401 || error.message?.includes('401')) {
        console.log('🔑 Token expired or invalid, clearing auth state');
        localStorage.removeItem('token');
        setUser(null);
        setSubscription(null);
      } else {
        console.error('Other auth error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      console.log('🔍 Fetching subscription status...');
      const subscriptionData = await apiClient.getSubscriptionStatus();
      console.log('📊 Subscription data received:', subscriptionData);
      setSubscription(subscriptionData);
      
      if (subscriptionData.has_subscription) {
        console.log('✅ Active subscription found:', subscriptionData.plan_type);
      } else {
        console.log('❌ No active subscription found');
      }
    } catch (error: any) {
      console.error('Failed to fetch subscription status:', error);
      
      // If auth failed, clear the subscription state
      if (error.response?.status === 401) {
        console.log('🔑 Auth failed for subscription check, clearing state');
        setSubscription(null);
        setUser(null);
        localStorage.removeItem('token');
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      localStorage.setItem('token', response.access_token);
      // Redirect immediately so the app navigates even if background fetch fails
      window.location.href = '/';

      // Fetch user and subscription in background (non-blocking)
      (async () => {
        try {
          const userData = await apiClient.getCurrentUser();
          setUser(userData);
          await fetchSubscriptionStatus();
        } catch (bgErr) {
          console.warn('Background user/subscription fetch failed:', bgErr);
        }
      })();
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      await apiClient.register(email, password);
      // After registration, automatically log in
  await login(email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setSubscription(null);
  };

  const refreshSubscription = async () => {
    await fetchSubscriptionStatus();
  };

  const refreshUser = async () => {
    try {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    subscription,
    isLoading,
    login,
    register,
    logout,
    refreshSubscription,
  refreshUser,
  featureFlags,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
