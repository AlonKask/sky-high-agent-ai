import { useState, useEffect } from "react";
import UnifiedEmailRenderer from "./UnifiedEmailRenderer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp, 
  Bot, 
  Mail, 
  Calendar,
  User,
  Reply,
  Paperclip,
  Star,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toastHelpers } from '@/utils/toastHelpers';
import AIReplyGenerator from "./AIReplyGenerator";

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

interface ProcessedEmailContent {
  cleanedBody: string;
  signature: string | null;
  quotedContent: string | null;
  attachments: Array<{
    name: string;
    type: string;
    size?: number;
  }>;
  keyInformation: {
    sender: string;
    summary: string;
    actionItems: string[];
    dates: string[];
    contacts: string[];
    importance: 'low' | 'medium' | 'high';
  };
  readabilityScore: number;
  snippet: string;
}

interface EnhancedEmailCardProps {
  email: EmailExchange;
  isExpanded: boolean;
  onToggleExpand: () => void;
  clientId?: string;
  requestId?: string;
  showThread?: boolean;
  threadEmails?: EmailExchange[];
}

const EnhancedEmailCard = ({ 
  email, 
  isExpanded, 
  onToggleExpand, 
  clientId, 
  requestId,
  showThread = false,
  threadEmails = []
}: EnhancedEmailCardProps) => {
  const [showReplyGenerator, setShowReplyGenerator] = useState(false);
  const [processedContent, setProcessedContent] = useState<ProcessedEmailContent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRawContent, setShowRawContent] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isRead, setIsRead] = useState(true);
  

  // Process email content when expanded
  useEffect(() => {
    if (isExpanded && !processedContent && !isProcessing) {
      processEmailContent();
    }
  }, [isExpanded]);

  const processEmailContent = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-email-content', {
        body: {
          emailContent: email.body,
          subject: email.subject,
          senderEmail: email.sender_email,
          isHtml: email.body.includes('<') && email.body.includes('>')
        }
      });

      if (error) throw error;

      setProcessedContent(data.processedContent);
    } catch (error) {
      console.error('Error processing email content:', error);
      // Fallback to basic content
      setProcessedContent({
        cleanedBody: email.body,
        signature: null,
        quotedContent: null,
        attachments: email.attachments || [],
        keyInformation: {
          sender: email.sender_email,
          summary: email.subject,
          actionItems: [],
          dates: [],
          contacts: [],
          importance: 'medium'
        },
        readabilityScore: 75,
        snippet: email.body.substring(0, 150)
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getImportanceBadge = (importance?: string) => {
    switch (importance) {
      case 'high':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />High</Badge>;
      case 'low':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Low</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><CheckCircle className="h-3 w-3" />Normal</Badge>;
    }
  };

  const getDirectionBadge = (direction: string) => {
    return direction === 'inbound' ? (
      <Badge variant="secondary" className="gap-1">
        <Mail className="h-3 w-3" />
        Received
      </Badge>
    ) : (
      <Badge variant="default" className="gap-1">
        <Reply className="h-3 w-3" />
        Sent
      </Badge>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-success';
      case 'delivered': return 'text-primary';
      case 'read': return 'text-info';
      case 'failed': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const toggleEmailStatus = async (action: 'star' | 'read' | 'archive') => {
    try {
      // Update local state immediately for better UX
      if (action === 'star') {
        setIsStarred(!isStarred);
      } else if (action === 'read') {
        setIsRead(!isRead);
      }

      // Here you would call an API to update the email status
      // For now, just show a toast
      toastHelpers.success(`Email ${action === 'star' ? (isStarred ? 'unstarred' : 'starred') : 
                      action === 'read' ? (isRead ? 'marked as unread' : 'marked as read') : 
                      'archived'}`);
    } catch (error) {
      console.error(`Error updating email ${action}:`, error);
      // Revert local state on error
      if (action === 'star') setIsStarred(!isStarred);
      if (action === 'read') setIsRead(!isRead);
    }
  };

  const displayContent = showRawContent ? email.body : processedContent?.cleanedBody;

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md border-l-4",
      isExpanded ? "ring-2 ring-primary/20 shadow-md" : "",
      !isRead ? "border-l-primary bg-primary/5" : "border-l-transparent",
      processedContent?.keyInformation.importance === 'high' ? "border-r-2 border-r-destructive/50" : "",
      "relative"
    )}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {getDirectionBadge(email.direction)}
                  <Badge variant="outline" className="text-xs">
                    {email.email_type}
                  </Badge>
                  {processedContent && getImportanceBadge(processedContent.keyInformation.importance)}
                  {!isRead && <Badge variant="default" className="text-xs">New</Badge>}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                    <Calendar className="h-3 w-3" />
                    {formatDate(email.created_at)}
                  </div>
                </div>
                
                <div className="flex items-start gap-2 mb-2">
                  <h4 className={cn(
                    "font-medium truncate flex-1",
                    !isRead ? "font-semibold" : ""
                  )}>
                    {email.subject}
                  </h4>
                  {email.attachments && email.attachments.length > 0 && (
                    <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User className="h-3 w-3" />
                  <span className="truncate">From: {email.sender_email}</span>
                </div>
                
                <div className="text-sm text-muted-foreground truncate mb-2">
                  To: {email.recipient_emails.join(', ')}
                </div>

                {/* Show snippet when not expanded */}
                {!isExpanded && processedContent && (
                  <div className="text-sm text-muted-foreground/80 line-clamp-2">
                    {processedContent.snippet}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className={cn("text-xs font-medium", getStatusColor(email.status))}>
                  {email.status}
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4">
            <Separator className="mb-4" />
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleEmailStatus('star')}
                className={cn(isStarred ? "text-yellow-500" : "text-muted-foreground")}
              >
                <Star className={cn("h-4 w-4", isStarred ? "fill-current" : "")} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleEmailStatus('read')}
                className="text-muted-foreground"
              >
                {isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleEmailStatus('archive')}
                className="text-muted-foreground"
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRawContent(!showRawContent)}
                >
                  {showRawContent ? 'Show Processed' : 'Show Raw'}
                </Button>
              </div>
            </div>

            {isProcessing ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Processing email content...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Email Headers */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-foreground">From:</span>
                      <div className="text-muted-foreground">{email.sender_email}</div>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">To:</span>
                      <div className="text-muted-foreground">{email.recipient_emails.join(', ')}</div>
                    </div>
                    {email.cc_emails && email.cc_emails.length > 0 && (
                      <div>
                        <span className="font-medium text-foreground">CC:</span>
                        <div className="text-muted-foreground">{email.cc_emails.join(', ')}</div>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-foreground">Date:</span>
                      <div className="text-muted-foreground">{new Date(email.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Key Information (when processed) */}
                {processedContent && !showRawContent && (
                  <div className="mb-4 p-3 bg-accent/50 rounded-lg">
                    <h5 className="font-medium mb-2 flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      AI-Extracted Information
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Summary:</span>
                        <p className="text-muted-foreground">{processedContent.keyInformation.summary}</p>
                      </div>
                      {processedContent.keyInformation.actionItems.length > 0 && (
                        <div>
                          <span className="font-medium">Action Items:</span>
                          <ul className="text-muted-foreground list-disc list-inside">
                            {processedContent.keyInformation.actionItems.map((item, idx) => (
                              <li key={idx} className="truncate">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {processedContent.keyInformation.dates.length > 0 && (
                        <div>
                          <span className="font-medium">Dates:</span>
                          <div className="text-muted-foreground">
                            {processedContent.keyInformation.dates.join(', ')}
                          </div>
                        </div>
                      )}
                      {processedContent.keyInformation.contacts.length > 0 && (
                        <div>
                          <span className="font-medium">Contacts:</span>
                          <div className="text-muted-foreground">
                            {processedContent.keyInformation.contacts.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Separator className="mb-4" />

                {/* Email Body */}
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium mb-2">Message Content</h5>
                    <ScrollArea className="max-h-96">
                      <UnifiedEmailRenderer 
                        emailBody={displayContent || email.body || ''}
                        subject={email.subject}
                        className="bg-muted/30 rounded-lg p-4 border"
                        enableExtraction={!showRawContent}
                      />
                    </ScrollArea>
                  </div>

                  {/* Signature (when processed and available) */}
                  {processedContent?.signature && !showRawContent && (
                    <div>
                      <h5 className="font-medium mb-2">Signature</h5>
                      <div className="text-sm text-muted-foreground bg-accent/30 rounded-lg p-3 border">
                        {processedContent.signature}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Attachments</h5>
                      <div className="space-y-1">
                        {email.attachments.map((attachment: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/30 rounded p-2">
                            <Paperclip className="h-4 w-4" />
                            <span>{attachment.filename || `Attachment ${index + 1}`}</span>
                            {attachment.size && (
                              <span className="text-xs">({(attachment.size / 1024).toFixed(1)} KB)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {email.direction === 'inbound' && (
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={() => setShowReplyGenerator(true)}
                        className="gap-2"
                        size="sm"
                      >
                        <Bot className="h-4 w-4" />
                        Generate AI Reply
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2"
                      >
                        <Reply className="h-4 w-4" />
                        Manual Reply
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* AI Reply Generator Modal */}
      {showReplyGenerator && (
        <AIReplyGenerator
          originalEmail={email}
          clientId={clientId}
          requestId={requestId}
          isOpen={showReplyGenerator}
          onClose={() => setShowReplyGenerator(false)}
        />
      )}
    </Card>
  );
};

export default EnhancedEmailCard;