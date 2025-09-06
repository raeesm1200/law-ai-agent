import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatArea } from "./components/ChatArea";
import { AuthForm } from "./components/AuthForm";
import { SubscriptionPlans } from "./components/SubscriptionPlans";
import { SubscriptionSuccess, SubscriptionCancel } from "./components/SubscriptionStatus";
import { TestSuccess } from "./components/TestSuccess";
import { Router } from "./components/Router";
import { apiClient } from "./lib/api";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { Crown, LogOut } from "lucide-react";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
}

function getLanguageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("lang") === "italian" ? "italian" : "english";
}

// Main Chat Component (Protected)
const ChatApp: React.FC = () => {
  const { user, subscription, logout, refreshUser } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState(getLanguageFromUrl());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("italy");
  const [subscriptionError, setSubscriptionError] = useState("");

  // Load user's chat history (filtered by language)
  async function loadChatHistory(language?: string) {
    try {
      const backendHistory = await apiClient.getChatHistory(language || selectedLanguage);
      if (backendHistory && backendHistory.length > 0) {
        setConversations(backendHistory);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setConversations([]);
    }
  }

  React.useEffect(() => {
    if (user) {
      loadChatHistory(selectedLanguage);
    }
  }, [user, selectedLanguage]);


  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const clearBackendHistory = async () => {
    try {
      const res = await apiClient.clearHistory(activeConversationId || undefined);
      if (res.conversation_id) {
        setActiveConversationId(res.conversation_id);
      }
    } catch (e) {
      console.warn("Failed to clear backend chat history:", e);
    }
  };

  const handleSendMessage = async (message: string) => {
    // Client-side trial enforcement: allow up to 20 free messages if user has no active subscription access
    const questionsUsed = user?.questions_used || 0;
    
    // Check if user has subscription access (active subscription or canceled but still valid)
    const hasSubscriptionAccess = subscription?.has_subscription || 
                                 (subscription?.status === 'canceled' && 
                                  subscription?.end_date && 
                                  new Date(subscription.end_date) > new Date());

    if (!hasSubscriptionAccess && questionsUsed >= 20) {
      // Redirect to subscription page
      window.location.href = '/subscription';
      return;
    }

    setSubscriptionError("");
    let currentConversationId = activeConversationId;

    if (!currentConversationId) {
      currentConversationId = `${Date.now()}`;
      const newConversation: Conversation = {
        id: currentConversationId,
        title: message.length > 50 ? message.substring(0, 50) + "..." : message,
        lastMessage: "",
        timestamp: "now",
        messages: []
      };
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(currentConversationId);
    }

    const newUserMessage: Message = {
      id: `${Date.now()}-user`,
      content: message,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations(prev => {
      const exists = prev.some(conv => conv.id === currentConversationId);
      if (!exists) {
        return [
          {
            id: currentConversationId!,
            title: message.length > 50 ? message.substring(0, 50) + "..." : message,
            lastMessage: "",
            timestamp: "now",
            messages: [newUserMessage]
          },
          ...prev
        ];
      }
      return prev.map(conv =>
        conv.id === currentConversationId
          ? { ...conv, messages: [...conv.messages, newUserMessage] }
          : conv
      );
    });

    setIsLoading(true);

    try {
      const response = await apiClient.sendMessage(
        message,
        selectedCountry,
        selectedLanguage,
        currentConversationId
      );

  const botMessage: Message = {
        id: `${Date.now()}-bot`,
        content: response.response,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev =>
        prev.map(conv =>
          conv.id === currentConversationId
            ? {
                ...conv,
                messages: [...conv.messages, botMessage],
                lastMessage: response.response.substring(0, 50) + "..."
              }
            : conv
        )
      );
      // After successful message, refresh user from backend to get updated questions_used
      try {
        await refreshUser();
      } catch (e) {
        console.warn('Failed to refresh user after message:', e);
      }
    } catch (error: any) {
      let errorMessage = "I apologize, but I'm having trouble connecting to the legal database.";
      
      if (error.message.includes("subscription") || error.message.includes('Trial limit reached')) {
        errorMessage = "Your subscription has expired or is inactive. Please renew your subscription to continue using the chatbot.";
        setSubscriptionError(error.message);
        // If trial limit reached, redirect to subscription page
        if (error.message.includes('Trial limit reached')) {
          window.location.href = '/subscription';
          return;
        }
      }

      const errorMsg: Message = {
        id: `${Date.now()}-error`,
        content: errorMessage,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev =>
        prev.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, errorMsg] }
            : conv
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === selectedLanguage) return;

    const activeConv = conversations.find(c => c.id === activeConversationId);

    if (activeConv && activeConv.messages && activeConv.messages.length > 0) {
      const newConversation: Conversation = {
        id: `${Date.now()}`,
        title: "New Legal Consultation",
        lastMessage: "",
        timestamp: "now",
        messages: []
      };
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
      try {
        await clearBackendHistory();
      } catch (e) {
        console.warn('Failed to clear backend history on language switch:', e);
      }
    }

    // Update selected language without full page reload and load the language-specific history
    setSelectedLanguage(newLanguage);
  };

  const handleNewConversation = async () => {
    const tempId = `${Date.now()}`;
    const newConversation: Conversation = {
      id: tempId,
      title: "New Legal Consultation",
      lastMessage: "",
      timestamp: "now",
      messages: []
    };

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(tempId);

    try {
      const res = await apiClient.clearHistory(tempId);
      if (res.conversation_id) {
        setConversations(prev =>
          prev.map(conv =>
            conv.id === tempId ? { ...conv, id: res.conversation_id } : conv
          )
        );
        setActiveConversationId(res.conversation_id);
      }
    } catch (e) {
      console.warn("Failed to clear backend chat history:", e);
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Header */}
  <div className="lg:hidden fixed top-0 left-0 right-0 z-50 mobile-header p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-accent rounded-xl transition-colors mobile-button flex-shrink-0"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="./onir-logo.png" alt="ONIR Logo" className="h-8 w-8 object-contain" />
          <h1 className="text-lg font-semibold text-white truncate">LAW AGENT AI</h1>
          <span className="ml-2 px-2 py-1 rounded bg-primary/80 text-white text-xs whitespace-nowrap">
            {selectedLanguage === "italian" ? "🇮🇹 Italian" : "🇺🇸 English"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {!subscription?.has_subscription && (
              <Button 
                size="sm"
                onClick={() => window.location.href = '/subscription'}
                className="bg-yellow-600 hover:bg-yellow-700 min-w-0"
              >
                <Crown className="w-4 h-4 mr-1" />
                <span className="truncate">Upgrade</span>
              </Button>
            )}
            <Button 
              size="sm"
              variant="outline"
              onClick={logout}
              className="text-white border-white/20 hover:bg-white/10 min-w-0"
            >
              <LogOut className="w-4 h-4 mr-1" />
              <span className="truncate">Logout</span>
            </Button>
            <button 
              onClick={handleNewConversation}
              className="p-2 mobile-button text-white rounded-xl hover:bg-primary/90 transition-all flex-shrink-0"
              aria-label="New conversation"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <ChatSidebar 
          conversations={conversations}
          activeConversationId={activeConversationId || undefined}
          onSelectConversation={setActiveConversationId}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          isMobile={false}
          onClose={() => {}}
          onCountryChange={setSelectedCountry}
          selectedCountry={selectedCountry}
          onLanguageChange={handleLanguageChange}
          selectedLanguage={selectedLanguage}
          onLogout={logout}
          questionsUsed={user?.questions_used || 0}
          maxTrial={20}
          hasSubscription={!!subscription?.has_subscription || !!(subscription?.status === 'canceled' && subscription?.end_date && new Date(subscription.end_date) > new Date())}
          subscription={subscription ?? undefined}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 mobile-overlay" 
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative">
            <ChatSidebar 
              conversations={conversations}
              activeConversationId={activeConversationId || undefined}
              onSelectConversation={(id) => {
                setActiveConversationId(id);
                setIsSidebarOpen(false);
              }}
              onNewConversation={() => {
                handleNewConversation();
                setIsSidebarOpen(false);
              }}
              onDeleteConversation={handleDeleteConversation}
              isMobile={true}
              onClose={() => setIsSidebarOpen(false)}
              onCountryChange={setSelectedCountry}
              selectedCountry={selectedCountry}
              onLanguageChange={handleLanguageChange}
              selectedLanguage={selectedLanguage}
              onLogout={logout}
              questionsUsed={user?.questions_used || 0}
              maxTrial={20}
              hasSubscription={!!subscription?.has_subscription || !!(subscription?.status === 'canceled' && subscription?.end_date && new Date(subscription.end_date) > new Date())}
              subscription={subscription ?? undefined}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col pt-16 lg:pt-0">
        {subscriptionError && (
          <Alert variant="destructive" className="m-4">
            <AlertDescription className="flex items-center justify-between">
              {subscriptionError}
              <Button 
                size="sm" 
                onClick={() => window.location.href = '/subscription'}
                className="ml-4"
              >
                Subscribe Now
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <ChatArea
          messages={activeConversation?.messages || []}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          selectedLanguage={selectedLanguage}
        />
      </div>
    </div>
  );
};

// Public Login Page
const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <AuthForm onSuccess={() => window.location.href = '/'} />
    </div>
  );
};

// Protected Route Component that checks subscription
const ProtectedRoute: React.FC<{ children: React.ReactNode; requireSubscription?: boolean }> = ({ children, requireSubscription = false }) => {
  const { user, subscription, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  // Check if user just came from payment verification
  const urlParams = new URLSearchParams(window.location.search);
  const isVerified = urlParams.get('verified') === 'true';

  // If subscription is required and user doesn't have one, redirect to subscription page
  // BUT don't redirect if they just came from payment verification (give them a moment)
  if (requireSubscription && !subscription?.has_subscription && !isVerified) {
    window.location.href = '/subscription';
    return null;
  }

  return <>{children}</>;
};

// Main App Component with Routing
function App() {
  const routes = [
    { path: '/', component: () => <ProtectedRoute requireSubscription={false}><ChatApp /></ProtectedRoute> },
    { path: '/login', component: LoginPage },
    { path: '/subscription', component: () => <ProtectedRoute><SubscriptionPlans /></ProtectedRoute> },
    { path: '/subscription/success', component: () => <ProtectedRoute><SubscriptionSuccess /></ProtectedRoute> },
    { path: '/subscription/cancel', component: () => <ProtectedRoute><SubscriptionCancel /></ProtectedRoute> },
  ];

  return (
    <AuthProvider>
      <Router routes={routes} />
    </AuthProvider>
  );
}

export default App;
