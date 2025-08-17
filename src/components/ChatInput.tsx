import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  selectedLanguage: string; // Add this line
}

export function ChatInput({ onSendMessage, disabled, selectedLanguage }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 mobile-card">
      <div className="chat-container mx-auto px-2 sm:px-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              selectedLanguage === "italian"
                ? "Fai una domanda legale o descrivi la tua situazione..."
                : "Ask a legal question or describe your situation..."
            }
            className="flex-1 min-h-[48px] max-h-32 resize-none mobile-input rounded-xl shadow-sm text-white placeholder:text-gray-400"
            disabled={disabled}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!message.trim() || disabled}
            className="h-[48px] w-[48px] flex-shrink-0 rounded-xl shadow-sm mobile-button text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}