import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Send, RefreshCw, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { config } from "@/lib/config";

// Extend Window interface for Google APIs
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

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

interface EmailManagerProps {
  clientEmail?: string;
  clientId?: string;
  requestId?: string;
}

const EmailManager = ({ clientEmail, clientId, requestId }: EmailManagerProps) => {
  const [emails, setEmails] = useState<EmailExchange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // New email form state
  const [newEmail, setNewEmail] = useState({
    to: clientEmail || '',
    cc: '',
    subject: '',
    body: '',
    emailType: 'general' as const
  });

  const fetchEmails = async () => {
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
        console.error('Error fetching emails:', error);
        toast({
          title: "Error",
          description: "Failed to fetch email history",
          variant: "destructive"
        });
        return;
      }

      setEmails((data || []).map(email => ({
        ...email,
        direction: email.direction as 'inbound' | 'outbound'
      })));
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch email history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncWithGmail = async () => {
    if (!clientEmail) {
      toast({
        title: "Error",
        description: "Client email is required to sync with Gmail",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Initialize Google Auth
      if (!window.google) {
        // Load Google API
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = initializeGoogleAuth;
        document.head.appendChild(script);
      } else {
        initializeGoogleAuth();
      }
    } catch (error) {
      console.error('Error syncing with Gmail:', error);
      toast({
        title: "Error",
        description: "Failed to sync with Gmail",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const initializeGoogleAuth = () => {
    window.gapi.load('auth2', () => {
      const authInstance = window.gapi.auth2.init({
        client_id: config.google.clientId,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        immediate: false
      });

      // Sign in with specific options
      authInstance.signIn({
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        prompt: 'select_account'
      }).then((user: any) => {
        const accessToken = user.getAuthResponse().access_token;
        console.log('Successfully authenticated, access token:', accessToken ? 'received' : 'missing');
        fetchGmailEmails(accessToken);
      }).catch((error: any) => {
        console.error('Google Auth error:', error);
        
        // Handle specific error cases
        if (error?.error === 'popup_closed_by_user') {
          toast({
            title: "Gmail Sync Cancelled",
            description: "You cancelled the Gmail authorization. Please try again and complete the authorization to sync emails.",
            variant: "destructive"
          });
        } else if (error?.error === 'access_denied') {
          toast({
            title: "Access Denied",
            description: "Gmail access was denied. Please grant the necessary permissions to sync emails.",
            variant: "destructive"
          });
        } else if (error?.error === 'popup_blocked') {
          toast({
            title: "Popup Blocked",
            description: "The authentication popup was blocked. Please allow popups for this site and try again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Authentication Error",
            description: `Failed to authenticate with Google: ${error?.error || 'Unknown error'}. Please check your Google OAuth setup.`,
            variant: "destructive"
          });
        }
        setIsLoading(false);
      });
    });
  };

  const fetchGmailEmails = async (accessToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-gmail-emails', {
        body: {
          clientEmail,
          accessToken,
          maxResults: 50
        }
      });

      if (error) {
        console.error('Error fetching Gmail emails:', error);
        toast({
          title: "Error",
          description: "Failed to fetch emails from Gmail",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Synced ${data.emailCount} emails from Gmail`,
      });

      // Refresh the email list
      fetchEmails();

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to sync Gmail emails",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!newEmail.to || !newEmail.subject || !newEmail.body) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: [newEmail.to],
          cc: newEmail.cc ? [newEmail.cc] : undefined,
          subject: newEmail.subject,
          body: newEmail.body.replace(/\n/g, '<br>'),
          clientId,
          requestId,
          emailType: newEmail.emailType
        }
      });

      if (error) {
        console.error('Error sending email:', error);
        toast({
          title: "Error",
          description: "Failed to send email",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Email sent successfully",
      });

      // Reset form and close dialog
      setNewEmail({
        to: clientEmail || '',
        cc: '',
        subject: '',
        body: '',
        emailType: 'general'
      });
      setIsDialogOpen(false);

      // Refresh email list
      fetchEmails();

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [clientId, clientEmail]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDirectionBadge = (direction: string) => {
    return direction === 'inbound' ? (
      <Badge variant="secondary">Received</Badge>
    ) : (
      <Badge variant="default">Sent</Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Communication
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={syncWithGmail}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Gmail
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Compose
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Compose Email</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="to">To *</Label>
                      <Input
                        id="to"
                        value={newEmail.to}
                        onChange={(e) => setNewEmail({ ...newEmail, to: e.target.value })}
                        placeholder="recipient@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cc">CC</Label>
                      <Input
                        id="cc"
                        value={newEmail.cc}
                        onChange={(e) => setNewEmail({ ...newEmail, cc: e.target.value })}
                        placeholder="cc@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={newEmail.subject}
                      onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                      placeholder="Email subject"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emailType">Type</Label>
                    <Select value={newEmail.emailType} onValueChange={(value: any) => setNewEmail({ ...newEmail, emailType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quote">Quote</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="confirmation">Confirmation</SelectItem>
                        <SelectItem value="booking_update">Booking Update</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="body">Message *</Label>
                    <Textarea
                      id="body"
                      value={newEmail.body}
                      onChange={(e) => setNewEmail({ ...newEmail, body: e.target.value })}
                      placeholder="Type your message here..."
                      rows={8}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={sendEmail} disabled={isSending}>
                      <Send className="h-4 w-4 mr-2" />
                      {isSending ? 'Sending...' : 'Send Email'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isLoading ? 'Loading emails...' : 'No email exchanges found'}
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {emails.map((email) => (
                <div key={email.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getDirectionBadge(email.direction)}
                      <Badge variant="outline" className="text-xs">
                        {email.email_type}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(email.created_at)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium">{email.subject}</h4>
                    <p className="text-sm text-muted-foreground">
                      From: {email.sender_email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      To: {email.recipient_emails.join(', ')}
                    </p>
                  </div>
                  <Separator />
                  <div className="text-sm">
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: email.body.length > 200 
                          ? email.body.substring(0, 200) + '...' 
                          : email.body 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailManager;