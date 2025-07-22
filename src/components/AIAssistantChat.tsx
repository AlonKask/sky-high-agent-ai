import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2,
  Minimize2,
  Maximize2,
  Brain,
  Database,
  Search,
  Calendar,
  Mail,
  Navigation,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    tools_used?: string[];
    memory_accessed?: boolean;
    external_data?: any;
  };
}

interface AIAssistantChatProps {
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
  initialContext?: string;
}

export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({
  isMinimized,
  onToggleMinimize,
  onClose,
  initialContext
 }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialContext) {
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hi! I'm your AI assistant with access to your complete business context, client relationships, and sales pipeline. I can help you with email analysis, sales strategies, client management, and more. How can I assist you today?`,
        timestamp: new Date(),
        metadata: {
          memory_accessed: true,
          tools_used: ['memory_system']
        }
      }]);
    }
  }, [initialContext]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Extract current page context
      const currentPage = location.pathname.split('/')[1] || 'dashboard';
      const pathParams = location.pathname.split('/');
      const contextData = {
        currentPage,
        clientId: pathParams[1] === 'client' ? pathParams[2] : null,
        requestId: pathParams[1] === 'request' ? pathParams[2] : null,
        bookingId: pathParams[1] === 'booking' ? pathParams[2] : null
      };

      const { data, error } = await supabase.functions.invoke('advanced-ai-assistant', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          context: `${initialContext} | Current page: ${currentPage} | Path: ${location.pathname}`,
          clientId: contextData.clientId,
          requestId: contextData.requestId,
          currentPage
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        metadata: {
          tools_used: data.functionResults?.map((r: any) => r.function) || [],
          memory_accessed: data.memoryUpdated || false,
          external_data: data.context
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle navigation if requested
      if (data.functionResults) {
        data.functionResults.forEach((result: any) => {
          if ((result.function === 'navigate_to_page' || result.function === 'search_and_navigate') && result.navigation?.url) {
            toast({
              title: "Navigating",
              description: result.message
            });
            setTimeout(() => navigate(result.navigation.url), 1000);
          }
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isMinimized) {
    return (
      <Card className="fixed bottom-4 right-4 w-16 h-16 bg-background border shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
        <div className="flex flex-col items-center justify-center gap-1">
          <Bot className="h-6 w-6 text-primary" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMinimize}
              className="h-4 w-4 p-0 hover:bg-transparent"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-4 w-4 p-0 hover:bg-transparent"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[500px] bg-background border shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">AI Assistant</span>
          <Badge variant="secondary" className="text-xs">Online</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMinimize}
            className="h-6 w-6 p-0"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start gap-2 max-w-[80%] ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}>
                <div className={`p-2 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <Bot className="h-3 w-3" />
                  )}
                </div>
                <div className={`p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 opacity-70`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-sm">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your emails..."
            disabled={isLoading}
            className="text-sm"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};