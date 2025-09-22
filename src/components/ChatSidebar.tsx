import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { apiClient } from "../lib/api";
import { 
  MessageSquare, 
  Info, 
  Plus, 
  MoreHorizontal,
  Trash2,
  Globe,
  LogOut,
  Crown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useAuth } from "../contexts/AuthContext";

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isMobile: boolean;
  onClose: () => void;
  onCountryChange: (country: string) => void;
  selectedCountry: string;
  onLanguageChange: (language: string) => void;
  selectedLanguage: string;
  onLogout: () => void;
  questionsUsed: number;
  maxTrial: number;
  subscription: { has_subscription: boolean; status: string; end_date?: string } | null;
}

export function ChatSidebar({ 
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isMobile,
  onClose,
  onCountryChange,
  selectedCountry,
  onLanguageChange,
  selectedLanguage,
  onLogout,
  questionsUsed,
  maxTrial,
  subscription
}: ChatSidebarProps) {
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [selectedCountryState, setSelectedCountry] = useState(selectedCountry);
  const { featureFlags } = useAuth();

  // Update local state when prop changes
  useEffect(() => {
    setSelectedCountry(selectedCountry);
  }, [selectedCountry]);

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    onCountryChange(country);
  };

  const handleLanguageChange = (language: string) => {
    onLanguageChange(language);
  };

  const countries = [
    { value: "italy", label: "🇮🇹 Italy", flag: "" },
  ];

  const languages = [
    { value: "english", label: "English", flag: "" },
    { value: "italian", label: "Italian", flag: "" },
  ];

  useEffect(() => {
    // Fetch system info from backend using apiClient
    const fetchSystemInfo = async () => {
      try {
        const info = await apiClient.getSystemInfo();
        setSystemInfo(info);
      } catch (error) {
        console.error('Failed to fetch system info:', error);
        // Fallback system info
        setSystemInfo({
          model: "llama-3.1-8b-instant",
          embedding_model: "intfloat/multilingual-e5-base",
          knowledge_base: "Italian Legal Documents",
          status: "Online"
        });
      }
    };

    fetchSystemInfo();
  }, []);

  // Calculate subscription validity
  const subscriptionValid = !!subscription?.has_subscription || 
    !!(subscription?.status === 'canceled' && 
       subscription?.end_date && 
       new Date(subscription.end_date) > new Date());

  return (
    <div className={`${isMobile ? 'w-full max-w-xs mobile-sidebar' : 'w-80'} h-full ${isMobile ? 'backdrop-blur-md' : 'bg-sidebar'} border-r border-sidebar-border flex flex-col min-h-0 ${isMobile ? 'shadow-2xl' : ''}`}>
      {/* Mobile Close Button */}
      {isMobile && (
        <div className="p-2 border-b border-sidebar-border">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="ml-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      )}
      
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-3">
          <img src="/onir-logo.png" alt="ONIR Logo" className="h-8 w-8 object-contain" />
          <span className="text-sm text-sidebar-foreground">LAW AGENT AI</span>
        </div>
        
        {/* Trial indicator / progress bar - Hide if subscription disabled */}
        {!featureFlags?.subscription_disabled && (
          <div className="mb-3">
            {/* Show trial progress if no valid subscription OR if canceled subscription has expired */}
            {(!subscriptionValid) ? (
              <div>
                <div className="flex items-center justify-between mb-1 text-xs text-muted-foreground/80">
                  <div><strong>Trial</strong></div>
                  <div>{questionsUsed}/{maxTrial} used</div>
                </div>
                <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-amber-400"
                    style={{ width: `${Math.min(100, Math.round((questionsUsed / Math.max(1, maxTrial)) * 100))}%` }}
                  />
                </div>
              </div>
            ) : subscription?.status === 'canceled' && subscription?.end_date ? (
              // Show "Valid till {date}" for canceled subscriptions that haven't expired yet
              <div className="text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">
                <div className="font-semibold">Access until {new Date(subscription.end_date).toLocaleDateString()}</div>
                <div></div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-xs text-green-400">
                <span className="px-2 py-1 bg-green-800/20 rounded">Subscribed</span>
              </div>
            )}
          </div>
        )}
        
        {/* Country Selection */}
        <div className="mb-3">
          <Select value={selectedCountryState} onValueChange={handleCountryChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {countries.find(c => c.value === selectedCountryState)?.label || "Select Country"}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  <div className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.label.replace(/^🇼🇼 /, '')}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Language Selection - NEW */}
        <div className="mb-3">
          <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <span role="img" aria-label={languages.find(l => l.value === selectedLanguage)?.label || "Language"}>
                    {languages.find(l => l.value === selectedLanguage)?.flag}
                  </span>
                  {languages.find(l => l.value === selectedLanguage)?.label || "Select Language"}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {languages.map((language) => (
                <SelectItem key={language.value} value={language.value}>
                  <div className="flex items-center gap-2">
                    <span>{language.flag}</span>
                    <span>{language.label.replace(/^🇼🇼 /, '')}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={onNewConversation}
          className={`w-full justify-start gap-2 ${isMobile ? 'mobile-button text-white' : ''}`}
          variant="default"
        >
          <Plus className="h-4 w-4" />
          {selectedLanguage === "italian" ? "Nuova Consultazione" : "New Consultation"}
        </Button>
      </div>

      {/* Conversations */}
  <ScrollArea className="flex-1 p-2 overflow-auto min-h-0">
        <div className="space-y-1">
          <div className="px-2 py-1 text-xs text-sidebar-foreground/70 uppercase tracking-wide">
            {selectedLanguage === "italian" ? "Consultazioni Recenti" : "Recent Consultations"}
          </div>
          {conversations.map((conversation) => (
            <div key={conversation.id} className="group relative flex items-stretch w-full min-w-0">
              <div className="flex-1 min-w-0">
                <Button
                  variant={activeConversationId === conversation.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left h-auto p-3 max-w-full"
                  onClick={() => onSelectConversation(conversation.id)}
                  style={{ maxWidth: '100%' }}
                >
                  <div className="flex items-start gap-2 w-full max-w-full">
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0 max-w-full">
                      <div className="truncate max-w-full" title={conversation.title}>{conversation.title}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-full" title={conversation.lastMessage}>
                        {conversation.lastMessage}
                      </div>
                      <div className="text-xs text-muted-foreground break-words max-w-full" title={conversation.timestamp}>
                        {conversation.timestamp}
                      </div>
                    </div>
                  </div>
                </Button>
              </div>
              <div className="flex-shrink-0 flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="ml-2 h-6 w-6 flex items-center justify-center rounded hover:bg-muted focus:outline-none"
                      title="Conversation options"
                      tabIndex={0}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => onDeleteConversation(conversation.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        {/* Subscription Button - Hide if subscription disabled */}
        {!featureFlags?.subscription_disabled && (
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2"
            onClick={() => window.location.href = '/subscription'}
          >
            <Crown className="h-4 w-4" />
            {subscriptionValid 
              ? (selectedLanguage === "italian" ? "Gestisci Abbonamento" : "Manage Subscription")
              : (selectedLanguage === "italian" ? "Abbonati" : "Subscribe")
            }
          </Button>
        )}

        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2"
          onClick={() => setShowSystemInfo(!showSystemInfo)}
        >
          <Info className="h-4 w-4" />
          {selectedLanguage === "italian" ? "Informazioni di sistema" : "System Information"}
        </Button>
        
        {/* Logout Button */}
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          {selectedLanguage === "italian" ? "Esci" : "Logout"}
        </Button>
        {showSystemInfo && systemInfo && (
          <div className="px-4 py-2 text-xs text-sidebar-foreground/70 space-y-1 bg-sidebar-accent rounded-md">
            <div>Model: {systemInfo.model}</div>
            <div>
              {selectedLanguage === "italian" ? "Base di conoscenza" : "Knowledge Base"}: {systemInfo.knowledge_base}
            </div>
            <div>
              {selectedLanguage === "italian" ? "Stato" : "Status"}: {systemInfo.status}
            </div>
            {systemInfo.embedding_model && (
              <div>
                {selectedLanguage === "italian" ? "Embeddings" : "Embeddings"}: {systemInfo.embedding_model}
              </div>
            )}
            <div className="pt-2 text-xs text-destructive">
              {selectedLanguage === "italian"
                ? "⚠️ Non è un sostituto della consulenza legale"
                : "⚠️ Not a substitute for legal advice"}
            </div>
          </div>
        )}
        <div className="px-3 py-2 text-xs text-sidebar-foreground/50 bg-destructive/10 rounded-md">
          <strong>{selectedLanguage === "italian" ? "Disclaimer:" : "Disclaimer:"}</strong>{" "}
          {selectedLanguage === "italian"
            ? "Questa IA fornisce solo informazioni legali generali. Consulta sempre un avvocato qualificato per una consulenza legale."
            : "This AI provides general legal information only. Always consult a qualified lawyer for legal advice."
          }
        </div>
      </div>
    </div>
  );
}