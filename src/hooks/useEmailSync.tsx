import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface EmailSyncOptions {
  syncType?: 'incremental' | 'full' | 'historical';
  maxResults?: number;
  includeAIProcessing?: boolean;
  showProgress?: boolean;
}

export interface EmailSyncResult {
  success: boolean;
  stored: number;
  processed: number;
  total_available?: number;
  duplicates_skipped?: number;
  sync_type?: string;
  query_used?: string;
  has_more?: boolean;
  errors?: any[];
  aiProcessed?: boolean;
  message?: string;
}

export interface EmailSyncProgress {
  isActive: boolean;
  currentBatch: number;
  totalBatches: number;
  emailsProcessed: number;
  emailsStored: number;
  syncType: string;
  message: string;
}

export const useEmailSync = () => {
  const [syncProgress, setSyncProgress] = useState<EmailSyncProgress>({
    isActive: false,
    currentBatch: 0,
    totalBatches: 0,
    emailsProcessed: 0,
    emailsStored: 0,
    syncType: '',
    message: ''
  });

  const performSync = useCallback(async (options: EmailSyncOptions = {}): Promise<EmailSyncResult> => {
    const {
      syncType = 'incremental',
      maxResults = 200,
      includeAIProcessing = false,
      showProgress = true
    } = options;

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check Gmail connection
    const { data: gmailCreds, error: credsError } = await supabase
      .from('gmail_credentials')
      .select('gmail_user_email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (credsError || !gmailCreds?.gmail_user_email) {
      throw new Error('Gmail not connected. Please connect your Gmail account first.');
    }

    // Set initial progress
    if (showProgress) {
      setSyncProgress({
        isActive: true,
        currentBatch: 1,
        totalBatches: 1,
        emailsProcessed: 0,
        emailsStored: 0,
        syncType: syncType,
        message: `Starting ${syncType} sync...`
      });

      toast({
        title: "Syncing emails",
        description: `Performing ${syncType} sync with ${maxResults} emails per batch`,
      });
    }

    try {
      console.log(`🚀 Starting ${syncType} email sync with max ${maxResults} emails...`);
      
      const { data, error } = await supabase.functions.invoke('enhanced-gmail-sync', {
        body: {
          syncType,
          maxResults,
          includeAIProcessing
        }
      });

      if (error) {
        throw error;
      }

      const result: EmailSyncResult = data;

      // Update progress with results
      if (showProgress) {
        setSyncProgress(prev => ({
          ...prev,
          isActive: false,
          emailsProcessed: result.processed || 0,
          emailsStored: result.stored || 0,
          message: `Completed: ${result.stored} new emails synced`
        }));

        if (result.success) {
          if (result.stored > 0) {
            toast({
              title: "Sync completed successfully",
              description: `Synced ${result.stored} new emails (${result.processed} processed, ${result.duplicates_skipped || 0} duplicates skipped)`,
            });
          } else {
            toast({
              title: "Sync completed",
              description: "No new emails to sync",
            });
          }
        } else {
          toast({
            title: "Sync failed",
            description: result.message || 'Email sync failed',
            variant: "destructive"
          });
        }
      }

      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('gmail-sync-complete', {
        detail: { 
          syncedCount: result.stored,
          processedCount: result.processed,
          syncType: result.sync_type,
          hasMore: result.has_more,
          aiProcessed: result.aiProcessed,
          errors: result.errors
        }
      }));

      return result;

    } catch (error: any) {
      console.error('Email sync error:', error);
      
      if (showProgress) {
        setSyncProgress(prev => ({
          ...prev,
          isActive: false,
          message: `Sync failed: ${error.message}`
        }));

        toast({
          title: "Sync failed",
          description: error.message,
          variant: "destructive"
        });
      }

      return {
        success: false,
        stored: 0,
        processed: 0,
        message: error.message
      };
    }
  }, []);

  // Comprehensive full mailbox sync
  const performFullSync = useCallback(async (showProgress: boolean = true): Promise<EmailSyncResult> => {
    return performSync({
      syncType: 'full',
      maxResults: 200,
      includeAIProcessing: false,
      showProgress
    });
  }, [performSync]);

  // Historical sync for older emails
  const performHistoricalSync = useCallback(async (showProgress: boolean = true): Promise<EmailSyncResult> => {
    return performSync({
      syncType: 'historical',
      maxResults: 200,
      includeAIProcessing: false,
      showProgress
    });
  }, [performSync]);

  // Quick incremental sync
  const performQuickSync = useCallback(async (showProgress: boolean = false): Promise<EmailSyncResult> => {
    return performSync({
      syncType: 'incremental',
      maxResults: 100,
      includeAIProcessing: false,
      showProgress
    });
  }, [performSync]);

  // Progressive sync - starts with full, then does historical batches
  const performProgressiveSync = useCallback(async (): Promise<void> => {
    try {
      // Step 1: Full sync for recent emails
      console.log('📧 Starting progressive sync - Step 1: Full recent sync');
      const fullResult = await performFullSync(true);
      
      if (!fullResult.success) {
        throw new Error(`Full sync failed: ${fullResult.message}`);
      }

      // Step 2: Historical sync if there's potentially more data
      if (fullResult.has_more) {
        console.log('📧 Progressive sync - Step 2: Historical sync');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Brief pause
        await performHistoricalSync(true);
      }

      toast({
        title: "Progressive sync completed",
        description: "All available emails have been synced to your account",
      });

    } catch (error: any) {
      console.error('Progressive sync error:', error);
      toast({
        title: "Progressive sync failed",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [performFullSync, performHistoricalSync]);

  return {
    syncProgress,
    performSync,
    performFullSync,
    performHistoricalSync,
    performQuickSync,
    performProgressiveSync,
    isSyncActive: syncProgress.isActive
  };
};