import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Send, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGmailIntegration } from "@/hooks/useGmailIntegration";
import { logger } from "@/utils/logger";
import ExpandableEmailCard from "./ExpandableEmailCard";


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
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const { toast } = useToast();
  const { authStatus, triggerSync } = useGmailIntegration();

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
        logger.error('Error fetching emails:', error);
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
      logger.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch email history",
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
        logger.error('Error sending email:', error);
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
      logger.error('Error:', error);
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
  }, [clientId, clientEmail, refreshKey]);

  // Listen for Gmail sync events to refresh email list
  useEffect(() => {
    const handleGmailSync = () => {
      // Gmail sync detected, refreshing email list
      setRefreshKey(prev => prev + 1);
    };

    // Listen for custom events from Gmail integration
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
            <div className="space-y-3">
              {emails.map((email) => (
                <ExpandableEmailCard
                  key={email.id}
                  email={email}
                  isExpanded={expandedEmailId === email.id}
                  onToggleExpand={() => setExpandedEmailId(
                    expandedEmailId === email.id ? null : email.id
                  )}
                  clientId={clientId}
                  requestId={requestId}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailManager;