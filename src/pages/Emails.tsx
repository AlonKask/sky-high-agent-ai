import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  Send, 
  RefreshCw, 
  Plus, 
  Search, 
  Archive, 
  Star, 
  Reply, 
  ReplyAll, 
  Forward, 
  Trash2,
  Settings,
  Paperclip,
  Eye,
  EyeOff,
  Filter,
  SortAsc,
  SortDesc,
  FileText,
  Download,
  AlertCircle
} from 'lucide-react';

// Extend Window interface for Google APIs
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  date: string;
  body: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  labels: string[];
  messageId: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'quote' | 'follow_up' | 'confirmation' | 'booking_update' | 'general';
  created_at: string;
}

const GOOGLE_CLIENT_ID = '871203174190-t2f8sg44gh37nne80saenhajffitpu7n.apps.googleusercontent.com';

const Emails = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // Compose email state
  const [composeEmail, setComposeEmail] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    attachments: [] as File[]
  });

  // Template management state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    body: '',
    type: 'general' as const
  });

  // Gmail authentication
  const authenticateGmail = async () => {
    try {
      setIsLoading(true);
      
      // Load Google Auth library
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        try {
          // @ts-ignore
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify',
            callback: (response: any) => {
              if (response.access_token) {
                setAuthToken(response.access_token);
                setIsAuthenticated(true);
                toast({
                  title: "Connected to Gmail",
                  description: "Successfully authenticated with Gmail",
                });
                fetchEmails(response.access_token);
              } else {
                toast({
                  title: "Authentication Failed", 
                  description: "No access token received",
                  variant: "destructive"
                });
              }
            },
            error_callback: (error: any) => {
              console.error('Google Auth error:', error);
              toast({
                title: "Authentication Failed",
                description: `Failed to authenticate with Gmail: ${error.type || 'Unknown error'}`,
                variant: "destructive"
              });
            }
          });
          
          client.requestAccessToken();
        } catch (error) {
          console.error('Error initializing Google Auth:', error);
          toast({
            title: "Initialization Error",
            description: "Failed to initialize Google authentication",
            variant: "destructive"
          });
        }
      };
      
      script.onerror = () => {
        toast({
          title: "Script Load Error",
          description: "Failed to load Google authentication services",
          variant: "destructive"
        });
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Error",
        description: "Failed to initialize Gmail authentication",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch emails from Gmail
  const fetchEmails = async (token?: string) => {
    const accessToken = token || authToken;
    if (!accessToken) {
      toast({
        title: "Authentication Required",
        description: "Please authenticate with Gmail first",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSyncing(true);
      
      const { data, error } = await supabase.functions.invoke('gmail-integration', {
        body: {
          action: 'fetchEmails',
          accessToken,
          query: searchQuery,
          maxResults: 50,
          labelIds: selectedFolder === 'inbox' ? ['INBOX'] : [selectedFolder.toUpperCase()]
        }
      });

      if (error) {
        throw error;
      }

      setEmails(data.emails || []);
      
      toast({
        title: "Emails Synced",
        description: `Fetched ${data.emails?.length || 0} emails from Gmail`,
      });
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to fetch emails from Gmail. Please try authenticating again.",
        variant: "destructive"
      });
      // Reset auth state on error
      setIsAuthenticated(false);
      setAuthToken(null);
    } finally {
      setIsSyncing(false);
    }
  };

  // Send email
  const sendEmail = async () => {
    if (!authToken) {
      toast({
        title: "Authentication Required",
        description: "Please authenticate with Gmail first",
        variant: "destructive"
      });
      return;
    }

    if (!composeEmail.to || !composeEmail.subject || !composeEmail.body) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (To, Subject, and Message)",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('gmail-integration', {
        body: {
          action: 'sendEmail',
          accessToken: authToken,
          email: composeEmail
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email Sent",
        description: "Your email has been sent successfully",
      });

      // Reset compose form
      setComposeEmail({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        attachments: []
      });
      setIsComposing(false);

      // Refresh emails
      fetchEmails();
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send email. Please check your connection and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load email templates
  const fetchTemplates = async () => {
    try {
      const mockTemplates: EmailTemplate[] = [
        {
          id: '1',
          name: 'Flight Quote',
          subject: 'Your Flight Quote - [Destination]',
          body: `Dear [Client Name],

Thank you for your travel request. Please find your flight quote below:

Route: [Origin] → [Destination]
Departure: [Departure Date]
Return: [Return Date]
Class: [Travel Class]
Passengers: [Passenger Count]

Total Price: $[Total Price]

This quote is valid until [Expiry Date].

Best regards,
[Agent Name]`,
          type: 'quote',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Booking Confirmation',
          subject: 'Booking Confirmed - [Booking Reference]',
          body: `Dear [Client Name],

Your booking has been confirmed! Here are your details:

Booking Reference: [Booking Reference]
Flight: [Flight Details]
Departure: [Departure Info]
Return: [Return Info]

Please arrive at the airport at least 2 hours before domestic flights and 3 hours before international flights.

Have a wonderful trip!

Best regards,
[Agent Name]`,
          type: 'confirmation',
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Follow Up',
          subject: 'Following up on your travel inquiry',
          body: `Dear [Client Name],

I hope this email finds you well. I wanted to follow up on your recent travel inquiry.

[Custom Message]

Please don't hesitate to reach out if you have any questions or if you'd like to proceed with the booking.

Best regards,
[Agent Name]`,
          type: 'follow_up',
          created_at: new Date().toISOString()
        }
      ];
      
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  // Apply template to compose
  const applyTemplate = (template: EmailTemplate) => {
    setComposeEmail(prev => ({
      ...prev,
      subject: template.subject,
      body: template.body
    }));
    setShowTemplateDialog(false);
    toast({
      title: "Template Applied",
      description: `Applied "${template.name}" template to your email`,
    });
  };

  // Email actions
  const markAsRead = async (emailId: string) => {
    if (!authToken) return;
    
    try {
      await supabase.functions.invoke('gmail-integration', {
        body: {
          action: 'markAsRead',
          accessToken: authToken,
          messageId: emailId
        }
      });
      
      setEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, isRead: true } : email
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAsStarred = async (emailId: string) => {
    if (!authToken) return;
    
    try {
      await supabase.functions.invoke('gmail-integration', {
        body: {
          action: 'markAsStarred',
          accessToken: authToken,
          messageId: emailId
        }
      });
      
      setEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, isStarred: !email.isStarred } : email
      ));
    } catch (error) {
      console.error('Error starring email:', error);
    }
  };

  const archiveEmail = async (emailId: string) => {
    if (!authToken) return;
    
    try {
      await supabase.functions.invoke('gmail-integration', {
        body: {
          action: 'archiveEmail',
          accessToken: authToken,
          messageId: emailId
        }
      });
      
      setEmails(prev => prev.filter(email => email.id !== emailId));
      setSelectedEmail(null);
      toast({
        title: "Email Archived",
        description: "Email has been archived",
      });
    } catch (error) {
      console.error('Error archiving email:', error);
    }
  };

  const deleteEmail = async (emailId: string) => {
    if (!authToken) return;
    
    try {
      await supabase.functions.invoke('gmail-integration', {
        body: {
          action: 'deleteEmail',
          accessToken: authToken,
          messageId: emailId
        }
      });
      
      setEmails(prev => prev.filter(email => email.id !== emailId));
      setSelectedEmail(null);
      toast({
        title: "Email Deleted",
        description: "Email has been moved to trash",
      });
    } catch (error) {
      console.error('Error deleting email:', error);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filteredEmails = emails.filter(email => {
    if (searchQuery) {
      return email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
             email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
             email.snippet.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  }).sort((a, b) => {
    const aValue = sortBy === 'date' ? new Date(a.date).getTime() : a[sortBy as keyof GmailMessage];
    const bValue = sortBy === 'date' ? new Date(b.date).getTime() : b[sortBy as keyof GmailMessage];
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Gmail Integration</h1>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {!isAuthenticated ? (
            <div className="space-y-3">
              <Button onClick={authenticateGmail} disabled={isLoading} className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                {isLoading ? 'Connecting...' : 'Connect Gmail'}
              </Button>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Click to authenticate with your Gmail account and access full email functionality.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button onClick={() => setIsComposing(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Compose
              </Button>
              <Button onClick={() => fetchEmails()} disabled={isSyncing} variant="outline" className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync'}
              </Button>
            </div>
          )}

          <Separator />

          {/* Folders */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Folders</Label>
            {['inbox', 'sent', 'drafts', 'spam', 'trash'].map((folder) => (
              <Button
                key={folder}
                variant={selectedFolder === folder ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  setSelectedFolder(folder);
                  if (isAuthenticated) fetchEmails();
                }}
              >
                {folder.charAt(0).toUpperCase() + folder.slice(1)}
              </Button>
            ))}
          </div>

          <Separator />

          {/* Search and Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="subject">Subject</SelectItem>
                  <SelectItem value="from">From</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 flex">
        <div className="w-96 border-r bg-card">
          <div className="p-4 border-b">
            <h2 className="font-semibold">
              {selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1)} ({filteredEmails.length})
            </h2>
          </div>
          <ScrollArea className="h-[calc(100vh-120px)]">
            {filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {!isAuthenticated ? (
                  <div className="space-y-2">
                    <Mail className="h-8 w-8 mx-auto opacity-50" />
                    <p>Connect Gmail to view your emails</p>
                  </div>
                ) : isSyncing ? (
                  <div className="space-y-2">
                    <RefreshCw className="h-8 w-8 mx-auto animate-spin opacity-50" />
                    <p>Loading emails...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Mail className="h-8 w-8 mx-auto opacity-50" />
                    <p>No emails found</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                      selectedEmail?.id === email.id ? 'bg-accent' : ''
                    } ${!email.isRead ? 'bg-muted/50' : ''}`}
                    onClick={() => {
                      setSelectedEmail(email);
                      if (!email.isRead) {
                        markAsRead(email.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm truncate max-w-32 ${!email.isRead ? 'font-semibold' : ''}`}>
                          {email.from.split('<')[0].trim() || email.from}
                        </span>
                        {email.isStarred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                        {email.hasAttachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(email.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={`text-sm mb-1 truncate ${!email.isRead ? 'font-medium' : ''}`}>
                      {email.subject}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {email.snippet}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {email.labels.slice(0, 2).map((label) => (
                        <Badge key={label} variant="outline" className="text-xs">
                          {label.replace('CATEGORY_', '').toLowerCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Email Content */}
        <div className="flex-1 flex flex-col">
          {selectedEmail ? (
            <>
              <div className="p-4 border-b bg-card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold mb-1 pr-4">{selectedEmail.subject}</h2>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="truncate">From: {selectedEmail.from}</p>
                      <p className="truncate">To: {selectedEmail.to.join(', ')}</p>
                      {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                        <p className="truncate">CC: {selectedEmail.cc.join(', ')}</p>
                      )}
                      <p>Date: {new Date(selectedEmail.date).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => markAsStarred(selectedEmail.id)}>
                      <Star className={`h-4 w-4 ${selectedEmail.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setComposeEmail(prev => ({
                          ...prev,
                          to: selectedEmail.from,
                          subject: `Re: ${selectedEmail.subject}`,
                          body: `\n\n--- Original Message ---\nFrom: ${selectedEmail.from}\nDate: ${new Date(selectedEmail.date).toLocaleString()}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.snippet}`
                        }));
                        setIsComposing(true);
                      }}
                    >
                      <Reply className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => archiveEmail(selectedEmail.id)}>
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteEmail(selectedEmail.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.body || selectedEmail.snippet }} />
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select an email to view its content</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={isComposing} onOpenChange={setIsComposing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Compose Email
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateDialog(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Templates
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="to">To *</Label>
                <Input
                  id="to"
                  value={composeEmail.to}
                  onChange={(e) => setComposeEmail(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <Label htmlFor="cc">CC</Label>
                <Input
                  id="cc"
                  value={composeEmail.cc}
                  onChange={(e) => setComposeEmail(prev => ({ ...prev, cc: e.target.value }))}
                  placeholder="cc@example.com"
                />
              </div>
              <div>
                <Label htmlFor="bcc">BCC</Label>
                <Input
                  id="bcc"
                  value={composeEmail.bcc}
                  onChange={(e) => setComposeEmail(prev => ({ ...prev, bcc: e.target.value }))}
                  placeholder="bcc@example.com"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={composeEmail.subject}
                onChange={(e) => setComposeEmail(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label htmlFor="body">Message *</Label>
              <Textarea
                id="body"
                value={composeEmail.body}
                onChange={(e) => setComposeEmail(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Type your message here..."
                rows={15}
              />
            </div>
            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach Files
                </Button>
                <span className="text-xs text-muted-foreground">(Coming soon)</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsComposing(false)}>
                  Cancel
                </Button>
                <Button onClick={sendEmail} disabled={isLoading}>
                  <Send className="h-4 w-4 mr-2" />
                  {isLoading ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Templates</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {templates.map((template) => (
                <div key={template.id} className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{template.name}</h4>
                    <Badge variant="outline">{template.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{template.subject}</p>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => applyTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Emails;