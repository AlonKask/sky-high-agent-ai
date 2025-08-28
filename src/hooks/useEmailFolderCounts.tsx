
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';

interface FolderCounts {
  inbox: number;
  sent: number;
  drafts: number;
  archive: number;
  trash: number;
  unread: number;
  starred: number;
}

export const useEmailFolderCounts = () => {
  const { user } = useSimpleAuth();
  const [counts, setCounts] = useState<FolderCounts>({
    inbox: 0,
    sent: 0,
    drafts: 0,
    archive: 0,
    trash: 0,
    unread: 0,
    starred: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (!user) {
      setCounts({
        inbox: 0,
        sent: 0,
        drafts: 0,
        archive: 0,
        trash: 0,
        unread: 0,
        starred: 0
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_exchanges')
        .select('direction, is_read, is_starred, is_archived, is_deleted, is_draft, folder_name')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching email counts:', error);
        return;
      }

      const emails = data || [];
      
      // Calculate unread counts only for each folder
      const newCounts = {
        inbox: emails.filter(e => 
          !e.is_deleted && 
          !e.is_archived && 
          e.direction === 'inbound' && 
          e.folder_name !== 'sent' && 
          e.is_read === false  // Only unread messages
        ).length,
        
        sent: emails.filter(e => 
          !e.is_deleted && 
          !e.is_archived && 
          (e.direction === 'outbound' || e.folder_name === 'sent') && 
          e.is_read === false  // Only unread messages
        ).length,
        
        drafts: emails.filter(e => 
          !e.is_deleted && 
          e.is_draft === true && 
          e.is_read === false  // Only unread messages
        ).length,
        
        archive: emails.filter(e => 
          !e.is_deleted && 
          e.is_archived === true && 
          e.is_read === false  // Only unread messages
        ).length,
        
        trash: emails.filter(e => 
          e.is_deleted === true && 
          e.is_read === false  // Only unread messages
        ).length,
        
        unread: emails.filter(e => 
          !e.is_deleted && 
          e.is_read === false
        ).length,
        
        starred: emails.filter(e => 
          !e.is_deleted && 
          e.is_starred === true && 
          e.is_read === false  // Only unread messages
        ).length
      };

      setCounts(newCounts);
    } catch (error) {
      console.error('Error calculating folder counts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Listen for email updates to refresh counts
  useEffect(() => {
    const handleEmailUpdate = () => {
      fetchCounts();
    };

    window.addEventListener('email-updated', handleEmailUpdate);
    window.addEventListener('gmail-sync-complete', handleEmailUpdate);

    return () => {
      window.removeEventListener('email-updated', handleEmailUpdate);
      window.removeEventListener('gmail-sync-complete', handleEmailUpdate);
    };
  }, [fetchCounts]);

  return {
    counts,
    isLoading,
    refreshCounts: fetchCounts
  };
};
