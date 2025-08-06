import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { validateEmailExchange, validateUserInput } from '@/utils/inputValidation';
import { preValidateEmailExchange, handleSecurityError } from '@/utils/security';
import { supabase } from '@/integrations/supabase/client';
import { toastHelpers } from '@/utils/toastHelpers';

interface EnhancedEmailValidatorProps {
  onValidated?: (data: any) => void;
  className?: string;
}

export const EnhancedEmailValidator: React.FC<EnhancedEmailValidatorProps> = ({ 
  onValidated, 
  className = '' 
}) => {
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    sender_email: '',
    recipient_emails: [''],
    status: 'draft',
    direction: 'outbound',
    email_type: 'general'
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidateAndSubmit = async () => {
    setIsValidating(true);
    setValidationErrors([]);

    try {
      // Frontend validation using Zod schema
      const validatedData = validateUserInput(validateEmailExchange, {
        ...formData,
        recipient_emails: formData.recipient_emails.filter(email => email.trim() !== '')
      });

      // Additional security validation
      const preValidation = preValidateEmailExchange({
        ...validatedData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });

      if (!preValidation.isValid) {
        setValidationErrors(preValidation.errors);
        toastHelpers.error('Validation failed', { description: preValidation.errors.join(', ') });
        return;
      }

      // If validation passes, call the callback
      if (onValidated) {
        onValidated(validatedData);
      }

      toastHelpers.success('Email validated successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setValidationErrors([errorMessage]);
      
      // Log security error
      await handleSecurityError(error as Error, 'email_validation');
      
      toastHelpers.error('Validation Error', { description: errorMessage });
    } finally {
      setIsValidating(false);
    }
  };

  const addRecipient = () => {
    setFormData(prev => ({
      ...prev,
      recipient_emails: [...prev.recipient_emails, '']
    }));
  };

  const removeRecipient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recipient_emails: prev.recipient_emails.filter((_, i) => i !== index)
    }));
  };

  const updateRecipient = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      recipient_emails: prev.recipient_emails.map((email, i) => i === index ? value : email)
    }));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Enhanced Email Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc pl-4">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Subject</label>
          <Input
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Email subject"
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Sender Email</label>
          <Input
            type="email"
            value={formData.sender_email}
            onChange={(e) => setFormData(prev => ({ ...prev, sender_email: e.target.value }))}
            placeholder="sender@example.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Recipients</label>
          {formData.recipient_emails.map((email, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => updateRecipient(index, e.target.value)}
                placeholder="recipient@example.com"
              />
              {formData.recipient_emails.length > 1 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => removeRecipient(index)}
                  size="sm"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addRecipient} size="sm">
            Add Recipient
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full p-2 border rounded-md"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="bounced">Bounced</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Direction</label>
          <select
            value={formData.direction}
            onChange={(e) => setFormData(prev => ({ ...prev, direction: e.target.value }))}
            className="w-full p-2 border rounded-md"
          >
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Body</label>
          <textarea
            value={formData.body}
            onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
            placeholder="Email content..."
            className="w-full p-2 border rounded-md h-32"
            maxLength={50000}
          />
        </div>

        <Button 
          onClick={handleValidateAndSubmit}
          disabled={isValidating}
          className="w-full"
        >
          {isValidating ? 'Validating...' : 'Validate Email'}
        </Button>
      </CardContent>
    </Card>
  );
};