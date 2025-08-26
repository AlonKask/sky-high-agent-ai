import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, X, Paperclip, Bot, Save, FileText, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";

interface EnhancedEmailComposerProps {
  defaultTo?: string;
  clientId?: string;
  requestId?: string;
  draftId?: string | null;
  templateId?: string | null;
  onSent: () => void;
  onCancel: () => void;
  onDraftSaved?: (draftId: string) => void;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  email_type: string;
}

const EnhancedEmailComposer = ({
  defaultTo = '',
  clientId,
  requestId,
  draftId = null,
  templateId = null,
  onSent,
  onCancel,
  onDraftSaved
}: EnhancedEmailComposerProps) => {
  const { user } = useSimpleAuth();
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  
  const [email, setEmail] = useState({
    to: defaultTo,
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    emailType: 'general' as 'quote' | 'follow_up' | 'confirmation' | 'booking_update' | 'general'
  });

  // Load draft or template on mount
  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    } else if (templateId) {
      loadTemplate(templateId);
    }
  }, [draftId, templateId]);

  // Load templates
  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!email.subject && !email.body) return;
    
    const interval = setInterval(() => {
      if (email.subject || email.body) {
        saveDraft(true); // silent save
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [email]);

  const loadDraft = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('email_drafts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setEmail({
        to: data.recipient_emails.join(', '),
        cc: data.cc_emails?.join(', ') || '',
        bcc: data.bcc_emails?.join(', ') || '',
        subject: data.subject,
        body: data.body,
        emailType: data.email_type as 'quote' | 'follow_up' | 'confirmation' | 'booking_update' | 'general'
      });
    } catch (error: any) {
      console.error('Error loading draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to load draft',
        variant: 'destructive',
      });
    }
  };

  const loadTemplate = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setEmail(prev => ({
        ...prev,
        subject: data.subject,
        body: data.body,
        emailType: data.email_type as 'quote' | 'follow_up' | 'confirmation' | 'booking_update' | 'general'
      }));

      // Update usage count
      await supabase
        .from('email_templates')
        .update({ usage_count: data.usage_count + 1 })
        .eq('id', id);
        
    } catch (error: any) {
      console.error('Error loading template:', error);
      toast({
        title: 'Error',
        description: 'Failed to load template',
        variant: 'destructive',
      });
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading templates:', error);
    }
  };

  const saveDraft = async (silent = false) => {
    if (!user || (!email.subject && !email.body)) return;

    setIsSavingDraft(true);
    try {
      const draftData = {
        user_id: user.id,
        client_id: clientId || null,
        request_id: requestId || null,
        subject: email.subject,
        body: email.body,
        recipient_emails: email.to ? email.to.split(',').map(e => e.trim()) : [],
        cc_emails: email.cc ? email.cc.split(',').map(e => e.trim()) : [],
        bcc_emails: email.bcc ? email.bcc.split(',').map(e => e.trim()) : [],
        email_type: email.emailType
      };

      let result;
      if (draftId) {
        result = await supabase
          .from('email_drafts')
          .update(draftData)
          .eq('id', draftId)
          .select('id')
          .single();
      } else {
        result = await supabase
          .from('email_drafts')
          .insert(draftData)
          .select('id')
          .single();
      }

      if (result.error) throw result.error;

      if (!silent) {
        toast({
          title: 'Draft saved',
          description: 'Your email draft has been saved',
        });
      }

      if (!draftId && result.data) {
        onDraftSaved?.(result.data.id);
      }

    } catch (error: any) {
      console.error('Error saving draft:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to save draft',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSend = async () => {
    if (!email.to || !email.subject || !email.body) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in recipient, subject, and message',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email.to.split(',').map(e => e.trim()),
          cc: email.cc ? email.cc.split(',').map(e => e.trim()) : undefined,
          bcc: email.bcc ? email.bcc.split(',').map(e => e.trim()) : undefined,
          subject: email.subject,
          body: email.body.replace(/\n/g, '<br>'),
          clientId,
          requestId,
          emailType: email.emailType
        }
      });

      if (error) throw error;

      // Delete draft after successful send
      if (draftId) {
        await supabase
          .from('email_drafts')
          .delete()
          .eq('id', draftId);
      }

      toast({
        title: 'Email sent',
        description: 'Your email has been sent successfully',
      });
      
      onSent();

    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!user || !email.subject || !email.body) {
      toast({
        title: 'Missing content',
        description: 'Please add subject and body before saving as template',
        variant: 'destructive',
      });
      return;
    }

    const templateName = prompt('Enter a name for this template:');
    if (!templateName) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .insert({
          user_id: user.id,
          name: templateName,
          subject: email.subject,
          body: email.body,
          email_type: email.emailType
        });

      if (error) throw error;

      toast({
        title: 'Template saved',
        description: `Template "${templateName}" has been saved`,
      });
      
      loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 max-h-[80vh] overflow-hidden flex flex-col">
      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Templates</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-3 hover:bg-muted cursor-pointer"
                  onClick={() => {
                    setEmail(prev => ({
                      ...prev,
                      subject: template.subject,
                      body: template.body,
                      emailType: template.email_type as 'quote' | 'follow_up' | 'confirmation' | 'booking_update' | 'general'
                    }));
                    setShowTemplates(false);
                  }}
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{template.subject}</div>
                  <Badge variant="outline" className="mt-1">{template.email_type}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-medium">To:</Label>
              <div className="text-sm">{email.to}</div>
            </div>
            {email.cc && (
              <div>
                <Label className="font-medium">CC:</Label>
                <div className="text-sm">{email.cc}</div>
              </div>
            )}
            <div>
              <Label className="font-medium">Subject:</Label>
              <div className="text-sm font-medium">{email.subject}</div>
            </div>
            <div>
              <Label className="font-medium">Message:</Label>
              <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                {email.body}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Recipients */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="to">To *</Label>
            <Input
              id="to"
              value={email.to}
              onChange={(e) => setEmail({ ...email, to: e.target.value })}
              placeholder="recipient@example.com"
            />
          </div>
          <div>
            <Label htmlFor="cc">CC</Label>
            <Input
              id="cc"
              value={email.cc}
              onChange={(e) => setEmail({ ...email, cc: e.target.value })}
              placeholder="cc@example.com"
            />
          </div>
          <div>
            <Label htmlFor="bcc">BCC</Label>
            <Input
              id="bcc"
              value={email.bcc}
              onChange={(e) => setEmail({ ...email, bcc: e.target.value })}
              placeholder="bcc@example.com"
            />
          </div>
        </div>

        {/* Subject and Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={email.subject}
              onChange={(e) => setEmail({ ...email, subject: e.target.value })}
              placeholder="Email subject"
            />
          </div>
          <div>
            <Label htmlFor="emailType">Type</Label>
            <Select value={email.emailType} onValueChange={(value: any) => setEmail({ ...email, emailType: value })}>
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
        </div>

        {/* Message Body */}
        <div>
          <Label htmlFor="body">Message *</Label>
          <Textarea
            id="body"
            value={email.body}
            onChange={(e) => setEmail({ ...email, body: e.target.value })}
            placeholder="Type your message here..."
            rows={14}
            className="resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Paperclip className="h-4 w-4" />
            Attach Files
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Assist
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowTemplates(true)}>
            <FileText className="h-4 w-4" />
            Templates
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => saveDraft()} 
            disabled={isSavingDraft}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isSavingDraft ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button variant="outline" onClick={saveAsTemplate}>
            <FileText className="h-4 w-4 mr-2" />
            Save Template
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedEmailComposer;