import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useGmailIntegration } from "@/hooks/useGmailIntegration";
import { useEmailActions } from "@/hooks/useEmailActions";
import { toast } from "@/hooks/use-toast";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Mail, 
  RefreshCw, 
  BarChart, 
  Settings,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import EmailSidebar from "./EmailSidebar";
import EmailListView from "./EmailListView";
import EmailDetailView from "./EmailDetailView";
import EnhancedEmailComposer from "./EnhancedEmailComposer";
import { GmailStatusButton } from "./GmailStatusButton";
import { Plus } from "lucide-react";

interface EmailExchange {
  id: string;
  subject: string;
  body: string;
  html_body?: string;
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

interface EnhancedEmailInterfaceProps {
  clientEmail?: string;
  clientId?: string;
  requestId?: string;
}

const EnhancedEmailInterface = ({ 
  clientEmail, 
  clientId, 
  requestId 
}: EnhancedEmailInterfaceProps) => {
  // Core state - Fixed race condition with single ready state
  const [emails, setEmails] = useState<EmailExchange[]>([]);
  const [allEmails, setAllEmails] = useState<EmailExchange[]>([]);
  const [isReady, setIsReady] = useState(false); // Single state to track if data is ready
  const [refreshKey, setRefreshKey] = useState(0);

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDraftId, setComposerDraftId] = useState<string | null>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [requiresReauth, setRequiresReauth] = useState(false);

  // Filter state
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  const { user } = useSimpleAuth();
  const { authStatus, triggerSync } = useGmailIntegration();
  const { createReplyDraft, createForwardDraft, archiveEmail, deleteEmail } = useEmailActions();

