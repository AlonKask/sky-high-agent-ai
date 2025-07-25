
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Trash2, 
  Bot, 
  User,
  Mail,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Loader2
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: any;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export const AIEmailAssistant: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_email_conversations')
        .select(`
          *,
          ai_email_messages(count)
        `)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setConversations(data || []);
      
      // Auto-select first conversation if none selected
      if (!activeConversation && data && data.length > 0) {
        setActiveConversation(data[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_email_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform the data to match our Message interface
      const transformedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        created_at: msg.created_at,
        metadata: msg.metadata
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const createNewConversation = async () => {
    if (!user) return;

    try {
      const title = `Conversation ${new Date().toLocaleString()}`;
      
      const { data, error } = await supabase
        .from('ai_email_conversations')
        .insert([{ title, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setConversations(prev => [data, ...prev]);
      setActiveConversation(data.id);
      setMessages([]);
      
      toast.success('New conversation created');
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('ai_email_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (activeConversation === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }

      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !user) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Create conversation if none exists
      let conversationId = activeConversation;
      if (!conversationId) {
        const { data, error } = await supabase
          .from('ai_email_conversations')
          .insert([{ 
            title: userMessage.substring(0, 50) + '...',
            user_id: user.id 
          }])
          .select()
          .single();

        if (error) throw error;

        conversationId = data.id;
        setActiveConversation(conversationId);
        setConversations(prev => [data, ...prev]);
      }

      // Add user message to UI immediately
      const userMessageObj: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessageObj]);

      // Call AI assistant
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      const response = await fetch(`https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/ai-assistant-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          conversationId,
          context: {
            selectedEmails,
            userPreferences: {},
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const result = await response.json();

      // Add assistant response to UI
      const assistantMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev.slice(0, -1), userMessageObj, assistantMessage]);

      // Reload conversations to update timestamps
      loadConversations();

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
      // Remove user message from UI on error
      setMessages(prev => prev.slice(0, -1));
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

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const MessageComponent = ({ message }: { message: Message }) => (
    <div className={`flex gap-3 p-4 ${message.role === 'user' ? 'bg-muted/30' : 'bg-background'}`}>
      <div className="flex-shrink-0">
        {message.role === 'user' ? (
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
        ) : (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {message.role === 'user' ? 'You' : 'AI Assistant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(message.created_at)}
          </span>
        </div>
        
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-foreground">{message.content}</p>
        </div>
        
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyMessage(message.content)}
            className="h-6 px-2 text-xs"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-muted-foreground">
            Please sign in to use the AI Email Assistant.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto h-[800px] grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Conversations Sidebar */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Conversations
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={createNewConversation}
              className="h-8 w-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="space-y-2 p-4">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    activeConversation === conversation.id
                      ? 'bg-primary/10 border-primary/20'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                  onClick={() => setActiveConversation(conversation.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(conversation.updated_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="h-6 w-6 p-0 ml-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {conversations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs">Start chatting to create one!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="lg:col-span-3 flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Email Assistant
            <Badge variant="secondary" className="ml-auto">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Online
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <Separator />
        
        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[500px]">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Welcome to AI Email Assistant</h3>
                  <p className="text-muted-foreground mb-4">
                    I can help you manage emails, draft responses, and provide insights.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg mx-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInputMessage("Analyze my recent emails")}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Analyze Emails
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInputMessage("Help me draft a professional email")}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Draft Email
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {messages.map((message) => (
                  <MessageComponent key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </div>
        
        <Separator />
        
        {/* Input */}
        <div className="p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Ask me anything about your emails..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {selectedEmails.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              {selectedEmails.length} email(s) selected for context
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AIEmailAssistant;
