import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Reply, 
  ReplyAll, 
  Forward, 
  Archive, 
  Trash2, 
  Star,
  MoreHorizontal,
  Mail,
  Calendar,
  User,
  Bot,
  FileText,
  Sparkles,
  Paperclip,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SafeHtmlRenderer } from "@/components/SafeHtmlRenderer";
import RichEmailRenderer from "@/components/RichEmailRenderer/RichEmailRenderer";
import EnhancedEmailRenderer from "@/components/EnhancedEmailRenderer";
import AIReplyGenerator from "./AIReplyGenerator";

interface EmailExchange {
  id: string;
  subject: string;
  body: string;
  html_body?: string;  // Add HTML body field
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

interface EmailDetailViewProps {
  email: EmailExchange | null;
  clientId?: string;
  requestId?: string;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

  const EmailDetailView = ({
  email,
  clientId,
  requestId,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete
}: EmailDetailViewProps) => {
  const [showReplyGenerator, setShowReplyGenerator] = useState(false);
  const [renderMode, setRenderMode] = useState<'enhanced' | 'rich' | 'safe'>('enhanced');

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Email Selected</h3>
          <p className="text-sm">Select an email from the list to view its contents</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
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

  const formatEmailBody = (body: string) => {
    if (!body) return 'No content';
    
    if (body.includes('<') && body.includes('>')) {
      return body;
    }
    
    return body
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  };

  const { date, time } = formatDate(email.created_at);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {getDirectionBadge(email.direction)}
              <Badge variant="outline" className="text-xs">
                {email.email_type}
              </Badge>
              <div className={cn("text-xs font-medium", getStatusColor(email.status))}>
                {email.status}
              </div>
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {email.subject || '(No Subject)'}
            </h1>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" title="Star">
              <Star className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Archive" onClick={onArchive}>
              <Archive className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Delete" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title="More">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Email Meta Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">From:</span>
              <span className="text-muted-foreground">{email.sender_email}</span>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="font-medium">To:</span>
              <div className="text-muted-foreground">
                {email.recipient_emails.join(', ')}
              </div>
            </div>
            {email.cc_emails && email.cc_emails.length > 0 && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="font-medium">CC:</span>
                <div className="text-muted-foreground">
                  {email.cc_emails.join(', ')}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Date:</span>
              <span className="text-muted-foreground">{date}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-medium text-foreground">Time:</span>
              <span>{time}</span>
            </div>
            {email.message_id && (
              <div className="flex items-start gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="font-medium">Message ID:</span>
                <span className="text-xs font-mono text-muted-foreground break-all">
                  {email.message_id}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Reply Actions */}
        <div className="flex items-center gap-2">
          <Button onClick={onReply} className="gap-2" size="sm">
            <Reply className="h-4 w-4" />
            Reply
          </Button>
          {email.direction === 'inbound' && (
            <Button 
              onClick={() => setShowReplyGenerator(true)}
              variant="outline" 
              className="gap-2" 
              size="sm"
            >
              <Bot className="h-4 w-4" />
              AI Reply
            </Button>
          )}
          <Button onClick={onReplyAll} variant="outline" className="gap-2" size="sm">
            <ReplyAll className="h-4 w-4" />
            Reply All
          </Button>
          <Button onClick={onForward} variant="outline" className="gap-2" size="sm">
            <Forward className="h-4 w-4" />
            Forward
          </Button>
        </div>
      </div>

      {/* Email Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Attachments */}
          {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="h-4 w-4" />
                <span className="font-medium text-sm">
                  {email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {email.attachments.map((attachment: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-background rounded border">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate">
                      {attachment.filename || `Attachment ${index + 1}`}
                    </span>
                    {attachment.size && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {Math.round(attachment.size / 1024)}KB
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Body */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Message Content</h3>
              <div className="flex items-center gap-2">
                {email.html_body && (
                  <Badge variant="secondary" className="text-xs">
                    Rich HTML Available
                  </Badge>
                )}
                <Button
                  variant={renderMode === 'enhanced' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRenderMode('enhanced')}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Enhanced
                </Button>
                <Button
                  variant={renderMode === 'rich' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRenderMode('rich')}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Rich
                </Button>
                <Button
                  variant={renderMode === 'safe' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRenderMode('safe')}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Basic
                </Button>
              </div>
            </div>

            <Separator />
            
            <div className="min-h-[200px]">
              {renderMode === 'enhanced' ? (
                <EnhancedEmailRenderer
                  htmlContent={email.html_body}
                  textContent={email.body}
                  subject={email.subject}
                  showToggle={false}
                  defaultView={email.html_body ? 'html' : 'text'}
                />
              ) : renderMode === 'rich' ? (
                <RichEmailRenderer 
                  emailBody={email.body}
                  subject={email.subject}
                  showRawContent={false}
                />
              ) : (
                <SafeHtmlRenderer 
                  html={formatEmailBody(email.body)}
                  className="prose prose-sm max-w-none"
                  type="email"
                />
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

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
    </div>
  );
};

export default EmailDetailView;