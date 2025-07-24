import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  RefreshCw, 
  Inbox, 
  Send, 
  FileText, 
  Trash2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Archive,
  Filter,
  SortAsc,
  SortDesc,
  Mail,
  MailOpen
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface EmailExchange {
  id: string;
  message_id: string;
  user_id: string;
  client_id: string;
  subject: string;
  sender_email: string;
  recipient_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  body: string;
  received_at: string;
  sent_at: string | null;
  direction: string;
  email_type: string;
  metadata: any;
  attachments: any;
  created_at: string;
  updated_at: string;
}

const Emails = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Core state
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Filter and sorting state
  const [sortBy, setSortBy] = useState<'received_at' | 'subject' | 'sender_email'>('received_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Email statistics
  const [emailStats, setEmailStats] = useState({
    total: 0,
    unread: 0,
    sent: 0,
    received: 0
  });

  // Load emails from database
  const loadEmailsFromDB = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('email_exchanges')
        .select('*')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false });

      // Apply folder filter
      if (selectedFolder === 'sent') {
        query = query.eq('direction', 'outbound');
      } else if (selectedFolder === 'inbox') {
        query = query.eq('direction', 'inbound');
      }

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`subject.ilike.%${searchQuery}%,sender_email.ilike.%${searchQuery}%,body.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      setEmails(data || []);
      updateEmailStats(data || []);
      
    } catch (error) {
      console.error('Error loading emails:', error);
      toast({
        title: "Error",
        description: "Failed to load emails",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Update email statistics
  const updateEmailStats = (emailList: any[]) => {
    setEmailStats({
      total: emailList.length,
      unread: emailList.filter(email => !email.metadata?.isRead).length,
      sent: emailList.filter(email => email.direction === 'outbound').length,
      received: emailList.filter(email => email.direction === 'inbound').length
    });
  };

  // Mark email as read
  const markEmailAsRead = async (emailId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('email_exchanges')
        .update({ 
          metadata: { isRead: true },
          updated_at: new Date().toISOString()
        })
        .eq('id', emailId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Update local state
      setEmails(prevEmails => 
        prevEmails.map(email => 
          email.id === emailId 
            ? { ...email, metadata: { ...email.metadata, isRead: true } }
            : email
        )
      );
      
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  // Handle email selection
  const handleEmailSelect = (email: any) => {
    setSelectedEmail(email);
    if (!email.metadata?.isRead) {
      markEmailAsRead(email.id);
    }
  };

  // Handle bulk email selection
  const handleBulkSelect = (emailId: string, selected: boolean) => {
    setSelectedEmails(prev => 
      selected 
        ? [...prev, emailId]
        : prev.filter(id => id !== emailId)
    );
  };

  // Archive selected emails
  const handleArchiveEmails = async (emailIds: string[]) => {
    if (!user || emailIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('email_exchanges')
        .update({ 
          metadata: { archived: true },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .in('id', emailIds);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Archived ${emailIds.length} email(s)`,
      });
      
      setSelectedEmails([]);
      await loadEmailsFromDB();
      
    } catch (error) {
      console.error('Archive error:', error);
      toast({
        title: "Error",
        description: "Failed to archive emails",
        variant: "destructive"
      });
    }
  };

  // Sync emails (placeholder - implement with your email sync logic)
  const syncEmails = async () => {
    setSyncing(true);
    try {
      toast({
        title: "Sync Started",
        description: "Email sync functionality needs to be implemented",
      });
      
      // TODO: Implement actual email sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await loadEmailsFromDB();
      
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync emails",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  // Folder definitions
  const folders = [
    { id: 'inbox', name: 'Inbox', icon: Inbox },
    { id: 'sent', name: 'Sent', icon: Send },
    { id: 'drafts', name: 'Drafts', icon: FileText },
    { id: 'archived', name: 'Archived', icon: Archive },
    { id: 'trash', name: 'Trash', icon: Trash2 }
  ];

  // Filter and sort emails
  const filteredEmails = emails
    .filter(email => {
      // Archive filter
      if (selectedFolder === 'archived') {
        return email.metadata?.archived;
      } else if (selectedFolder !== 'all') {
        return !email.metadata?.archived;
      }
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return email.subject.toLowerCase().includes(query) ||
               email.sender_email.toLowerCase().includes(query) ||
               email.body.toLowerCase().includes(query);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'received_at') {
        const aTime = new Date(a.received_at).getTime();
        const bTime = new Date(b.received_at).getTime();
        return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
      }
      
      const aValue = a[sortBy] as string;
      const bValue = b[sortBy] as string;
      
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Load emails on component mount and dependencies change
  useEffect(() => {
    if (user) {
      loadEmailsFromDB();
    }
  }, [user, selectedFolder, searchQuery]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'w-12' : 'w-64'} border-r bg-card relative flex-shrink-0`}>
        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border bg-background shadow-md"
        >
          {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <Mail className="h-6 w-6 text-primary" />
            {!isSidebarCollapsed && <h1 className="text-xl font-bold">Emails</h1>}
          </div>

          {/* Sync Button */}
          <Button
            onClick={syncEmails}
            disabled={syncing}
            className={`w-full mb-4 ${isSidebarCollapsed ? 'px-2' : ''}`}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''} ${!isSidebarCollapsed ? 'mr-2' : ''}`} />
            {!isSidebarCollapsed && (syncing ? 'Syncing...' : 'Sync')}
          </Button>

          {/* Folders */}
          <div className="space-y-1">
            {folders.map(folder => {
              const Icon = folder.icon;
              const count = emails.filter(email => {
                if (folder.id === 'inbox') return email.direction === 'inbound' && !email.metadata?.archived;
                if (folder.id === 'sent') return email.direction === 'outbound' && !email.metadata?.archived;
                if (folder.id === 'archived') return email.metadata?.archived;
                return false;
              }).length;

              return (
                <Button
                  key={folder.id}
                  variant={selectedFolder === folder.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedFolder(folder.id)}
                >
                  <Icon className={`h-4 w-4 ${!isSidebarCollapsed ? 'mr-2' : ''}`} />
                  {!isSidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{folder.name}</span>
                      {count > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {count}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Email Stats */}
          {!isSidebarCollapsed && (
            <div className="mt-6 p-3 bg-muted rounded-lg">
              <h3 className="text-sm font-medium mb-2">Statistics</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>{emailStats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unread:</span>
                  <span>{emailStats.unread}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sent:</span>
                  <span>{emailStats.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span>Received:</span>
                  <span>{emailStats.received}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Email List */}
        <div className="w-1/3 border-r bg-card overflow-hidden flex flex-col">
          {/* Search and Controls */}
          <div className="p-4 border-b space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'received_at' | 'subject' | 'sender_email')}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="received_at">Date</option>
                <option value="subject">Subject</option>
                <option value="sender_email">From</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>

            {/* Selection Actions */}
            {selectedEmails.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchiveEmails(selectedEmails)}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive ({selectedEmails.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmails([])}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>

          {/* Email List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading emails...</p>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No emails found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredEmails.map((email) => (
                    <Card
                      key={email.id}
                      className={`cursor-pointer transition-colors hover:bg-accent ${
                        selectedEmail?.id === email.id ? 'bg-accent' : ''
                      } ${!email.metadata?.isRead ? 'border-l-4 border-l-primary' : ''}`}
                      onClick={() => handleEmailSelect(email)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedEmails.includes(email.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleBulkSelect(email.id, e.target.checked);
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-sm truncate ${!email.metadata?.isRead ? 'font-semibold' : ''}`}>
                                {email.sender_email}
                              </p>
                              <div className="flex items-center gap-1">
                                {email.direction === 'outbound' && <Send className="h-3 w-3 text-blue-500" />}
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(email.received_at), 'MMM d')}
                                </span>
                              </div>
                            </div>
                            <p className={`text-sm mb-1 truncate ${!email.metadata?.isRead ? 'font-medium' : ''}`}>
                              {email.subject}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {email.body.substring(0, 100)}...
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-hidden">
          {selectedEmail ? (
            <div className="h-full flex flex-col">
              {/* Email Header */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold">{selectedEmail.subject}</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchiveEmails([selectedEmail.id])}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>From: {selectedEmail.sender_email}</div>
                  <div>To: {selectedEmail.recipient_emails.join(', ')}</div>
                  <div>Date: {format(new Date(selectedEmail.received_at), 'PPP p')}</div>
                </div>
              </div>
              
              {/* Email Body */}
              <ScrollArea className="flex-1 p-4">
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MailOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No email selected</h3>
                <p className="text-sm text-muted-foreground">
                  Select an email from the list to view its content
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Emails;