import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Search, Mail, Inbox, Send, Archive, Trash, Plus } from "lucide-react";

interface Email {
  id: string;
  user_id: string;
  message_id: string;
  thread_id: string;
  subject: string;
  sender_email: string;
  recipient_emails: string[];
  cc_emails?: string[];
  bcc_emails?: string[];
  body: string;
  received_at: string;
  metadata?: any;
  attachments?: any[];
  created_at: string;
  is_read?: boolean; // Computed field from metadata
}

export const SimpleEmails = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('inbox');

  const [emailStats, setEmailStats] = useState({
    total: 0,
    unread: 0,
    sent: 0,
    received: 0
  });

  useEffect(() => {
    if (user) {
      loadEmailsFromDB();
    }
  }, [user, selectedFolder, searchQuery]);

  const loadEmailsFromDB = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Simple query to avoid database issues
      let query = supabase
        .from('email_exchanges')
        .select(`
          id,
          user_id,
          message_id,
          thread_id,
          subject,
          sender_email,
          recipient_emails,
          cc_emails,
          bcc_emails,
          body,
          received_at,
          metadata,
          attachments,
          created_at
        `)
        .eq('user_id', user.id)
        .order('received_at', { ascending: false });

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`subject.ilike.%${searchQuery}%,sender_email.ilike.%${searchQuery}%,body.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(200);
      
      if (error) {
        console.error('Database query error:', error);
        throw error;
      }
      
      // Transform data to match our interface with type safety
      const transformedEmails = (data || []).map(email => ({
        ...email,
        attachments: Array.isArray(email.attachments) ? email.attachments : [],
        is_read: (email.metadata as any)?.isRead || false
      })) as Email[];
      
      setEmails(transformedEmails);
      updateEmailStats(transformedEmails);
      
    } catch (error) {
      console.error('Error loading emails:', error);
      toast({
        title: "Error",
        description: `Failed to load emails: ${error?.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEmailStats = (emailData: Email[]) => {
    const stats = {
      total: emailData.length,
      unread: emailData.filter(e => !e.is_read).length,
      sent: emailData.filter(e => e.sender_email === user?.email).length,
      received: emailData.filter(e => e.sender_email !== user?.email).length
    };
    setEmailStats(stats);
  };

  const markAsRead = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_exchanges')
        .update({ 
          metadata: { ...emails.find(e => e.id === emailId)?.metadata, isRead: true }
        })
        .eq('id', emailId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setEmails(prev => prev.map(email => 
        email.id === emailId ? { 
          ...email, 
          metadata: { ...email.metadata, isRead: true },
          is_read: true
        } : email
      ));
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      markAsRead(email.id);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedEmails.length === 0) {
      toast({
        title: "No emails selected",
        description: "Please select emails to perform bulk actions",
        variant: "destructive"
      });
      return;
    }

    try {
      let updateData: any = {};
      
      switch (action) {
        case 'mark_read':
          updateData = { is_read: true };
          break;
        case 'mark_unread':
          updateData = { is_read: false };
          break;
        case 'archive':
          // This would require additional metadata field handling
          toast({
            title: "Archive functionality",
            description: "Archive functionality would be implemented here"
          });
          return;
        case 'delete':
          toast({
            title: "Delete functionality", 
            description: "Delete functionality would be implemented here"
          });
          return;
        default:
          return;
      }

      const { error } = await supabase
        .from('email_exchanges')
        .update(updateData)
        .in('id', selectedEmails)
        .eq('user_id', user?.id);

      if (error) throw error;

      setEmails(prev => prev.map(email => 
        selectedEmails.includes(email.id) ? { ...email, ...updateData } : email
      ));
      
      setSelectedEmails([]);
      toast({
        title: "Success",
        description: `${selectedEmails.length} emails updated`
      });
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
        variant: "destructive"
      });
    }
  };

  const EmailCard = ({ email }: { email: Email }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        !email.is_read ? 'border-l-4 border-l-primary bg-accent/5' : ''
      } ${selectedEmail?.id === email.id ? 'ring-2 ring-primary' : ''}`}
      onClick={() => handleEmailSelect(email)}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className={`text-sm ${!email.is_read ? 'font-bold' : 'font-medium'}`}>
              {email.subject || '(No Subject)'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              From: {email.sender_email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!email.is_read && (
              <div className="w-2 h-2 bg-primary rounded-full"></div>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(email.received_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {email.body ? email.body.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : 'No content'}
        </p>
        {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            📎 {email.attachments.length} attachment{email.attachments.length !== 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const EmailDetail = ({ email }: { email: Email }) => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{email.subject || '(No Subject)'}</CardTitle>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>From:</strong> {email.sender_email}</p>
          <p><strong>To:</strong> {email.recipient_emails?.join(', ') || 'Unknown'}</p>
          {email.cc_emails && email.cc_emails.length > 0 && (
            <p><strong>CC:</strong> {email.cc_emails.join(', ')}</p>
          )}
          <p><strong>Date:</strong> {new Date(email.received_at).toLocaleString()}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: email.body || '<p>No content available</p>' 
          }}
        />
        {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-semibold mb-2">Attachments ({email.attachments.length})</h4>
            <div className="space-y-2">
              {email.attachments.map((attachment: any, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span>📎</span>
                  <span>{attachment?.filename || `Attachment ${index + 1}`}</span>
                  {attachment?.size && (
                    <span className="text-muted-foreground">({attachment.size} bytes)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading && emails.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Email Center</h1>
        <div className="flex gap-2">
          <Button onClick={loadEmailsFromDB} variant="outline" size="sm">
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{emailStats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{emailStats.unread}</div>
                <div className="text-sm text-muted-foreground">Unread</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{emailStats.sent}</div>
                <div className="text-sm text-muted-foreground">Sent</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{emailStats.received}</div>
                <div className="text-sm text-muted-foreground">Received</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedFolder} onValueChange={setSelectedFolder}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inbox">Inbox</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="archive">Archive</SelectItem>
            <SelectItem value="trash">Trash</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedEmails.length > 0 && (
        <div className="flex gap-2 p-3 bg-accent rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedEmails.length} email{selectedEmails.length !== 1 ? 's' : ''} selected
          </span>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction('mark_read')}>
            Mark Read
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction('mark_unread')}>
            Mark Unread
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction('archive')}>
            Archive
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedEmails([])}>
            Clear
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-96">
        {/* Email List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            {selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1)} 
            ({emails.length})
          </h2>
          {loading && (
            <div className="text-center py-4">
              <LoadingSpinner />
            </div>
          )}
          {emails.length === 0 && !loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No emails found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {emails.map((email) => (
                <EmailCard key={email.id} email={email} />
              ))}
            </div>
          )}
        </div>

        {/* Email Detail */}
        <div>
          {selectedEmail ? (
            <EmailDetail email={selectedEmail} />
          ) : (
            <Card className="h-full">
              <CardContent className="p-8 text-center flex items-center justify-center h-full">
                <div>
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select an email to view its content</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleEmails;