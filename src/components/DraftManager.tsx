import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Clock, Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { formatDistanceToNow } from "date-fns";

interface EmailDraft {
  id: string;
  subject: string;
  body: string;
  recipient_emails: string[];
  cc_emails?: string[];
  bcc_emails?: string[];
  email_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DraftManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onDraftSelect: (draft: EmailDraft) => void;
}

const DraftManager = ({ isOpen, onClose, onDraftSelect }: DraftManagerProps) => {
  const { user } = useSimpleAuth();
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadDrafts();
    }
  }, [isOpen, user]);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_email_drafts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error: any) {
      console.error('Error loading drafts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email drafts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDraftSelect = (draft: EmailDraft) => {
    onDraftSelect(draft);
    onClose();
  };

  const handleDeleteDraft = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setDraftToDelete(draftId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!draftToDelete) return;

    try {
      const { error } = await supabase
        .from('ai_email_drafts')
        .delete()
        .eq('id', draftToDelete);

      if (error) throw error;

      setDrafts(drafts.filter(d => d.id !== draftToDelete));
      toast({
        title: 'Draft deleted',
        description: 'The email draft has been deleted',
      });
    } catch (error: any) {
      console.error('Error deleting draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete draft',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmOpen(false);
      setDraftToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Email Drafts
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading drafts...</div>
              </div>
            ) : drafts.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <div>No drafts found</div>
                  <div className="text-sm">Your email drafts will appear here</div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft) => (
                  <Card 
                    key={draft.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleDraftSelect(draft)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium line-clamp-1">
                            {draft.subject || 'Untitled Draft'}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            To: {draft.recipient_emails.join(', ')}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteDraft(draft.id, e)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {draft.email_type.replace('_', ' ')}
                        </Badge>
                        {draft.cc_emails && draft.cc_emails.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            +{draft.cc_emails.length} CC
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {draft.body.substring(0, 150)}...
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {drafts.length} draft{drafts.length !== 1 ? 's' : ''} found
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DraftManager;