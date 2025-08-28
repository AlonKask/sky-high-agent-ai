
import { supabase } from '@/integrations/supabase/client';

export interface EmailSyncOptions {
  includeAIProcessing?: boolean;
  showProgress?: boolean;
}

export interface EmailSyncResult {
  success: boolean;
  stored: number;
  processed: number;
  errors?: any[];
  aiProcessed?: boolean;
  message?: string;
}

// Enhanced email sync utility with silent operation - no toast notifications
export class EmailSyncManager {
  private static instance: EmailSyncManager;
  private syncInProgress = false;
  private lastSyncTime: Date | null = null;

  public static getInstance(): EmailSyncManager {
    if (!EmailSyncManager.instance) {
      EmailSyncManager.instance = new EmailSyncManager();
    }
    return EmailSyncManager.instance;
  }

  async syncEmails(options: EmailSyncOptions = {}): Promise<EmailSyncResult> {
    if (this.syncInProgress) {
      return { success: false, stored: 0, processed: 0, message: 'Sync already in progress' };
    }

    this.syncInProgress = true;

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Check Gmail connection via secure credentials table
      const { data: gmailCreds, error: credsError } = await supabase
        .from('gmail_credentials')
        .select('gmail_user_email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (credsError || !gmailCreds?.gmail_user_email) {
        throw new Error('Gmail not connected. Please connect your Gmail account first.');
      }

      // Call unified email sync function - same as useEmailSync hook
      console.log('🚀 Starting silent email sync...');
      const { data, error } = await supabase.functions.invoke('unified-gmail-sync', {
        body: {
          userEmail: user?.email,
          userId: user?.id,
          syncType: options.includeAIProcessing ? 'full' : 'incremental',
          maxResults: 1000, // Increased for comprehensive coverage
          includeAIProcessing: options.includeAIProcessing || false
        }
      });

      console.log('📧 Email sync response:', { data, error });

      if (error) {
        throw error;
      }

      const result: EmailSyncResult = data;
      this.lastSyncTime = new Date();

      // Dispatch event for real-time updates without toast notifications
      window.dispatchEvent(new CustomEvent('gmail-sync-complete', {
        detail: { 
          syncedCount: result.stored,
          aiProcessed: result.aiProcessed,
          errors: result.errors
        }
      }));

      return result;

    } catch (error) {
      console.error('Email sync error:', error);

      return {
        success: false,
        stored: 0,
        processed: 0,
        message: error.message
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  async schedulePeriodicSync(intervalMinutes: number = 5): Promise<void> {
    // Set up periodic email sync - silent operation
    setInterval(async () => {
      try {
        await this.syncEmails({ includeAIProcessing: true, showProgress: false });
      } catch (error) {
        console.error('Periodic sync error:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  async checkGmailConnection(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: gmailCreds } = await supabase
        .from('gmail_credentials')
        .select('gmail_user_email')
        .eq('user_id', user.id)
        .maybeSingle();

      return !!gmailCreds?.gmail_user_email;
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
      return false;
    }
  }
}
