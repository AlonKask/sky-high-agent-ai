import { useState } from "react";
import { SafeHtmlRenderer } from "@/components/SafeHtmlRenderer";
import RichEmailRenderer from "@/components/RichEmailRenderer/RichEmailRenderer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp, 
  Bot, 
  Mail, 
  Calendar,
  User,
  Reply,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
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

interface ExpandableEmailCardProps {
  email: EmailExchange;
  isExpanded: boolean;
  onToggleExpand: () => void;
  clientId?: string;
  requestId?: string;
}

const ExpandableEmailCard = ({ 
  email, 
  isExpanded, 
  onToggleExpand, 
  clientId, 
  requestId 
}: ExpandableEmailCardProps) => {
  const [showReplyGenerator, setShowReplyGenerator] = useState(false);
  const [useRichRenderer, setUseRichRenderer] = useState(true);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
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
    // Basic HTML sanitization and formatting
    if (!body) return 'No content';
    
    // If it's already HTML, return as is (with safety checks)
    if (body.includes('<') && body.includes('>')) {
      return body;
    }
    
    // Convert plain text to HTML
    return body
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  };

  const { date, time } = formatDate(email.created_at);

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md border",
      isExpanded ? "ring-2 ring-primary/20 shadow-md" : ""
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
                  <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                    <Calendar className="h-3 w-3" />
                    {date} {time}
                  </div>
                </div>
                <h4 className="font-medium truncate mb-1">{email.subject}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="truncate">From: {email.sender_email}</span>
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  To: {email.recipient_emails.join(', ')}
                </div>
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
                  <div className="text-muted-foreground">{formatDate(email.created_at).date} at {formatDate(email.created_at).time}</div>
                </div>
              </div>
              
              {email.message_id && (
                <div>
                  <span className="font-medium text-foreground">Message ID:</span>
                  <div className="text-xs text-muted-foreground font-mono">{email.message_id}</div>
                </div>
              )}
            </div>

            <Separator className="mb-4" />

            {/* Email Body */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-medium">Message Content</h5>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseRichRenderer(!useRichRenderer)}
                  className="gap-2"
                >
                  {useRichRenderer ? (
                    <>
                      <FileText className="h-4 w-4" />
                      Show Basic
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Show Rich
                    </>
                  )}
                </Button>
              </div>
              
              {useRichRenderer ? (
                <RichEmailRenderer 
                  emailBody={email.body}
                  subject={email.subject}
                  showRawContent={false}
                  onToggleRaw={() => setUseRichRenderer(false)}
                />
              ) : (
                <SafeHtmlRenderer 
                  html={formatEmailBody(email.body)}
                  className="prose prose-sm max-w-none bg-muted/30 rounded-lg p-4 border"
                  type="email"
                />
              )}

              {/* Attachments */}
              {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Attachments</h5>
                  <div className="space-y-1">
                    {email.attachments.map((attachment: any, index: number) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        📎 {attachment.filename || `Attachment ${index + 1}`}
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

export default ExpandableEmailCard;