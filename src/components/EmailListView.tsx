import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Mail, 
  MailOpen, 
  Star, 
  Archive, 
  Trash2, 
  MoreHorizontal,
  User,
  Calendar,
  Paperclip,
  Flag,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface EmailListViewProps {
  emails: EmailExchange[];
  selectedEmails: string[];
  selectedEmailId: string | null;
  onEmailSelect: (emailId: string) => void;
  onEmailCheck: (emailId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (search: string) => void;
}

const EmailListView = ({
  emails,
  selectedEmails,
  selectedEmailId,
  onEmailSelect,
  onEmailCheck,
  onSelectAll,
  isLoading,
  searchTerm,
  onSearchChange
}: EmailListViewProps) => {
  const [hoveredEmailId, setHoveredEmailId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'inbound' ? (
      <Mail className="h-4 w-4 text-blue-500" />
    ) : (
      <MailOpen className="h-4 w-4 text-green-500" />
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

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const allSelected = emails.length > 0 && selectedEmails.length === emails.length;
  const someSelected = selectedEmails.length > 0 && selectedEmails.length < emails.length;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center border-r">
        <div className="text-center text-muted-foreground">
          <Mail className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p>Loading emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
            className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
            {...(someSelected ? { "data-state": "indeterminate" } : {})}
          />
          <span className="text-sm text-muted-foreground">
            {selectedEmails.length > 0 ? `${selectedEmails.length} selected` : `${emails.length} emails`}
          </span>
          
          {selectedEmails.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Button variant="ghost" size="sm" title="Archive">
                <Archive className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" title="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" title="More">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search in current view..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Email List */}
      <ScrollArea className="flex-1">
        {emails.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Mail className="h-8 w-8 mx-auto mb-2" />
              <p>No emails found</p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {emails.map((email) => (
              <div
                key={email.id}
                className={cn(
                  "p-3 cursor-pointer hover:bg-accent/50 transition-colors relative",
                  selectedEmailId === email.id && "bg-accent border-r-2 border-r-primary",
                  selectedEmails.includes(email.id) && "bg-muted/50"
                )}
                onClick={() => onEmailSelect(email.id)}
                onMouseEnter={() => setHoveredEmailId(email.id)}
                onMouseLeave={() => setHoveredEmailId(null)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedEmails.includes(email.id)}
                    onCheckedChange={(checked) => onEmailCheck(email.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* First Line: Sender/Direction + Time */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getDirectionIcon(email.direction)}
                        <span className="font-medium text-sm truncate">
                          {email.direction === 'inbound' ? email.sender_email : 'To: ' + email.recipient_emails[0]}
                        </span>
                        {email.direction === 'outbound' && email.recipient_emails.length > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            +{email.recipient_emails.length - 1}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
                          <Paperclip className="h-3 w-3" />
                        )}
                        <span>{formatDate(email.created_at)}</span>
                      </div>
                    </div>

                    {/* Second Line: Subject */}
                    <div className="font-medium text-sm truncate text-foreground">
                      {email.subject || '(No Subject)'}
                    </div>

                    {/* Third Line: Preview + Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {truncateText(email.body?.replace(/<[^>]*>/g, '') || 'No content', 60)}
                      </p>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {email.email_type}
                        </Badge>
                        <div className={cn("text-xs", getStatusColor(email.status))}>
                          {email.status}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Actions */}
                {hoveredEmailId === email.id && (
                  <div className="absolute right-2 top-2 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded p-1 shadow-sm">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Star">
                      <Star className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Archive">
                      <Archive className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default EmailListView;