import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Send, 
  Eye, 
  Palette, 
  Wand2, 
  Copy,
  FileText,
  Plane,
  MapPin,
  Calendar,
  Users,
  Star,
  Heart
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  category: 'professional' | 'friendly' | 'luxury' | 'urgent';
  subject: string;
  content: string;
  variables: string[];
  icon: React.ReactNode;
  preview: string;
}

interface EmailTemplateEditorProps {
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  clientName?: string;
  clientEmail?: string;
  quotes?: any[];
  onSend?: (emailData: { to: string; subject: string; body: string }) => void;
  onCancel?: () => void;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'professional-quote',
    name: 'Professional Quote',
    category: 'professional',
    subject: 'Your Travel Quote - {{clientName}}',
    content: `Dear {{clientName}},

Thank you for considering our travel services. We are pleased to present your customized travel quote:

{{quoteDetails}}

This quote is valid for 7 days from today's date. All prices are in USD and include our service fees.

Should you have any questions or wish to proceed with the booking, please don't hesitate to contact us.

Best regards,
{{agentName}}
{{agencyName}}`,
    variables: ['clientName', 'quoteDetails', 'agentName', 'agencyName'],
    icon: <FileText className="h-4 w-4" />,
    preview: 'Professional and formal tone with clear quote presentation'
  },
  {
    id: 'friendly-welcome',
    name: 'Friendly Welcome',
    category: 'friendly',
    subject: 'Exciting Travel Options for {{clientName}} 🌟',
    content: `Hi {{clientName}}!

Hope you're having a wonderful day! ✈️

I've put together some amazing travel options just for you. Here's what I found:

{{quoteDetails}}

I'm so excited about these options and I think you'll love them too! Each option has been carefully selected based on your preferences.

Feel free to call or text me anytime - I'm here to make your travel dreams come true!

Happy travels ahead,
{{agentName}} 😊
{{agencyName}}`,
    variables: ['clientName', 'quoteDetails', 'agentName', 'agencyName'],
    icon: <Heart className="h-4 w-4" />,
    preview: 'Warm and personal tone with emojis and friendly language'
  },
  {
    id: 'luxury-experience',
    name: 'Luxury Experience',
    category: 'luxury',
    subject: 'Exclusive Travel Proposal - {{clientName}}',
    content: `Dear {{clientName}},

We are delighted to present an exceptional travel experience, meticulously curated for your distinguished journey.

{{quoteDetails}}

Our premium service ensures every detail of your travel is handled with the utmost care and attention. This exclusive proposal includes priority booking, dedicated concierge support, and access to our luxury travel partners.

We would be honored to arrange this extraordinary experience for you.

With distinguished regards,
{{agentName}}
Senior Travel Consultant
{{agencyName}}`,
    variables: ['clientName', 'quoteDetails', 'agentName', 'agencyName'],
    icon: <Star className="h-4 w-4" />,
    preview: 'Sophisticated and premium language for luxury travelers'
  },
  {
    id: 'urgent-response',
    name: 'Time-Sensitive Offer',
    category: 'urgent',
    subject: '⏰ Limited Time: Special Pricing for {{clientName}}',
    content: `Hi {{clientName}},

URGENT UPDATE: I've secured special pricing for your travel dates, but these rates won't last long!

{{quoteDetails}}

⚡ IMPORTANT: These promotional rates are only available until {{expiryDate}}. After this date, prices will return to regular rates.

I recommend we move quickly to secure these savings. I can hold these rates for 24 hours while you review.

Ready to book? Just reply to this email or call me directly.

Best,
{{agentName}}
{{agencyName}}
📞 Available until 9 PM today`,
    variables: ['clientName', 'quoteDetails', 'expiryDate', 'agentName', 'agencyName'],
    icon: <Calendar className="h-4 w-4" />,
    preview: 'Creates urgency with time-sensitive offers and clear deadlines'
  }
];

