import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, X, Paperclip, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toastHelpers } from '@/utils/toastHelpers';
import { logger } from "@/utils/logger";

interface EmailComposerProps {
  defaultTo?: string;
  clientId?: string;
  requestId?: string;
  onSent: () => void;
  onCancel: () => void;
}

const EmailComposer = ({
  defaultTo = '',
  clientId,
  requestId,
  onSent,
  onCancel
}: EmailComposerProps) => {
  const [isSending, setIsSending] = useState(false);
  const [email, setEmail] = useState({
    to: defaultTo,
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    emailType: 'general' as const
  });

  const handleSend = async () => {
    if (!email.to || !email.subject || !email.body) {
      toastHelpers.error("Please fill in all required fields");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: [email.to],
          cc: email.cc ? [email.cc] : undefined,
          bcc: email.bcc ? [email.bcc] : undefined,
          subject: email.subject,
          body: email.body.replace(/\n/g, '<br>'),
          clientId,
          requestId,
          emailType: email.emailType
        }
      });

      if (error) {
        logger.error('Error sending email:', error);
        toastHelpers.error("Failed to send email", error);
        return;
      }

      toastHelpers.success("Email sent successfully");
      onSent();

    } catch (error) {
      logger.error('Error:', error);
      toastHelpers.error("Failed to send email", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
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
          rows={12}
          className="resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Paperclip className="h-4 w-4" />
            Attach Files
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Assist
          </Button>
        </div>
        
        <div className="flex gap-2">
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

export default EmailComposer;