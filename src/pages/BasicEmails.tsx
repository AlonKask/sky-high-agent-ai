import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, RotateCw, Search, Filter, Plus, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { EmailSyncManager } from "@/utils/emailSync";
import ExpandableEmailCard from "@/components/ExpandableEmailCard";
import { toast } from "sonner";
import { handleError, handleSupabaseError } from "@/utils/globalErrorHandler";

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

const BasicEmails = () => {
  const { user } = useSimpleAuth();
  const [emails, setEmails] = useState<EmailExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [syncing, setSyncing] = useState(false);

  const emailSyncManager = EmailSyncManager.getInstance();

  useEffect(() => {
    if (user) {
      checkGmailConnection();
      loadEmails();
    }
  }, [user]);

  const checkGmailConnection = async () => {
    try {
      const connected = await emailSyncManager.checkGmailConnection();
      setGmailConnected(connected);
    } catch (error) {
      handleError(error, { operation: 'check Gmail connection', component: 'BasicEmails' }, { showToast: false });
      setGmailConnected(false);
    }
  };

  const loadEmails = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_exchanges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEmails((data || []) as EmailExchange[]);
    } catch (error) {
      handleSupabaseError(error, 'load emails');
    } finally {
      setLoading(false);
    }
  };

  const syncEmails = async () => {
    setSyncing(true);
    try {
      const result = await emailSyncManager.syncEmails({ 
        includeAIProcessing: true, 
        showProgress: true 
      });
      
      if (result.success) {
        await loadEmails(); // Reload emails after sync
      }
    } catch (error) {
      handleError(error, { operation: 'sync emails', component: 'BasicEmails' });
    } finally {
      setSyncing(false);
    }
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = !searchTerm || 
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.sender_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.body.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === "all" || 
      (activeTab === "inbox" && email.direction === "inbound") ||
      (activeTab === "sent" && email.direction === "outbound") ||
      (activeTab === "important" && email.email_type === "urgent");

    return matchesSearch && matchesTab;
  });

  if (!gmailConnected) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Emails</h1>
          <Mail className="h-6 w-6 text-muted-foreground" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gmail Connection Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Connect your Gmail account to view and manage emails directly from the CRM.
            </p>
            <Button 
              onClick={() => toast.info("Gmail OAuth integration coming soon")}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Connect Gmail
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Emails</h1>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <Mail className="h-3 w-3" />
            {emails.length} Total
          </Badge>
          <Button 
            onClick={syncEmails}
            disabled={syncing}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RotateCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Compose
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({emails.length})</TabsTrigger>
          <TabsTrigger value="inbox">
            Inbox ({emails.filter(e => e.direction === 'inbound').length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({emails.filter(e => e.direction === 'outbound').length})
          </TabsTrigger>
          <TabsTrigger value="important">
            Important ({emails.filter(e => e.email_type === 'urgent').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center gap-2">
                  <RotateCw className="h-5 w-5 animate-spin" />
                  <span>Loading emails...</span>
                </div>
              </CardContent>
            </Card>
          ) : filteredEmails.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No emails match your search.' : 'No emails found.'}
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={syncEmails}
                    className="mt-4 gap-2"
                    variant="outline"
                  >
                    <RotateCw className="h-4 w-4" />
                    Sync Emails
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredEmails.map((email) => (
                <ExpandableEmailCard
                  key={email.id}
                  email={email}
                  isExpanded={expandedEmail === email.id}
                  onToggleExpand={() => 
                    setExpandedEmail(expandedEmail === email.id ? null : email.id)
                  }
                  clientId={email.client_id}
                  requestId={email.request_id}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BasicEmails;