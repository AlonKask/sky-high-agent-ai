import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Bot, 
  User,
  Loader2
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const AIEmailAssistant: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      // Simulate AI response for now
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I understand your request. How can I help you with your email management today?',
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiResponse]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Please log in to use the AI assistant.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Email Assistant
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 p-6">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Start a conversation with your AI assistant</p>
                <p className="text-sm">Ask about email management, client communications, or travel planning</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`flex gap-3 max-w-[85%] ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {message.role === 'user' ? (
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-primary-foreground" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                    <div
                      className={`rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  </div>
                  <div className="rounded-lg px-4 py-3 bg-muted text-foreground">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 space-y-3">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your emails..."
              className="flex-1"
              disabled={loading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || loading}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage('Help me draft a professional email')}
              disabled={loading}
            >
              <Plus className="w-3 h-3 mr-1" />
              Draft Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage('Analyze my recent emails')}
              disabled={loading}
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              Analyze Emails
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIEmailAssistant;