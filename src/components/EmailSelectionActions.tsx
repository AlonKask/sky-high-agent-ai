import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, 
  Square, 
  Mail, 
  MailOpen, 
  Brain,
  Trash2,
  Archive
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EmailSelectionActionsProps {
  selectedEmails: Set<string>;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onMarkAsRead: () => void;
  onSendToAI: () => void;
  onArchive?: () => void;
  totalEmails: number;
}

export const EmailSelectionActions: React.FC<EmailSelectionActionsProps> = ({
  selectedEmails,
  onSelectAll,
  onDeselectAll,
  onMarkAsRead,
  onSendToAI,
  onArchive,
  totalEmails
}) => {
  const { toast } = useToast();
  const isAllSelected = selectedEmails.size === totalEmails && totalEmails > 0;
  const hasSelection = selectedEmails.size > 0;

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={isAllSelected ? onDeselectAll : onSelectAll}
          className="h-8 w-8 p-0"
        >
          {isAllSelected ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </Button>
        <Badge variant="outline" className="text-xs">
          {selectedEmails.size} selected
        </Badge>
      </div>

      {hasSelection && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAsRead}
            className="h-8 px-2"
          >
            <MailOpen className="h-4 w-4 mr-1" />
            Read
          </Button>
          {onArchive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onArchive}
              className="h-8 px-2"
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSendToAI}
            className="h-8 px-2"
          >
            <Brain className="h-4 w-4 mr-1" />
            AI
          </Button>
        </div>
      )}
    </div>
  );
};