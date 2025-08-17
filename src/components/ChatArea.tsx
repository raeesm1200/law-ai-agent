import { useEffect, useRef } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  selectedLanguage: string; // Add this line
}

export function ChatArea({ messages, onSendMessage, isLoading, selectedLanguage }: ChatAreaProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area - This should be the only scrollable part */}
      <div className="flex-1 min-h-0 relative">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="p-4 sm:p-6">
            <div className="chat-container mx-auto w-full px-2 sm:px-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center min-h-[calc(100vh-240px)] text-center">
                  <div className="space-y-6 max-w-sm mx-auto px-4">
                    <div className="w-20 h-20 mx-auto mobile-card rounded-2xl flex items-center justify-center shadow-sm animated-gradient">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l-3-9m3 9l3-9" />
                      </svg>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl text-foreground mb-3 font-semibold">
                          {selectedLanguage === "italian" ? "AGENTE LEGALE AI" : "LAW AGENT AI"}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {selectedLanguage === "italian"
                            ? "Posso aiutarti a comprendere concetti giuridici, esaminare documenti e rispondere a domande su vari ambiti del diritto, inclusi contratti, lavoro, proprietà intellettuale e diritto societario."
                            : "I can help you understand legal concepts, review documents, and answer questions about various areas of law including contracts, employment, intellectual property, and corporate matters."
                          }
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground mobile-card border border-border/50 p-4 rounded-xl shadow-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-amber-400 mt-0.5">⚠️</span>
                          <div>
                            <strong className="text-foreground">
                              {selectedLanguage === "italian" ? "Importante Disclaimer:" : "Important Disclaimer:"}
                            </strong>{" "}
                            {selectedLanguage === "italian"
                              ? "Questa IA fornisce solo informazioni legali generali a scopo educativo. Non costituisce consulenza legale. Si prega di consultare un avvocato qualificato per questioni legali specifiche."
                              : "This AI provides general legal information for educational purposes only. It does not constitute legal advice. Please consult with a qualified lawyer for specific legal matters."
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pb-4">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 mb-6">
                      <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-sm text-white shadow-sm">
                        ⚖️
                      </div>
                      <div className="bg-card text-card-foreground rounded-xl px-4 py-3 border border-border shadow-sm">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Fixed Input Area - This stays at the bottom */}
      <div className="flex-shrink-0 border-t border-border/60 mobile-card backdrop-blur">
        <ChatInput
          onSendMessage={onSendMessage}
          disabled={isLoading}
          selectedLanguage={selectedLanguage}
        />
      </div>
    </div>
  );
}