  // Enhanced email fetching with atomic filtering
  const fetchEmails = useCallback(async () => {
    if (!user) {
      setAllEmails([]);
      setEmails([]);
      setIsReady(true);
      return;
    }

    setIsReady(false);
    
    try {
      let query = supabase
        .from('email_exchanges')
        .select(`
          id, subject, sender_email, recipient_emails, cc_emails, bcc_emails, 
          body, html_body, direction, status, email_type, attachments, metadata, 
          created_at, updated_at, received_at, message_id, thread_id, client_id,
          is_read, is_starred, is_archived, is_deleted, is_draft, folder_name
        `)
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(1000);

      // Apply client filtering if specified
      if (clientId) {
        query = query.eq('client_id', clientId);
      } else if (clientEmail) {
        query = query.or(`sender_email.ilike.%${clientEmail}%,recipient_emails.cs.{${clientEmail}}`);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Failed to load emails",
          description: error.message || "Could not retrieve your emails. Please try again.",
          variant: "destructive",
        });
        setAllEmails([]);
        setEmails([]);
        setIsReady(true);
        return;
      }

      const formattedEmails = (data || []).map(email => ({
        ...email,
        user_id: user.id,
        clients: null,
        direction: email.direction as 'inbound' | 'outbound'
      }));

      // Set all emails and immediately apply filtering atomically
      setAllEmails(formattedEmails);
      applyFiltering(formattedEmails);
      
    } catch (error: any) {
      toast({
        title: "Failed to load emails",
        description: error.message || "Could not retrieve your emails. Please try again.",
        variant: "destructive",
      });
      setAllEmails([]);
      setEmails([]);
      setIsReady(true);
    }
  }, [user, clientId, clientEmail, authStatus.isConnected]);

  // Apply filtering logic (separated for reuse)
  const applyFiltering = useCallback((emailsToFilter: EmailExchange[]) => {    
    try {
      let filtered = [...emailsToFilter];

      // Apply folder filter with proper null coalescing for boolean fields
      switch (selectedFolder) {
        case 'inbox':
          filtered = filtered.filter(email => 
            (email.is_deleted ?? false) === false && 
            (email.is_archived ?? false) === false && 
            email.direction === 'inbound' && 
            email.folder_name !== 'sent'
          );
          break;
        case 'sent':
          filtered = filtered.filter(email => 
            (email.is_deleted ?? false) === false && 
            (email.is_archived ?? false) === false && 
            (email.direction === 'outbound' || email.folder_name === 'sent')
          );
          break;
        case 'drafts':
          filtered = filtered.filter(email => 
            (email.is_deleted ?? false) === false && 
            (email.is_draft ?? false) === true
          );
          break;
        case 'archive':
          filtered = filtered.filter(email => 
            (email.is_deleted ?? false) === false && 
            (email.is_archived ?? false) === true
          );
          break;
        case 'trash':
          filtered = filtered.filter(email => 
            (email.is_deleted ?? false) === true
          );
          break;
        case 'starred':
          filtered = filtered.filter(email => 
            (email.is_deleted ?? false) === false && 
            (email.is_starred ?? false) === true
          );
          break;
        case 'unread':
          filtered = filtered.filter(email => 
            (email.is_deleted ?? false) === false && 
            (email.is_read ?? true) === false
          );
          break;
      }

      // Apply search filter
      if (listSearchTerm) {
        const searchLower = listSearchTerm.toLowerCase();
        filtered = filtered.filter(email => 
          email.subject.toLowerCase().includes(searchLower) ||
          email.body.toLowerCase().includes(searchLower) ||
          email.sender_email.toLowerCase().includes(searchLower) ||
          email.recipient_emails.some(recipient => 
            recipient.toLowerCase().includes(searchLower)
          )
        );
      }

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let cutoffDate = new Date();
        
        switch (dateFilter) {
          case 'today':
            cutoffDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            cutoffDate.setMonth(now.getMonth() - 3);
            break;
        }
        
        filtered = filtered.filter(email => 
          new Date(email.created_at) >= cutoffDate
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'date_asc':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'date_desc':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'subject':
            return a.subject.localeCompare(b.subject);
          case 'sender':
            return a.sender_email.localeCompare(b.sender_email);
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });

      // Debug logging for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 Filtering Complete - Folder: ${selectedFolder}, Total: ${emailsToFilter.length}, Filtered: ${filtered.length}`);
      }

      // Atomic state update - this completes the entire operation
      setEmails(filtered);
      setIsReady(true);
      
    } catch (error) {
      console.error('Error filtering emails:', error);
      setEmails([]);
      setIsReady(true);
    }
  }, [selectedFolder, listSearchTerm, dateFilter, sortBy]);

  // Email selection handlers
  const handleEmailSelect = (emailId: string) => {
    setSelectedEmailId(emailId);
  };

  const handleEmailCheck = (emailId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmails(prev => [...prev, emailId]);
    } else {
      setSelectedEmails(prev => prev.filter(id => id !== emailId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(emails.map(email => email.id));
    } else {
      setSelectedEmails([]);
    }
  };

  // Reply/Forward handlers
  const handleReply = async () => {
    if (!selectedEmail) return;
    const draftId = await createReplyDraft(selectedEmail);
    if (draftId) {
      setComposerDraftId(draftId);
      setIsComposerOpen(true);
    }
  };

  const handleReplyAll = async () => {
    if (!selectedEmail) return;
    const draftId = await createReplyDraft(selectedEmail);
    if (draftId) {
      setComposerDraftId(draftId);
      setIsComposerOpen(true);
    }
  };

  const handleForward = async () => {
    if (!selectedEmail) return;
    const draftId = await createForwardDraft(selectedEmail);
    if (draftId) {
      setComposerDraftId(draftId);
      setIsComposerOpen(true);
    }
  };

  const handleArchive = async () => {
    if (!selectedEmail) return;
    await archiveEmail(selectedEmail.id);
    setRefreshKey(prev => prev + 1);
  };

  const handleDelete = async () => {
    if (!selectedEmail) return;
    await deleteEmail(selectedEmail.id);
    setRefreshKey(prev => prev + 1);
  };

  // PHASE 3 & 4 FIX: Enhanced auto-sync with comprehensive error handling and user feedback
  const performAutoSync = async () => {
    if (!user?.id || !authStatus.isConnected) return;
    
    const syncLockKey = `email_sync_lock_${user.id}`;
    const existingLock = localStorage.getItem(syncLockKey);
    
    // Reduced sync lock timeout and better cleanup
    if (existingLock) {
      const lockTime = new Date(existingLock).getTime();
      const now = Date.now();
      if (now - lockTime < 15000) { // Reduced to 15 seconds for faster recovery
        console.log('⏳ Sync already in progress, skipping...');
        return;
      }
      // Clear stale lock
      localStorage.removeItem(syncLockKey);
    }
    
    // Set sync lock
    localStorage.setItem(syncLockKey, new Date().toISOString());
    setIsAutoSyncing(true);
    setSyncError(null); // Clear previous errors
    setRequiresReauth(false);
    
    try {
      console.log('📧 Starting comprehensive auto sync...');
      
      const { data, error } = await supabase.functions.invoke('unified-gmail-sync', {
        body: {
          userEmail: user.email,
          userId: user.id,
          syncType: 'comprehensive', // Always use comprehensive for maximum coverage
          maxResults: 500000, // Unlimited for comprehensive sync
          includeHistorical: true,
          enableProgressTracking: false // Disable progress tracking for simpler execution
        }
      });

      if (error) {
        throw error;
      }

      // Enhanced error handling and user feedback
      if (!data || !data.success) {
        const errorMessage = data?.error || data?.message || 'Sync failed with unknown error';
        
        // Check for specific error types
        if (errorMessage.includes('token') || errorMessage.includes('reconnect') || data?.requiresReauth) {
          setRequiresReauth(true);
          setSyncError('Gmail authentication expired. Please reconnect Gmail.');
        } else {
          setSyncError(errorMessage);
        }
        
        throw new Error(errorMessage);
      }

      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem(`last_sync_${user.id}`, now.toISOString());
      
      console.log(`✅ Auto sync completed: ${data?.count || data?.stored || 0} new emails stored`);
      console.log(`📊 Total processed: ${data?.processed || 0}, Total fetched: ${data?.totalFetched || 0}`);
      
      // Clear any previous errors on success
      setSyncError(null);
      setRequiresReauth(false);
      
      // Force refresh emails from database
      setRefreshKey(prev => prev + 1);
      
    } catch (error: any) {
      console.error('❌ Auto sync failed:', error);
      
      // Set error state for UI display
      const errorMessage = error?.message || 'Auto sync failed';
      setSyncError(errorMessage);
      
      // Check if reauth is required
      if (errorMessage.includes('reconnect') || errorMessage.includes('token') || errorMessage.includes('auth') || errorMessage.includes('expired')) {
        setRequiresReauth(true);
        setSyncError('Gmail authentication expired. Please reconnect Gmail.');
        console.error('🔐 Gmail reauth required');
      }
      
    } finally {
      setIsAutoSyncing(false);
      localStorage.removeItem(syncLockKey);
    }
  };

  // Effects - Fixed race condition with single source of truth
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails, refreshKey]);

  // Re-apply filtering when filter criteria change (but only if data exists)
  useEffect(() => {
    if (allEmails.length > 0) {
      applyFiltering(allEmails);
    }
  }, [selectedFolder, listSearchTerm, dateFilter, sortBy, applyFiltering]);

  // Listen for Gmail sync completion to refresh emails
  useEffect(() => {
    const handleSyncComplete = (event: CustomEvent) => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('gmail-sync-complete', handleSyncComplete as EventListener);
    return () => window.removeEventListener('gmail-sync-complete', handleSyncComplete as EventListener);
  }, []);

  // Reasonable auto-sync intervals to prevent duplication
  useEffect(() => {
    if (!authStatus.isConnected || !user?.id) return;
    
    // Much more reasonable sync intervals (5-15 minutes)
    const getAutoSyncInterval = () => {
      if (emails.length === 0) return 5 * 60 * 1000;   // 5 minutes for empty inbox
      if (emails.length < 50) return 10 * 60 * 1000;   // 10 minutes for light users
      return 15 * 60 * 1000; // 15 minutes for regular users
    };

    // Initial sync only if no recent sync
    const lastSync = localStorage.getItem(`last_sync_${user.id}`);
    const lastSyncTime = lastSync ? new Date(lastSync).getTime() : 0;
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTime;
    
    // Only auto-sync if more than 5 minutes since last sync
    if (timeSinceLastSync > 5 * 60 * 1000) {
      performAutoSync();
    }
    
    // Set up interval with reasonable timing
    const interval = setInterval(() => {
      const currentLastSync = localStorage.getItem(`last_sync_${user.id}`);
      const currentLastSyncTime = currentLastSync ? new Date(currentLastSync).getTime() : 0;
      const currentTimeSinceLastSync = Date.now() - currentLastSyncTime;
      
      // Only sync if enough time has passed
      if (currentTimeSinceLastSync > getAutoSyncInterval()) {
        performAutoSync();
      }
    }, getAutoSyncInterval());

    return () => {
      clearInterval(interval);
    };
  }, [authStatus.isConnected, user?.id]);

  // Real-time database listener for immediate updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('email-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_exchanges',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const selectedEmail = emails.find(email => email.id === selectedEmailId) || null;

  return (
    <div className="h-full flex flex-col">
      {/* Header Controls */}
      <div className="p-2 border-b flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="gap-2"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
          {sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
        </Button>
        
        <div className="flex items-center gap-2">
          <GmailStatusButton />
          
          {/* PHASE 4 FIX: Enhanced sync status with error display */}
          <div className="flex items-center gap-2">
            {authStatus.isConnected && isAutoSyncing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="text-xs">Auto-syncing emails...</span>
                </div>
              </div>
            )}
            
            {/* Error display */}
            {syncError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-3 h-3" />
                <span className="text-xs">{syncError.substring(0, 50)}</span>
                {requiresReauth && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="h-6 px-2 text-xs"
                  >
                    Reconnect Gmail
                  </Button>
                )}
              </div>
            )}
            
            {/* Success indicator */}
            {lastSyncTime && !syncError && !isAutoSyncing && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Synced {Math.round((Date.now() - lastSyncTime.getTime()) / 60000)}m ago</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Interface */}
      <div className="flex flex-1">
        {/* Fixed Sidebar */}
        <div className={`border-r transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          <EmailSidebar
            selectedFolder={selectedFolder}
            onFolderSelect={setSelectedFolder}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            onCompose={() => setIsComposerOpen(true)}
            isCollapsed={sidebarCollapsed}
          />
        </div>

        {/* Resizable Email Panels */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Analytics Tab */}
          {selectedFolder === 'analytics' ? (
            <div className="flex-1 p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Email Analytics</h2>
                  <p className="text-muted-foreground">Performance insights and AI-powered recommendations</p>
                </div>
                <div className="text-center py-12">
                  <BarChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
                  <p className="text-muted-foreground">Advanced email analytics and AI insights will be available here.</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Email List */}
              <ResizablePanel defaultSize={50} minSize={30} className="h-full">
                {!isReady ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 p-8 max-w-md mx-auto">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Loading emails...</h3>
                    <p className="text-muted-foreground text-sm">
                      Fetching and processing your emails...
                    </p>
                  </div>
                </div>
              </div>
            ) : emails.length === 0 && allEmails.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 p-8 max-w-md mx-auto">
                  <Mail className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">No emails found</h3>
                    {authStatus.isConnected ? (
                      <div className="space-y-3">
                        <p className="text-muted-foreground text-sm">
                          Your Gmail is connected. Emails sync automatically in real-time.
                        </p>
                        {isAutoSyncing && (
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Syncing your emails...</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          No manual sync needed - emails appear automatically
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-muted-foreground text-sm">
                          Connect your Gmail account to start viewing emails.
                        </p>
                        <GmailStatusButton />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <EmailListView
                emails={emails}
                selectedEmails={selectedEmails}
                selectedEmailId={selectedEmailId}
                onEmailSelect={handleEmailSelect}
                onEmailCheck={handleEmailCheck}
                onSelectAll={handleSelectAll}
                isLoading={!isReady}
                searchTerm={listSearchTerm}
                onSearchChange={setListSearchTerm}
                onEmailsUpdated={() => setRefreshKey(prev => prev + 1)}
                currentFolder={selectedFolder}
              />
            )}
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Email Detail */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <EmailDetailView
              email={selectedEmail}
              clientId={clientId}
              requestId={requestId}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Compose Dialog */}
      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          <EnhancedEmailComposer
            defaultTo={clientEmail}
            clientId={clientId}
            requestId={requestId}
            draftId={composerDraftId}
            onSent={() => {
              setIsComposerOpen(false);
              setComposerDraftId(null);
              setRefreshKey(prev => prev + 1);
            }}
            onCancel={() => {
              setIsComposerOpen(false);
              setComposerDraftId(null);
            }}
            onDraftSaved={(draftId) => {
              setComposerDraftId(draftId);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedEmailInterface;