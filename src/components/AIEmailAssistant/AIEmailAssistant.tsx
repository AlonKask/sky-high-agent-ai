import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Bot, 
  User,
  Loader2,
  Trash2,
  Copy,
  History
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata?: {
    tools_used?: string[];
    memory_accessed?: boolean;
    external_data?: any;
  };
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const AIEmailAssistant: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!user) return;

    try {
      setLoadingConversations(true);
      const { data, error } = await supabase
        .from('ai_email_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);

      // Auto-select first conversation if none selected
      if (data && data.length > 0 && !activeConversation) {
        setActiveConversation(data[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ai_email_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const typedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        created_at: msg.created_at,
        metadata: msg.metadata as any
      }));
      setMessages(typedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const createNewConversation = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ai_email_conversations')
        .insert({
          user_id: user.id,
          title: 'New Conversation'
        })
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
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ai_email_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (activeConversation === conversationId) {
        const remaining = conversations.filter(c => c.id !== conversationId);
        setActiveConversation(remaining.length > 0 ? remaining[0].id : null);
        setMessages([]);
      }
      
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading || !user) return;

    let conversationId = activeConversation;

    // Create new conversation if none exists
    if (!conversationId) {
      try {
        const { data, error } = await supabase
          .from('ai_email_conversations')
          .insert({
            user_id: user.id,
            title: inputMessage.slice(0, 50) + (inputMessage.length > 50 ? '...' : '')
          })
          .select()
          .single();

        if (error) throw error;
        
        conversationId = data.id;
        setActiveConversation(conversationId);
        setConversations(prev => [data, ...prev]);
      } catch (error) {
        console.error('Error creating conversation:', error);
        toast.error('Failed to create conversation');
        return;
      }
    }

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
      // Save user message to database
      await supabase
        .from('ai_email_messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'user',
          content: userMessage.content
        });

      // Get context for AI assistant
      const context = {
        user_id: user.id,
        conversation_id: conversationId,
        recent_messages: messages.slice(-10),
        current_page: window.location.pathname
      };

      // Call AI assistant
      const { data, error } = await supabase.functions.invoke('advanced-ai-assistant', {
        body: {
          message: userMessage.content,
          context,
          conversation_id: conversationId
        }
      });

      if (error) throw error;

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        created_at: new Date().toISOString(),
        metadata: data.metadata
      };

      setMessages(prev => [...prev, aiResponse]);

      // Save AI response to database
      await supabase
        .from('ai_email_messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'assistant',
          content: aiResponse.content,
          metadata: aiResponse.metadata
        });

      // Update conversation timestamp
      await supabase
        .from('ai_email_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
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
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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

  // Message Component
  const MessageComponent = ({ message }: { message: Message }) => (
    <div
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
        <div className="space-y-2">
          <div
            className={`rounded-lg px-4 py-3 ${
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatTimestamp(message.created_at)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyMessage(message.content)}
              className="h-auto p-1"
            >
              <Copy className="w-3 h-3" />
            </Button>
            {message.metadata?.tools_used && (
              <Badge variant="outline" className="text-xs">
                Used {message.metadata.tools_used.length} tools
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex">
      {/* Sidebar - Conversations */}
      <div className="w-80 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <History className="w-4 h-4" />
              Conversations
            </h3>
            <Button onClick={createNewConversation} size="sm" variant="outline">
              <Plus className="w-3 h-3 mr-1" />
              New
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-2">
          {loadingConversations ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                    activeConversation === conversation.id 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setActiveConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conversation.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 h-auto p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Email Assistant
            {activeConversation && (
              <Badge variant="outline" className="ml-auto">
                {messages.length} messages
              </Badge>
            )}
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
                  <MessageComponent key={message.id} message={message} />
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
              <div ref={messagesEndRef} />
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
                onClick={sendMessage}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage('Show me my top clients and opportunities')}
                disabled={loading}
              >
                <Bot className="w-3 h-3 mr-1" />
                Business Insights
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
};

export default AIEmailAssistant;