const VARIABLE_SUGGESTIONS = {
  clientName: 'Client\'s first name',
  agentName: 'Your name',
  agencyName: 'Your travel agency name',
  quoteDetails: 'Travel quote information',
  expiryDate: 'Quote expiration date',
  destination: 'Travel destination',
  travelDates: 'Travel dates',
  totalPrice: 'Total price',
  savings: 'Amount saved'
};

export function EmailTemplateEditor({
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  clientName = '',
  clientEmail = '',
  quotes = [],
  onSend,
  onCancel
}: EmailTemplateEditorProps) {
  const [emailData, setEmailData] = useState({
    to: initialTo || clientEmail,
    subject: initialSubject,
    body: initialBody
  });
  
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [variables, setVariables] = useState({
    clientName: clientName,
    agentName: '',
    agencyName: '',
    quoteDetails: quotes?.map(q => `• ${q.notes || 'Flight Quote'}: $${q.totalPrice || '0'}`).join('\n') || '',
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    destination: '',
    travelDates: '',
    totalPrice: quotes?.reduce((sum, q) => sum + (parseFloat(q.totalPrice) || 0), 0).toString() || '0',
    savings: ''
  });

  const applyTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    let processedContent = template.content;
    let processedSubject = template.subject;

    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
      processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
    });

    setEmailData({
      ...emailData,
      subject: processedSubject,
      body: processedContent
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'professional': return 'bg-blue-100 text-blue-800';
      case 'friendly': return 'bg-green-100 text-green-800';
      case 'luxury': return 'bg-purple-100 text-purple-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
    
    // Re-apply template if one is selected
    if (selectedTemplate) {
      let processedContent = selectedTemplate.content;
      let processedSubject = selectedTemplate.subject;
      
      const updatedVariables = { ...variables, [key]: value };
      Object.entries(updatedVariables).forEach(([varKey, varValue]) => {
        const placeholder = `{{${varKey}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), varValue);
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), varValue);
      });

      setEmailData(prev => ({
        ...prev,
        subject: processedSubject,
        body: processedContent
      }));
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EMAIL_TEMPLATES.map((template) => (
              <Card 
                key={template.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => applyTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.icon}
                      {template.name}
                    </CardTitle>
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{template.preview}</p>
                  <p className="text-xs font-medium text-primary">
                    Subject: {template.subject.replace(/\{\{.*?\}\}/g, '...')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedTemplate && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Customize Template Variables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {VARIABLE_SUGGESTIONS[variable as keyof typeof VARIABLE_SUGGESTIONS] || variable}
                    </Label>
                    <Input
                      value={variables[variable as keyof typeof variables] || ''}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                      placeholder={`Enter ${variable}...`}
                      className="text-sm"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="compose" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>To</Label>
              <Select value={emailData.to} onValueChange={(value) => setEmailData(prev => ({ ...prev, to: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select email address" />
                </SelectTrigger>
                <SelectContent>
                  {clientEmail && <SelectItem value={clientEmail}>{clientEmail}</SelectItem>}
                  {initialTo && initialTo !== clientEmail && (
                    <SelectItem value={initialTo}>{initialTo}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <div className="flex gap-2">
                <Input
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject..."
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(emailData.subject)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Email Content</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(emailData.body)}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
            <Textarea
              value={emailData.body}
              onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
              rows={16}
              className="font-mono text-sm resize-none"
              placeholder="Compose your email content here..."
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">From: Your Travel Agency</p>
                  <p className="text-sm text-muted-foreground">To: {emailData.to}</p>
                  <p className="text-sm text-muted-foreground">Subject: {emailData.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Travel Email</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose max-w-none">
                <div 
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  {emailData.body}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={() => onSend?.(emailData)}
          disabled={!emailData.to || !emailData.subject || !emailData.body}
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="h-4 w-4 mr-2" />
          Send Email
        </Button>
      </div>
    </div>
  );
}