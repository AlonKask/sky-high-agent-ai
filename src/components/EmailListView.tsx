import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Archive, 
  Trash2,
  Paperclip,
  Star,
  StarOff,
  MoreHorizontal,
  Reply,
  Forward,
  Eye,
  EyeOff,
  Mail,
  MailOpen
} from 'lucide-react';
import { useEmailActions } from '@/hooks/useEmailActions';

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
  is_read?: boolean;
  is_starred?: boolean;
  is_archived?: boolean;
  is_deleted?: boolean;
  folder_name?: string;
  clients?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
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
  onEmailsUpdated?: () => void;
  currentFolder?: string;
}

const EmailListView: React.FC<EmailListViewProps> = ({
  emails,
  selectedEmails,
  selectedEmailId,
  onEmailSelect,
  onEmailCheck,
  onSelectAll,
  isLoading,
  searchTerm,
  onSearchChange,
  onEmailsUpdated,
  currentFolder = 'inbox'
}) => {
  const emailActions = useEmailActions();

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

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'failed': return 'destructive';
      case 'sent': return 'default';
      case 'delivered': return 'secondary';
      default: return 'outline';
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
    <div className="h-full border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3 shrink-0">
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
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={emailActions.isLoading}
                onClick={async () => {
                  await emailActions.bulkArchive(selectedEmails);
                  onEmailsUpdated?.();
                }}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive ({selectedEmails.length})
              </Button>
              {currentFolder !== 'sent' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={emailActions.isLoading}
                  onClick={async () => {
                    await emailActions.bulkMarkAsRead(selectedEmails, true);
                    onEmailsUpdated?.();
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Mark Read ({selectedEmails.length})
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                disabled={emailActions.isLoading}
                onClick={async () => {
                  await emailActions.bulkDelete(selectedEmails);
                  onEmailsUpdated?.();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedEmails.length})
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

      {/* Email List - Fixed height with proper scroll */}
      <div className="flex-1">
        <ScrollArea className="h-full max-h-full">
          {emails.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Mail className="h-8 w-8 mx-auto mb-2" />
                <p>No emails found</p>
              </div>
            </div>
          ) : (
            <div className="divide-y h-0 min-h-full">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className={`flex items-center justify-between py-3 px-4 hover:bg-muted/50 cursor-pointer group border-l-4 ${
                    !(email.is_read ?? true) ? 'border-l-primary bg-muted/20 font-medium' : 'border-l-transparent'
                  } ${selectedEmailId === email.id ? 'bg-muted' : ''}`}
                  onClick={() => onEmailSelect(email.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={selectedEmails.includes(email.id)}
                      onCheckedChange={(checked) => 
                        onEmailCheck(email.id, checked as boolean)
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-2">
                      {email.is_starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                      {getDirectionIcon(email.direction)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`text-sm truncate ${!(email.is_read ?? true) ? 'font-semibold' : 'font-medium'}`}>
                            {email.direction === 'inbound' ? email.sender_email : email.recipient_emails?.[0] || 'No recipient'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {email.attachments && Object.keys(email.attachments).length > 0 && (
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Badge variant={getStatusColor(email.status)} className="text-xs">
                            {email.status}
                          </Badge>
                        </div>
                      </div>
                      <div className={`text-sm truncate mt-1 ${!(email.is_read ?? true) ? 'font-semibold' : 'font-medium'}`}>
                        {truncateText(email.subject || 'No Subject', 50)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {truncateText(email.body || 'No content', 80)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(email.created_at)}
                    </div>
                  </div>
                  
                  {/* Quick Actions - Shown on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                       onClick={async () => {
                         await emailActions.toggleStarred(email.id, !(email.is_starred ?? false));
                         onEmailsUpdated?.();
                       }}
                     >
                       {(email.is_starred ?? false) ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                     </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={async () => {
                        await emailActions.archiveEmail(email.id);
                        onEmailsUpdated?.();
                      }}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={async () => {
                           await emailActions.toggleReadStatus(email.id, !(email.is_read ?? true));
                           onEmailsUpdated?.();
                         }}>
                           {(email.is_read ?? true) ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                           Mark as {(email.is_read ?? true) ? 'unread' : 'read'}
                         </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          await emailActions.createReplyDraft(email);
                        }}>
                          <Reply className="h-4 w-4 mr-2" />
                          Reply
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          await emailActions.createForwardDraft(email);
                        }}>
                          <Forward className="h-4 w-4 mr-2" />
                          Forward
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={async () => {
                            await emailActions.deleteEmail(email.id);
                            onEmailsUpdated?.();
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default EmailListView;
