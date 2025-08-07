import { Avatar, AvatarFallback } from "./ui/avatar";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`flex gap-3 mb-6 ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="w-9 h-9 flex-shrink-0 shadow-sm">
        <AvatarFallback className={`text-sm ${
          message.isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-slate-600 text-white'
        }`}>
          {message.isUser ? '👤' : '⚖️'}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col max-w-[90%] sm:max-w-[80%] md:max-w-[70%] ${message.isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-xl px-4 py-3 shadow-sm border chat-message ${
          message.isUser 
            ? 'user-message' 
            : 'bot-message text-card-foreground'
        }`}>
          <p className="whitespace-pre-wrap leading-relaxed chat-message">{message.content}</p>
        </div>
        <span className="text-xs text-muted-foreground mt-2 px-1">
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}