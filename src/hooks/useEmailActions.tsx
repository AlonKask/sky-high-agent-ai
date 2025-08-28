import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface EmailExchange {
  id: string;
  subject: string;
  body: string;
  sender_email: string;
  recipient_emails: string[];
  direction: 'inbound' | 'outbound';
  email_type: string;
  created_at: string;
  status: string;
  message_id?: string;
  thread_id?: string;
  cc_emails?: string[];
  bcc_emails?: string[];
  client_id?: string;
  request_id?: string;
  user_id: string;
  attachments?: any;
  metadata?: any;
  updated_at?: string;
  is_read?: boolean;
  is_starred?: boolean;
  is_archived?: boolean;
  is_deleted?: boolean;
  is_draft?: boolean;
  folder_name?: string;
  clients?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export const useEmailActions = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Mark email as read/unread (disabled for sent emails)
  const toggleReadStatus = async (emailId: string, isRead: boolean, folderName?: string) => {
    // CRITICAL FIX: Prevent read/unread operations on sent emails
    if (folderName === 'sent') {
      toast({
        title: 'Not available for sent emails',
        description: 'Sent emails are automatically marked as read',
        variant: 'default',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('email_exchanges')
        .update({ is_read: isRead })
        .eq('id', emailId);

      if (error) throw error;
      
      toast({
        title: `Email marked as ${isRead ? 'read' : 'unread'}`,
        description: 'Email status updated successfully',
      });
      
      // Dispatch event to refresh folder counts
      window.dispatchEvent(new CustomEvent('email-updated'));
    } catch (error: any) {
      console.error('Error updating read status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update email status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle star status
  const toggleStarred = async (emailId: string, isStarred: boolean) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('email_exchanges')
        .update({ is_starred: isStarred })
        .eq('id', emailId);

      if (error) throw error;
      
      toast({
        title: `Email ${isStarred ? 'starred' : 'unstarred'}`,
        description: 'Email updated successfully',
      });
      
      // Dispatch event to refresh folder counts
      window.dispatchEvent(new CustomEvent('email-updated'));
    } catch (error: any) {
      console.error('Error updating star status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Archive email
  const archiveEmail = async (emailId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('email_exchanges')
        .update({ 
          is_archived: true,
          folder_name: 'archive'
        })
        .eq('id', emailId);

      if (error) throw error;
      
      toast({
        title: 'Email archived',
        description: 'Email moved to archive',
      });
      
      // Dispatch event to refresh folder counts
      window.dispatchEvent(new CustomEvent('email-updated'));
    } catch (error: any) {
      console.error('Error archiving email:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete email (soft delete)
  const deleteEmail = async (emailId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('email_exchanges')
        .update({ 
          is_deleted: true,
          folder_name: 'trash'
        })
        .eq('id', emailId);

      if (error) throw error;
      
      toast({
        title: 'Email deleted',
        description: 'Email moved to trash',
      });
      
      // Dispatch event to refresh folder counts
      window.dispatchEvent(new CustomEvent('email-updated'));
    } catch (error: any) {
      console.error('Error deleting email:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Restore email from trash
  const restoreEmail = async (emailId: string, originalFolder: string = 'inbox') => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('email_exchanges')
        .update({ 
          is_deleted: false,
          is_archived: false,
          folder_name: originalFolder
        })
        .eq('id', emailId);

      if (error) throw error;
      
      toast({
        title: 'Email restored',
        description: `Email restored to ${originalFolder}`,
      });
      
      // Dispatch event to refresh folder counts
      window.dispatchEvent(new CustomEvent('email-updated'));
    } catch (error: any) {
      console.error('Error restoring email:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Move email to folder
  const moveToFolder = async (emailId: string, folderName: string) => {
    setIsLoading(true);
    try {
      const updates: any = { folder_name: folderName };
      
      // Reset status flags based on folder
      switch (folderName) {
        case 'inbox':
          updates.is_archived = false;
          updates.is_deleted = false;
          break;
        case 'archive':
          updates.is_archived = true;
          updates.is_deleted = false;
          break;
        case 'trash':
          updates.is_deleted = true;
          break;
      }

      const { error } = await supabase
        .from('email_exchanges')
        .update(updates)
        .eq('id', emailId);

      if (error) throw error;
      
      toast({
        title: 'Email moved',
        description: `Email moved to ${folderName}`,
      });
      
      // Dispatch event to refresh folder counts
      window.dispatchEvent(new CustomEvent('email-updated'));
    } catch (error: any) {
      console.error('Error moving email:', error);
      toast({
        title: 'Error',
        description: 'Failed to move email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk operations
  const bulkArchive = async (emailIds: string[]) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('email_exchanges')
        .update({ 
          is_archived: true,
          folder_name: 'archive'
        })
        .in('id', emailIds);

      if (error) throw error;
      
      toast({
        title: 'Emails archived',
        description: `${emailIds.length} emails moved to archive`,
      });
      
      // Dispatch event to refresh folder counts
      window.dispatchEvent(new CustomEvent('email-updated'));
    } catch (error: any) {
      console.error('Error bulk archiving:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive emails',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const bulkDelete = async (emailIds: string[]) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('email_exchanges')
        .update({ 
          is_deleted: true,
          folder_name: 'trash'
        })
        .in('id', emailIds);

      if (error) throw error;
      
      toast({
        title: 'Emails deleted',
        description: `${emailIds.length} emails moved to trash`,
      });
      
      // Dispatch event to refresh folder counts
      window.dispatchEvent(new CustomEvent('email-updated'));
    } catch (error: any) {
      console.error('Error bulk deleting:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete emails',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const bulkMarkAsRead = async (emailIds: string[], isRead: boolean, folderName?: string) => {
    // CRITICAL FIX: Prevent bulk read/unread operations on sent emails
    if (folderName === 'sent') {
      toast({
        title: 'Not available for sent folder',
        description: 'Sent emails are automatically marked as read',
        variant: 'default',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('email_exchanges')
        .update({ is_read: isRead })
        .in('id', emailIds);

      if (error) throw error;
      
      toast({
        title: `Emails marked as ${isRead ? 'read' : 'unread'}`,
        description: `${emailIds.length} emails updated`,
      });
      
      // Dispatch event to refresh folder counts
      window.dispatchEvent(new CustomEvent('email-updated'));
    } catch (error: any) {
      console.error('Error bulk updating read status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update emails',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create reply draft
  const createReplyDraft = async (originalEmail: EmailExchange): Promise<string | null> => {
    setIsLoading(true);
    try {
      const replySubject = originalEmail.subject.startsWith('Re:') 
        ? originalEmail.subject 
        : `Re: ${originalEmail.subject}`;

      const { data, error } = await supabase
        .from('ai_email_drafts')
        .insert({
          user_id: originalEmail.user_id,
          subject: replySubject,
          body: `\n\n--- Original Message ---\nFrom: ${originalEmail.sender_email}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body}`,
          recipient_emails: [originalEmail.sender_email],
          email_type: 'general',
          status: 'draft'
        })
        .select('id')
        .single();

      if (error) throw error;
      
      toast({
        title: 'Reply draft created',
        description: 'Draft saved and ready for editing',
      });

      return data.id;
    } catch (error: any) {
      console.error('Error creating reply draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to create reply draft',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Create forward draft
  const createForwardDraft = async (originalEmail: EmailExchange): Promise<string | null> => {
    setIsLoading(true);
    try {
      const forwardSubject = originalEmail.subject.startsWith('Fwd:') 
        ? originalEmail.subject 
        : `Fwd: ${originalEmail.subject}`;

      const { data, error } = await supabase
        .from('ai_email_drafts')
        .insert({
          user_id: originalEmail.user_id,
          subject: forwardSubject,
          body: `--- Forwarded Message ---\nFrom: ${originalEmail.sender_email}\nTo: ${originalEmail.recipient_emails.join(', ')}\nSubject: ${originalEmail.subject}\nDate: ${new Date(originalEmail.created_at).toLocaleString()}\n\n${originalEmail.body}`,
          recipient_emails: [],
          email_type: 'general',
          status: 'draft'
        })
        .select('id')
        .single();

      if (error) throw error;
      
      toast({
        title: 'Forward draft created',
        description: 'Draft saved and ready for editing',
      });

      return data.id;
    } catch (error: any) {
      console.error('Error creating forward draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to create forward draft',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    toggleReadStatus,
    toggleStarred,
    archiveEmail,
    deleteEmail,
    restoreEmail,
    moveToFolder,
    bulkArchive,
    bulkDelete,
    bulkMarkAsRead,
    createReplyDraft,
    createForwardDraft
  };
};