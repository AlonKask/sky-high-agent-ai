import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toastHelpers } from '@/utils/toastHelpers';
import { logger } from "@/utils/logger";
import { useGmailIntegration } from "@/hooks/useGmailIntegration";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen, Mail, RefreshCw } from "lucide-react";
import EmailSidebar from "./EmailSidebar";
import EmailListView from "./EmailListView";
import EmailDetailView from "./EmailDetailView";
import EmailComposer from "./EmailComposer";
import { GmailStatusButton } from "./GmailStatusButton";

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

  // Filter state
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  const { authStatus, triggerSync } = useGmailIntegration();

  // Enhanced email fetching with better error handling
  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('📧 Fetching emails from database...');
      let query = supabase
        .from('email_exchanges')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply client filtering if specified
      if (clientId) {
        console.log(`🎯 Filtering by client ID: ${clientId}`);
        query = query.eq('client_id', clientId);
      } else if (clientEmail) {
        console.log(`📬 Filtering by client email: ${clientEmail}`);
        query = query.or(`sender_email.ilike.%${clientEmail}%,recipient_emails.cs.{${clientEmail}}`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Database error fetching emails:', error);
        logger.error('Error fetching emails:', error);
        toastHelpers.error("Failed to fetch email history", error);
        return;
      }

      const emailCount = data?.length || 0;
      console.log(`✅ Found ${emailCount} emails in database`);

      const formattedEmails = (data || []).map(email => ({
        ...email,
        direction: email.direction as 'inbound' | 'outbound'
      }));

      setAllEmails(formattedEmails);
      
      // If no emails found and Gmail is connected, suggest sync
      if (emailCount === 0 && authStatus.isConnected) {
        console.log('ℹ️ No emails found but Gmail connected - user may need to sync');
      }
      
    } catch (error) {
      console.error('❌ Error fetching emails:', error);
      logger.error('Error:', error);
      toastHelpers.error("Failed to fetch email history", error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, clientEmail, authStatus.isConnected]);

  // Filter and search emails
  const filterEmails = useCallback(() => {
    let filtered = [...allEmails];

    // Apply folder filter
    switch (selectedFolder) {
      case 'inbox':
        filtered = filtered.filter(email => email.direction === 'inbound');
        break;
      case 'sent':
        filtered = filtered.filter(email => email.direction === 'outbound');
        break;
      case 'drafts':
        filtered = filtered.filter(email => email.status === 'draft');
        break;
      case 'archive':
        filtered = filtered.filter(email => email.status === 'archived');
        break;
      case 'trash':
        filtered = filtered.filter(email => email.status === 'deleted');
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

  // Enhanced sync handler with loading state
  const handleSyncEmails = async () => {
    if (!authStatus.isConnected) {
      console.log('❌ Gmail not connected, cannot sync');
      toastHelpers.error("Gmail not connected", "Please connect your Gmail account first");
      return;
    }
    
    console.log('🔄 User triggered email sync');
    try {
      await triggerSync();
      // Refresh will happen automatically via the gmail-sync-complete event
    } catch (error) {
      console.error('❌ Failed to trigger sync:', error);
    }
  };

  // Effects
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails, refreshKey]);

  useEffect(() => {
    filterEmails();
  }, [filterEmails]);

  // Listen for Gmail sync events
  useEffect(() => {
    const handleGmailSync = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('gmail-sync-complete', handleGmailSync);
    
    return () => {
      window.removeEventListener('gmail-sync-complete', handleGmailSync);
    };
  }, []);

  // Auto-sync Gmail every 5 minutes when connected
  useEffect(() => {
    if (!authStatus.isConnected) return;

    const syncInterval = setInterval(() => {
      triggerSync();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(syncInterval);
  }, [authStatus.isConnected, triggerSync]);

  const selectedEmail = emails.find(email => email.id === selectedEmailId) || null;

  return (
    <div className="h-full flex flex-col">
      {/* Toggle Button */}
      <div className="p-2 border-b">
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
                          Your Gmail is connected but no emails have been synced yet.
                        </p>
                        <Button 
                          onClick={handleSyncEmails}
                          className="gap-2"
                          disabled={authStatus.isLoading}
                        >
                          <RefreshCw className={`w-4 h-4 ${authStatus.isLoading ? 'animate-spin' : ''}`} />
                          Sync Emails
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          This will sync your recent Gmail messages
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
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Compose Dialog */}
      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          <EmailComposer
            defaultTo={clientEmail}
            clientId={clientId}
            requestId={requestId}
            onSent={() => {
              setIsComposerOpen(false);
              fetchEmails();
            }}
            onCancel={() => setIsComposerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedEmailInterface;