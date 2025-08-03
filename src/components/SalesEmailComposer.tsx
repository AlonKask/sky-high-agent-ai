import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  Wand2, 
  Star, 
  Copy, 
  Send, 
  Lightbulb, 
  Target,
  Users,
  TrendingUp,
  MessageSquare,
  Clock,
  Mail
} from 'lucide-react';
import { toastHelpers } from '@/utils/toastHelpers';
import { supabase } from '@/integrations/supabase/client';

interface SalesEmailComposerProps {
  onEmailGenerated?: (email: any) => void;
  initialData?: {
    recipientEmail?: string;
    recipientName?: string;
    recipientCompany?: string;
    context?: string;
    personalizedInfo?: any;
  };
}

interface GeneratedEmail {
  subject: string;
  body: string;
  personalization_score: number;
  improvement_suggestions: string[];
  alternative_subjects: string[];
  key_personalization_elements: string[];
}

export const SalesEmailComposer: React.FC<SalesEmailComposerProps> = ({
  onEmailGenerated,
  initialData
}) => {
  const [formData, setFormData] = useState({
    recipientEmail: initialData?.recipientEmail || '',
    recipientName: initialData?.recipientName || '',
    recipientCompany: initialData?.recipientCompany || '',
    emailType: 'cold_outreach' as 'cold_outreach' | 'follow_up' | 'proposal' | 'closing' | 'nurture' | 'referral',
    tone: 'professional' as 'professional' | 'friendly' | 'casual' | 'urgent',
    objective: '',
    callToAction: '',
    context: initialData?.context || '',
    previousConversation: '',
    personalizedInfo: {
      interests: [] as string[],
      companyInfo: initialData?.personalizedInfo?.companyInfo || '',
      painPoints: [] as string[],
      recentNews: '',
      mutualConnections: [] as string[]
    },
    constraints: {
      maxLength: 200,
      includeSignature: true,
      includePricing: false
    }
  });

  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePersonalizationChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      personalizedInfo: {
        ...prev.personalizedInfo,
        [field]: value
      }
    }));
  };

  const handleConstraintChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        [field]: value
      }
    }));
  };

  const addArrayItem = (field: string, value: string) => {
    if (!value.trim()) return;
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'personalizedInfo') {
        setFormData(prev => ({
          ...prev,
          personalizedInfo: {
            ...prev.personalizedInfo,
            [child]: [...prev.personalizedInfo[child as keyof typeof prev.personalizedInfo] as string[], value.trim()]
          }
        }));
      }
    }
  };

  const removeArrayItem = (field: string, index: number) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'personalizedInfo') {
        setFormData(prev => ({
          ...prev,
          personalizedInfo: {
            ...prev.personalizedInfo,
            [child]: (prev.personalizedInfo[child as keyof typeof prev.personalizedInfo] as string[]).filter((_, i) => i !== index)
          }
        }));
      }
    } else {
      // This won't be used since we only handle personalizedInfo arrays
      console.warn('Direct array field not supported');
    }
  };

  const generateEmail = async () => {
    if (!formData.recipientEmail || !formData.objective || !formData.callToAction) {
      toast({
        title: "Missing Information",
        description: "Please fill in recipient email, objective, and call to action.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('sales-email-composer', {
        body: formData
      });

      if (error) throw error;

      setGeneratedEmail(data);
      onEmailGenerated?.(data);
      
      toast({
        title: "Email Generated",
        description: `Personalized email created with ${data.personalization_score}% personalization score.`
      });
    } catch (error) {
      console.error('Error generating email:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Email content copied to clipboard."
    });
  };

  const getPersonalizationColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Sales Email Composer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="personalization">Personalization</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Recipient Email *</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                    placeholder="recipient@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    value={formData.recipientName}
                    onChange={(e) => handleInputChange('recipientName', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientCompany">Company</Label>
                  <Input
                    id="recipientCompany"
                    value={formData.recipientCompany}
                    onChange={(e) => handleInputChange('recipientCompany', e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Type</Label>
                  <Select value={formData.emailType} onValueChange={(value) => handleInputChange('emailType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="closing">Closing</SelectItem>
                      <SelectItem value="nurture">Nurture</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={formData.tone} onValueChange={(value) => handleInputChange('tone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Email Objective *</Label>
                <Textarea
                  id="objective"
                  value={formData.objective}
                  onChange={(e) => handleInputChange('objective', e.target.value)}
                  placeholder="What do you want to achieve with this email?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="callToAction">Call to Action *</Label>
                <Input
                  id="callToAction"
                  value={formData.callToAction}
                  onChange={(e) => handleInputChange('callToAction', e.target.value)}
                  placeholder="Book a 15-minute call, Reply with your thoughts, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="context">Additional Context</Label>
                <Textarea
                  id="context"
                  value={formData.context}
                  onChange={(e) => handleInputChange('context', e.target.value)}
                  placeholder="Any additional context about the recipient or situation..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="personalization" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4" />
                      Interests
                    </Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add interest..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addArrayItem('personalizedInfo.interests', e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.personalizedInfo.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer" 
                               onClick={() => removeArrayItem('personalizedInfo.interests', index)}>
                          {interest} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4" />
                      Pain Points
                    </Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add pain point..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addArrayItem('personalizedInfo.painPoints', e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.personalizedInfo.painPoints.map((pain, index) => (
                        <Badge key={index} variant="destructive" className="cursor-pointer"
                               onClick={() => removeArrayItem('personalizedInfo.painPoints', index)}>
                          {pain} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4" />
                      Mutual Connections
                    </Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add mutual connection..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addArrayItem('personalizedInfo.mutualConnections', e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.personalizedInfo.mutualConnections.map((connection, index) => (
                        <Badge key={index} variant="outline" className="cursor-pointer"
                               onClick={() => removeArrayItem('personalizedInfo.mutualConnections', index)}>
                          {connection} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyInfo">Company Information</Label>
                    <Textarea
                      id="companyInfo"
                      value={formData.personalizedInfo.companyInfo}
                      onChange={(e) => handlePersonalizationChange('companyInfo', e.target.value)}
                      placeholder="What do you know about their company?"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recentNews">Recent News/Updates</Label>
                    <Textarea
                      id="recentNews"
                      value={formData.personalizedInfo.recentNews}
                      onChange={(e) => handlePersonalizationChange('recentNews', e.target.value)}
                      placeholder="Recent company news, funding, launches, etc."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="previousConversation">Previous Conversation</Label>
                    <Textarea
                      id="previousConversation"
                      value={formData.previousConversation}
                      onChange={(e) => handleInputChange('previousConversation', e.target.value)}
                      placeholder="Paste previous email thread or conversation history..."
                      rows={6}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">Email Constraints</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxLength">Maximum Length (words)</Label>
                      <Input
                        id="maxLength"
                        type="number"
                        value={formData.constraints.maxLength}
                        onChange={(e) => handleConstraintChange('maxLength', parseInt(e.target.value))}
                        min={50}
                        max={500}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeSignature">Include Email Signature</Label>
                      <Switch
                        id="includeSignature"
                        checked={formData.constraints.includeSignature}
                        onCheckedChange={(checked) => handleConstraintChange('includeSignature', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="includePricing">Include Pricing Information</Label>
                      <Switch
                        id="includePricing"
                        checked={formData.constraints.includePricing}
                        onCheckedChange={(checked) => handleConstraintChange('includePricing', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              {generatedEmail ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Generated Email</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Personalization Score:</span>
                      <span className={`font-bold ${getPersonalizationColor(generatedEmail.personalization_score)}`}>
                        {generatedEmail.personalization_score}%
                      </span>
                      <Progress value={generatedEmail.personalization_score} className="w-20" />
                    </div>
                  </div>

                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="font-medium">Subject Line</Label>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedEmail.subject)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="p-3 bg-muted rounded border-l-4 border-l-primary">
                          {generatedEmail.subject}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="font-medium">Email Body</Label>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedEmail.body)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <ScrollArea className="h-64 p-3 bg-muted rounded border">
                          <pre className="whitespace-pre-wrap text-sm">{generatedEmail.body}</pre>
                        </ScrollArea>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">Alternative Subject Lines</Label>
                          <div className="mt-2 space-y-1">
                            {generatedEmail.alternative_subjects.map((subject, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                                <span>{subject}</span>
                                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(subject)}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="font-medium">Personalization Elements</Label>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {generatedEmail.key_personalization_elements.map((element, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {element}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {generatedEmail.improvement_suggestions.length > 0 && (
                        <div>
                          <Label className="font-medium flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Improvement Suggestions
                          </Label>
                          <ul className="mt-2 space-y-1">
                            {generatedEmail.improvement_suggestions.map((suggestion, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-yellow-500">•</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Button onClick={() => copyToClipboard(`${generatedEmail.subject}\n\n${generatedEmail.body}`)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Full Email
                    </Button>
                    <Button variant="outline">
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Generate an email to see the preview here.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Advanced AI personalization powered by GPT-4
            </div>
            <Button onClick={generateEmail} disabled={isGenerating} className="min-w-32">
              {isGenerating ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};