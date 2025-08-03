import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toastHelpers } from '@/utils/toastHelpers';
import { 
  Send, 
  MessageSquare, 
  Phone, 
  RefreshCw, 
  User,
  Clock,
  Check,
  CheckCheck,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  phone_number: string;
  contact_name?: string;
  content: string;
  created_at: string;
  read_status: boolean;
  message_type: string;
  status: string;
}

interface Conversation {
  phone_number: string;
  contact_name: string;
  messages: Message[];
  last_message: Message;
  unread_count: number;
}

const Messages = () => {
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  useEffect(() => {
    if (user) {
      loadConversations();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('messages-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ringcentral-messages', {
        body: { action: 'getConversations' }
      });

      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncMessages = async () => {
    setIsLoading(true);
    try {
      // Sync both messages and calls
      const [messagesResult, callsResult] = await Promise.all([
        supabase.functions.invoke('ringcentral-messages', {
          body: { action: 'syncMessages' }
        }),
        supabase.functions.invoke('ringcentral-messages', {
          body: { action: 'syncCalls' }
        })
      ]);

      if (messagesResult.error) throw messagesResult.error;
      if (callsResult.error) throw callsResult.error;
      
      const totalSynced = (messagesResult.data?.synced || 0) + (callsResult.data?.synced || 0);
      
      toast({
        title: "Success",
        description: `Synced ${totalSynced} items from RingCentral (${messagesResult.data?.synced || 0} messages, ${callsResult.data?.synced || 0} calls)`,
      });
      
      await loadConversations();
    } catch (error: any) {
      console.error('Error syncing:', error);
      toast({
        title: "Error",
        description: "Failed to sync from RingCentral: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const phoneNumber = selectedConversation?.phone_number || newPhoneNumber;
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('ringcentral-messages', {
        body: { 
          action: 'send', 
          to: phoneNumber,
          text: newMessage 
        }
      });

      if (error) throw error;
      
      setNewMessage('');
      setNewPhoneNumber('');
      setShowNewConversation(false);
      
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
      
      await loadConversations();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const markAsRead = async (conversation: Conversation) => {
    const unreadMessages = conversation.messages
      .filter(m => !m.read_status && m.direction === 'inbound')
      .map(m => m.id);

    if (unreadMessages.length === 0) return;

    try {
      const { error } = await supabase.functions.invoke('ringcentral-messages', {
        body: { 
          action: 'markAsRead', 
          messageIds: unreadMessages 
        }
      });

      if (error) throw error;
      await loadConversations();
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Simple phone number formatting
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
    }
    return phone;
  };

  const getMessageIcon = (message: Message) => {
    if (message.message_type === 'Call') {
      return message.direction === 'inbound' 
        ? <PhoneIncoming className="h-3 w-3 text-green-500" />
        : <PhoneOutgoing className="h-3 w-3 text-blue-500" />;
    }
    return null;
  };

  const getMessageStatus = (message: Message) => {
    if (message.direction === 'outbound' && message.message_type !== 'Call') {
      switch (message.status) {
        case 'sent':
          return <Check className="h-3 w-3 text-muted-foreground" />;
        case 'delivered':
          return <CheckCheck className="h-3 w-3 text-blue-500" />;
        case 'failed':
          return <span className="text-red-500 text-xs">Failed</span>;
        default:
          return <Clock className="h-3 w-3 text-muted-foreground" />;
      }
    }
    return null;
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={syncMessages}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowNewConversation(true)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations.map((conversation) => (
              <Card
                key={conversation.phone_number}
                className={`mb-2 cursor-pointer transition-colors hover:bg-accent/50 ${
                  selectedConversation?.phone_number === conversation.phone_number
                    ? 'ring-2 ring-primary bg-accent/20'
                    : ''
                }`}
                onClick={() => {
                  setSelectedConversation(conversation);
                  markAsRead(conversation);
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {conversation.contact_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPhoneNumber(conversation.phone_number)}
                        </p>
                      </div>
                    </div>
                    {conversation.unread_count > 0 && (
                      <Badge variant="default" className="text-xs">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message?.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(conversation.last_message?.created_at), { addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            ))}
            
            {conversations.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm">Sync with RingCentral or start a new conversation</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Messages View */}
      <div className="flex-1 flex flex-col">
        {selectedConversation || showNewConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">
                    {selectedConversation?.contact_name || 'New Message'}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {formatPhoneNumber(selectedConversation?.phone_number || newPhoneNumber || '')}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {showNewConversation && !selectedConversation && (
                  <div className="mb-4">
                    <Input
                      placeholder="Enter phone number (e.g., +1234567890)"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                )}
                
                {selectedConversation?.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.direction === 'outbound'
                          ? 'bg-primary text-primary-foreground'
                          : message.message_type === 'Call'
                          ? 'bg-accent border'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getMessageIcon(message)}
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs opacity-70">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                        {getMessageStatus(message)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-card">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={isSending}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={isSending || !newMessage.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/30">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the list or start a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;