import { useState } from "react";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatArea } from "./components/ChatArea";
import { apiClient } from "./lib/api";

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

function App() {
  // Use URL param for initial language
  const [selectedLanguage] = useState(getLanguageFromUrl());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("italy");

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const clearBackendHistory = async () => {
    try {
      const res = await fetch("/api/clear-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: activeConversationId }),
      });
      const data = await res.json();
      if (data.conversation_id) {
        setActiveConversationId(data.conversation_id);
      }
    } catch (e) {
      console.warn("Failed to clear backend chat history:", e);
    }
  };

  const handleSendMessage = async (message: string) => {
    let currentConversationId = activeConversationId;

    // If no active conversation, create a new one and use its ID
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

    // Update conversation with user message
    setConversations(prev => {
      // If conversation doesn't exist yet (first message), add it
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
      // Otherwise, update existing
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
        currentConversationId // Pass conversation_id
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
    } catch (error) {
      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        content: `I apologize, but I'm having trouble connecting to the legal database. Please ensure the backend server is running on http://localhost:8000. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev =>
        prev.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, errorMessage] }
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

      // Clear backend chat history
      await clearBackendHistory();
    }

    // Update the URL with the new language and reload
    const params = new URLSearchParams(window.location.search);
    params.set("lang", newLanguage);
    window.location.search = params.toString();
  };

  const handleNewConversation = async () => {
    // 1. Create a temporary frontend ID
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

    // 2. Clear backend chat history and get the backend-generated ID
    try {
      const res = await fetch("/api/clear-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: tempId }),
      });
      const data = await res.json();
      if (data.conversation_id) {
        // 3. Update the conversation in state to use the backend ID
        setConversations(prev =>
          prev.map(conv =>
            conv.id === tempId ? { ...conv, id: data.conversation_id } : conv
          )
        );
        setActiveConversationId(data.conversation_id);
      }
    } catch (e) {
      console.warn("Failed to clear backend chat history:", e);
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    
    // If the deleted conversation was active, clear the active conversation
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 mobile-header p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-accent rounded-xl transition-colors mobile-button"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="/onir-logo.png" alt="ONIR Logo" className="h-8 w-8 object-contain" />
          <h1 className="text-lg font-semibold text-white">LAW AGENT AI</h1>
          {/* Show selected language */}
          <span className="ml-2 px-2 py-1 rounded bg-primary/80 text-white text-xs">
            {selectedLanguage === "italian" ? "🇮🇹 Italian" : "🇺🇸 English"}
          </span>
        </div>
        <button 
          onClick={handleNewConversation}
          className="p-2 mobile-button text-white rounded-xl hover:bg-primary/90 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
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
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col pt-16 lg:pt-0">
        <ChatArea
          messages={activeConversation?.messages || []}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          selectedLanguage={selectedLanguage}
        />
      </div>
    </div>
  );
}

export default App;
