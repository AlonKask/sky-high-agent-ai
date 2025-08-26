import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toastHelpers } from '@/utils/toastHelpers';
import { logger } from "@/utils/logger";
import { useGmailIntegration } from "@/hooks/useGmailIntegration";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import EmailSidebar from "./EmailSidebar";
import EmailListView from "./EmailListView";
import EmailDetailView from "./EmailDetailView";
import EmailComposer from "./EmailComposer";

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

  // Fetch emails from database
  const fetchEmails = useCallback(async () => {
    if (!clientId && !clientEmail) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('email_exchanges')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      } else if (clientEmail) {
        query = query.or(`sender_email.ilike.%${clientEmail}%,recipient_emails.cs.{${clientEmail}}`);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching emails:', error);
        toastHelpers.error("Failed to fetch email history", error);
        return;
      }

      const formattedEmails = (data || []).map(email => ({
        ...email,
        direction: email.direction as 'inbound' | 'outbound'
      }));

      setAllEmails(formattedEmails);
    } catch (error) {
      logger.error('Error:', error);
      toastHelpers.error("Failed to fetch email history", error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, clientEmail]);

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