
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  conversationId?: string;
  context?: {
    selectedEmails?: any[];
    clientInfo?: any;
    userPreferences?: any;
  };
}

export interface ChatResponse {
  response: string;
  conversationId?: string;
  usage?: any;
}

export class AIAssistantAPI {
  private static async getAuthToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) {
      throw new Error('No authentication token available');
    }
    return data.session.access_token;
  }

  static async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('AI Assistant API error:', error);
      throw error;
    }
  }

  static async createConversation(title: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('ai_email_conversations')
        .insert([{ title }])
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  static async getConversations(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ai_email_conversations')
        .select(`
          *,
          ai_email_messages(count)
        `)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  static async getConversationMessages(conversationId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ai_email_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_email_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  static async saveDraft(draft: {
    subject: string;
    body: string;
    recipient_emails: string[];
    cc_emails?: string[];
    bcc_emails?: string[];
    conversation_id?: string;
  }): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('ai_email_drafts')
        .insert([{
          ...draft,
          cc_emails: draft.cc_emails || [],
          bcc_emails: draft.bcc_emails || [],
        }])
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error saving draft:', error);
      throw error;
    }
  }

  static async getDrafts(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ai_email_drafts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting drafts:', error);
      throw error;
    }
  }
}
