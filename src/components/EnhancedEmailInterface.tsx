import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useGmailIntegration } from "@/hooks/useGmailIntegration";
import { useEmailActions } from "@/hooks/useEmailActions";
import { toast } from "@/hooks/use-toast";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen, Mail, RefreshCw, BarChart, Settings } from "lucide-react";
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
  // Core state
  const [emails, setEmails] = useState<EmailExchange[]>([]);
  const [allEmails, setAllEmails] = useState<EmailExchange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDraftId, setComposerDraftId] = useState<string | null>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Filter state
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  const { user } = useSimpleAuth();
  const { authStatus, triggerSync } = useGmailIntegration();
  const { createReplyDraft, createForwardDraft, archiveEmail, deleteEmail } = useEmailActions();

  // Enhanced email fetching with better error handling
  const fetchEmails = useCallback(async () => {
    if (!user) {
      console.log('👤 No user authenticated, skipping email fetch');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('📧 Fetching emails from database...');
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
        .limit(1000); // Increased to handle large email volumes

      // Apply client filtering if specified
      if (clientId) {
        console.log(`🎯 Filtering by client ID: ${clientId}`);
        query = query.eq('client_id', clientId);
      } else if (clientEmail) {
        console.log(`📬 Filtering by client email: ${clientEmail}`);
        query = query.or(`sender_email.ilike.%${clientEmail}%,recipient_emails.cs.{${clientEmail}}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Database error fetching emails:', error);
        toast({
          title: "Failed to load emails",
          description: error.message || "Could not retrieve your emails. Please try again.",
          variant: "destructive",
        });
        setAllEmails([]);
        return;
      }

      const emailCount = data?.length || 0;
      console.log(`✅ Found ${emailCount} emails in database`);

      const formattedEmails = (data || []).map(email => ({
        ...email,
        user_id: user.id, // Ensure user_id is present
        // Initialize client data as null - will be populated if needed
        clients: null,
        direction: email.direction as 'inbound' | 'outbound'
      }));

      setAllEmails(formattedEmails);
      
      // If no emails found and Gmail is connected, provide helpful message
      if (emailCount === 0) {
        if (authStatus.isConnected) {
          console.log('ℹ️ No emails found but Gmail connected - user may need to sync');
        } else {
          console.log('ℹ️ No emails found - Gmail not connected');
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching emails:', error);
      toast({
        title: "Failed to load emails",
        description: error.message || "Could not retrieve your emails. Please try again.",
        variant: "destructive",
      });
      setAllEmails([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, clientId, clientEmail, authStatus.isConnected]);

  // Filter and search emails
  const filterEmails = useCallback(() => {
    let filtered = [...allEmails];

    // Apply folder filter - use actual database fields
    switch (selectedFolder) {
      case 'inbox':
        filtered = filtered.filter(email => 
          !email.is_deleted && 
          !email.is_archived && 
          email.direction === 'inbound' && 
          email.folder_name !== 'sent'
        );
        break;
      case 'sent':
        filtered = filtered.filter(email => 
          !email.is_deleted && 
          !email.is_archived && 
          (email.direction === 'outbound' || email.folder_name === 'sent')
        );
        break;
      case 'drafts':
        filtered = filtered.filter(email => 
          !email.is_deleted && 
          email.is_draft === true
        );
        break;
      case 'archive':
        filtered = filtered.filter(email => 
          !email.is_deleted && 
          email.is_archived === true
        );
        break;
      case 'trash':
        filtered = filtered.filter(email => 
          email.is_deleted === true
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

    setEmails(filtered);
  }, [allEmails, selectedFolder, listSearchTerm, dateFilter, sortBy]);

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

  // Auto-sync helper function
  const performAutoSync = async () => {
    if (isAutoSyncing || !authStatus.isConnected) return;
    
    setIsAutoSyncing(true);
    try {
      console.log('🔄 Auto-sync triggered, emails:', emails.length);
      await triggerSync();
      setLastSyncTime(new Date());
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('❌ Auto-sync failed:', error);
    } finally {
      setIsAutoSyncing(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails, refreshKey]);

  useEffect(() => {
    filterEmails();
  }, [filterEmails]);

  // Listen for Gmail sync completion to refresh emails with better feedback
  useEffect(() => {
    const handleSyncComplete = (event: CustomEvent) => {
      console.log('Gmail sync completed, refreshing emails...');
      const emailCount = event.detail?.emailCount || 0;
      
      // Always refresh after sync to show updated emails
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('gmail-sync-complete', handleSyncComplete as EventListener);
    return () => window.removeEventListener('gmail-sync-complete', handleSyncComplete as EventListener);
  }, []);

  // Enhanced real-time auto-sync with adaptive intervals
  useEffect(() => {
    if (!authStatus.isConnected || !user?.id) return;
    
    // More frequent sync intervals for real-time feel
    const getAutoSyncInterval = () => {
      if (emails.length === 0) return 5000;  // 5s for empty inbox
      if (emails.length < 50) return 15000;  // 15s for light users
      return 25000; // 25s for regular users
    };

    // Initial sync
    performAutoSync();
    
    // Set up interval
    const interval = setInterval(performAutoSync, getAutoSyncInterval());
    
    // Sync on window focus for immediate updates
    const handleFocus = () => performAutoSync();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [authStatus.isConnected, user?.id, emails.length]);

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
          console.log('📧 Real-time email update:', payload);
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
          
          {/* Subtle sync status indicator */}
          {authStatus.isConnected && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isAutoSyncing && (
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="text-xs">Syncing...</span>
                </div>
              )}
            </div>
          )}
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
        <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden">
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
              <ResizablePanel defaultSize={50} minSize={30}>
                {emails.length === 0 && !isLoading ? (
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
                isLoading={isLoading}
                searchTerm={listSearchTerm}
                onSearchChange={setListSearchTerm}
                onEmailsUpdated={() => setRefreshKey(prev => prev + 1)}
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