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

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("italy");

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleSendMessage = async (message: string) => {
    let currentConversationId = activeConversationId;
    
    // If no active conversation, create a new one
    if (!currentConversationId) {
      const newConversation: Conversation = {
        id: `${Date.now()}`,
        title: message.length > 50 ? message.substring(0, 50) + "..." : message,
        lastMessage: "",
        timestamp: "now",
        messages: []
      };
      
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
      currentConversationId = newConversation.id;
    }

    const newUserMessage: Message = {
      id: `${Date.now()}-user`,
      content: message,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update conversation with user message
    setConversations(prev => prev.map(conv => 
      conv.id === currentConversationId 
        ? { ...conv, messages: [...conv.messages, newUserMessage] }
        : conv
    ));

    setIsLoading(true);

    try {
      // Call FastAPI backend
      console.log('Sending message to backend:', message, 'Country:', selectedCountry);
      const response = await apiClient.sendMessage(message, selectedCountry);
      console.log('Received response from backend:', response);
      
      const botMessage: Message = {
        id: `${Date.now()}-bot`,
        content: response.response,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev => prev.map(conv => 
        conv.id === currentConversationId 
          ? { ...conv, messages: [...conv.messages, botMessage], lastMessage: response.response.substring(0, 50) + "..." }
          : conv
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        content: `I apologize, but I'm having trouble connecting to the legal database. Please ensure the backend server is running on http://localhost:8000. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev => prev.map(conv => 
        conv.id === currentConversationId 
          ? { ...conv, messages: [...conv.messages, errorMessage] }
          : conv
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: `${Date.now()}`,
      title: "New Legal Consultation",
      lastMessage: "",
      timestamp: "now",
      messages: []
    };

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
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
          <h1 className="text-lg font-semibold text-white">Legal AI Assistant</h1>
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
        />
      </div>
    </div>
  );
}

export default App;
