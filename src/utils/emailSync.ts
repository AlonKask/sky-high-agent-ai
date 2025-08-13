import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// Enhanced email sync utility with better error handling and progress tracking
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
      toast.warning('Email sync already in progress');
      return { success: false, stored: 0, processed: 0, message: 'Sync already in progress' };
    }

    this.syncInProgress = true;

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // No longer fetch tokens client-side; only check basic connection status if needed
      const { data: prefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('gmail_user_email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError || !prefs?.gmail_user_email) {
        throw new Error('Gmail not connected. Please connect your Gmail account first.');
      }

      if (options.showProgress) {
        toast.loading('Syncing emails...', { id: 'email-sync' });
      }

      // Call unified email sync function
      console.log('🚀 Invoking unified email sync...');
      const { data, error } = await supabase.functions.invoke('unified-gmail-sync', {
        body: {
          includeAIProcessing: options.includeAIProcessing || false
        }
      });

      console.log('📧 Email sync response:', { data, error });

      if (error) {
        throw error;
      }

      const result: EmailSyncResult = data;
      this.lastSyncTime = new Date();

      if (options.showProgress) {
        toast.dismiss('email-sync');
        
        if (result.success) {
          if (result.stored > 0) {
            toast.success(
              `Successfully synced ${result.stored} new emails${
                result.aiProcessed ? ' with AI analysis' : ''
              }`
            );
          } else {
            toast.info('No new emails to sync');
          }
        } else {
          toast.error(result.message || 'Email sync failed');
        }
      }

      // Dispatch event for real-time updates
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
      
      if (options.showProgress) {
        toast.dismiss('email-sync');
        toast.error(`Email sync failed: ${error.message}`);
      }

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
    // Set up periodic email sync
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

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('gmail_user_email')
        .eq('user_id', user.id)
        .maybeSingle();

      return !!prefs?.gmail_user_email;
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
      return false;
    }
  }
}