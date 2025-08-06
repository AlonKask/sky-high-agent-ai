import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toastHelpers, supabaseErrorToast, supabaseSuccessToast } from '@/utils/toastHelpers';
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

interface AIEmailAssistantProps {
  mode?: 'full' | 'simple';
  onDraftCreated?: (draft: any) => void;
}

export const AIEmailAssistant: React.FC<AIEmailAssistantProps> = ({ 
  mode = 'full',
  onDraftCreated 
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && mode === 'full') {
      loadConversations();
    }
  }, [user, mode]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!user) return;
    
    try {
      setConversationsLoading(true);
      const { data, error } = await supabase
        .from('ai_email_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      supabaseErrorToast('load conversations', error);
    } finally {
      setConversationsLoading(false);
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
      setMessages((data || []).map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        created_at: msg.created_at,
        metadata: msg.metadata
      })));
    } catch (error) {
      supabaseErrorToast('load messages', error);
    }
  };

  const createNewConversation = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('ai_email_conversations')
        .insert({
          user_id: user.id,
          title: 'New Email Conversation'
        })
        .select()
        .single();

      if (error) throw error;
      
      supabaseSuccessToast('New conversation created');
      setActiveConversation(data.id);
      loadConversations();
    } catch (error) {
      supabaseErrorToast('create conversation', error);
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
      
      supabaseSuccessToast('Conversation deleted');
      if (activeConversation === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
      loadConversations();
    } catch (error) {
      supabaseErrorToast('delete conversation', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading || !user) return;

    // For simple mode, create conversation if needed
    let currentConversationId = activeConversation;
    if (!currentConversationId) {
      try {
        const { data, error } = await supabase
          .from('ai_email_conversations')
          .insert({
            user_id: user.id,
            title: 'Email Assistant Chat'
          })
          .select()
          .single();

        if (error) throw error;
        currentConversationId = data.id;
        setActiveConversation(currentConversationId);
      } catch (error) {
        supabaseErrorToast('create conversation', error);
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
      // Save user message
      await supabase
        .from('ai_email_messages')
        .insert({
          conversation_id: currentConversationId,
          user_id: user.id,
          role: 'user',
          content: userMessage.content
        });

      // Call AI assistant
      const { data, error } = await supabase.functions.invoke('ai-assistant-chat', {
        body: {
          message: userMessage.content,
          conversation_id: currentConversationId,
          context: 'email_assistance'
        }
      });

      if (error) throw error;

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'I apologize, but I encountered an issue processing your request.',
        created_at: new Date().toISOString(),
      };

      // Save AI response
      await supabase
        .from('ai_email_messages')
        .insert({
          conversation_id: currentConversationId,
          user_id: user.id,
          role: 'assistant',
          content: aiResponse.content
        });

      setMessages(prev => [...prev, aiResponse]);

      // If draft was created, call callback
      if (data.draft && onDraftCreated) {
        onDraftCreated(data.draft);
      }

    } catch (error) {
      supabaseErrorToast('send message', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toastHelpers.success('Message copied to clipboard');
  };

  // Simple mode rendering
  if (mode === 'simple') {
    return (
      <Card className="h-[400px] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Email Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <div className="flex items-start gap-2">
                      {message.role === 'assistant' && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                      {message.role === 'user' && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me about email composition, responses, or management..."
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={loading}
            />
            <Button onClick={handleSendMessage} disabled={loading || !inputMessage.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full mode rendering
  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r bg-muted/30">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Conversations</h3>
            <Button size="sm" onClick={createNewConversation}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="p-4">
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-background rounded-lg"></div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setActiveConversation(conversation.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                    activeConversation === conversation.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{conversation.title}</h4>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(conversation.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="h-6 w-6 p-0 ml-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            <div className="p-4 border-b bg-background">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                AI Email Assistant
              </h3>
              <p className="text-sm text-muted-foreground">Get help with email composition and management</p>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <div className="flex items-start gap-3">
                        {message.role === 'assistant' && <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                        {message.role === 'user' && <User className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1">
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs opacity-70">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(message.content)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-4 max-w-[80%]">
                      <div className="flex items-center gap-3">
                        <Bot className="h-5 w-5" />
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me about email composition, responses, or management..."
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={loading}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={loading || !inputMessage.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Welcome to AI Email Assistant</h3>
              <p className="text-muted-foreground mb-4">
                Select an existing conversation or create a new one to get started.
              </p>
              <Button onClick={createNewConversation}>
                <Plus className="h-4 w-4 mr-2" />
                Start New Conversation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIEmailAssistant;