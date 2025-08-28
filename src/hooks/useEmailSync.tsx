
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      showProgress = false // Default to false for silent operation
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

    // Set initial progress only if explicitly requested
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
    }

    try {
      console.log(`🚀 Starting ${syncType} email sync with max ${maxResults} emails...`);
      
      const { data, error } = await supabase.functions.invoke('unified-gmail-sync', {
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

      // Update progress with results only if explicitly requested
      if (showProgress) {
        setSyncProgress(prev => ({
          ...prev,
          isActive: false,
          emailsProcessed: result.processed || 0,
          emailsStored: result.stored || 0,
          message: `Completed: ${result.stored} new emails synced`
        }));
      }

      // Dispatch event for real-time updates without toast notifications
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
      }

      return {
        success: false,
        stored: 0,
        processed: 0,
        message: error.message
      };
    }
  }, []);

  // All sync methods now operate silently by default
  const performFullSync = useCallback(async (showProgress: boolean = false): Promise<EmailSyncResult> => {
    return performSync({
      syncType: 'full',
      maxResults: 200,
      includeAIProcessing: false,
      showProgress
    });
  }, [performSync]);

  const performHistoricalSync = useCallback(async (showProgress: boolean = false): Promise<EmailSyncResult> => {
    return performSync({
      syncType: 'historical',
      maxResults: 200,
      includeAIProcessing: false,
      showProgress
    });
  }, [performSync]);

  const performQuickSync = useCallback(async (showProgress: boolean = false): Promise<EmailSyncResult> => {
    return performSync({
      syncType: 'incremental',
      maxResults: 100,
      includeAIProcessing: false,
      showProgress
    });
  }, [performSync]);

  const performEmailReclassification = useCallback(async (): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: gmailCreds } = await supabase
        .from('gmail_credentials')
        .select('gmail_user_email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!gmailCreds?.gmail_user_email) return;

      console.log('🔄 Starting email reclassification...');
      
      const { data, error } = await supabase.functions.invoke('reclassify-emails', {
        body: {
          userId: user.id,
          userEmail: gmailCreds.gmail_user_email,
          batchSize: 200
        }
      });

      if (error) {
        console.error('❌ Email reclassification failed:', error);
      } else {
        console.log('✅ Email reclassification completed:', data);
        
        // Dispatch event to update UI
        window.dispatchEvent(new CustomEvent('email-reclassification-complete', {
          detail: { 
            processed: data.processed,
            folderDistribution: data.folder_distribution
          }
        }));
      }
    } catch (error: any) {
      console.error('Email reclassification error:', error);
    }
  }, []);

  const performProgressiveSync = useCallback(async (): Promise<void> => {
    try {
      // Step 1: Silent progressive sync
      console.log('📧 Starting silent progressive sync - Step 1: Full recent sync');
      const fullResult = await performFullSync(false);
      
      if (!fullResult.success) {
        throw new Error(`Full sync failed: ${fullResult.message}`);
      }

      // Step 2: Reclassify existing emails to fix folder assignments
      console.log('📧 Silent progressive sync - Step 2: Email reclassification');
      await performEmailReclassification();

      // Step 3: Historical sync if there's potentially more data
      if (fullResult.has_more) {
        console.log('📧 Silent progressive sync - Step 3: Historical sync');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Brief pause
        await performHistoricalSync(false);
      }

    } catch (error: any) {
      console.error('Progressive sync error:', error);
    }
  }, [performFullSync, performHistoricalSync, performEmailReclassification]);

  return {
    syncProgress,
    performSync,
    performFullSync,
    performHistoricalSync,
    performQuickSync,
    performProgressiveSync,
    performEmailReclassification,
    isSyncActive: syncProgress.isActive
  };
};
