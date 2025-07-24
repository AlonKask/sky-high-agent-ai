import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Mail, 
  Brain, 
  Zap, 
  Send, 
  RefreshCw, 
  Star, 
  Clock,
  User,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface EmailSuggestion {
  id: string;
  type: 'response' | 'follow_up' | 'upsell' | 'nurture';
  subject: string;
  content: string;
  tone: 'professional' | 'friendly' | 'urgent' | 'casual';
  confidence: number;
  urgency: 'high' | 'medium' | 'low';
  estimatedEngagement: number;
  reasons: string[];
  clientContext: {
    name: string;
    lastInteraction: Date;
    bookingHistory: number;
    preferredClass: string;
    totalSpent: number;
  };
}

interface EmailAutomation {
  id: string;
  name: string;
  trigger: string;
  type: 'welcome' | 'follow_up' | 'booking_confirmation' | 'review_request' | 'upsell';
  isActive: boolean;
  emailTemplate: string;
  sendDelay: number; // hours
  targetSegment: string;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

const AIEmailAssistant = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<EmailSuggestion[]>([]);
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState<EmailSuggestion | null>(null);

  useEffect(() => {
    if (user) {
      loadEmailSuggestions();
      loadAutomations();
    }
  }, [user]);

  const loadEmailSuggestions = async () => {
    try {
      setLoading(true);
      
      // Get recent emails and client data to generate suggestions
      const { data: emails } = await supabase
        .from('email_exchanges')
        .select(`
          *,
          clients!inner(*)
        `)
        .eq('user_id', user?.id)
        .eq('direction', 'incoming')
        .order('created_at', { ascending: false })
        .limit(10);

      if (emails) {
        const generatedSuggestions = await generateEmailSuggestions(emails);
        setSuggestions(generatedSuggestions);
      }
    } catch (error) {
      console.error('Error loading email suggestions:', error);
      toast.error('Failed to load email suggestions');
    } finally {
      setLoading(false);
    }
  };

  const loadAutomations = () => {
    // Sample automation data
    const sampleAutomations: EmailAutomation[] = [
      {
        id: '1',
        name: 'Welcome New Clients',
        trigger: 'New client registration',
        type: 'welcome',
        isActive: true,
        emailTemplate: 'Welcome to our premium travel service! We\'re excited to help you with your travel needs.',
        sendDelay: 1,
        targetSegment: 'New clients',
        openRate: 87,
        clickRate: 24,
        conversionRate: 12
      },
      {
        id: '2',
        name: 'Booking Follow-up',
        trigger: '3 days after booking',
        type: 'follow_up',
        isActive: true,
        emailTemplate: 'How was your recent trip? We\'d love to hear about your experience.',
        sendDelay: 72,
        targetSegment: 'Recent travelers',
        openRate: 72,
        clickRate: 18,
        conversionRate: 8
      },
      {
        id: '3',
        name: 'Premium Upgrade Offer',
        trigger: 'Business class bookers',
        type: 'upsell',
        isActive: false,
        emailTemplate: 'Experience first-class luxury on your next trip with our exclusive upgrade offers.',
        sendDelay: 24,
        targetSegment: 'Business travelers',
        openRate: 65,
        clickRate: 15,
        conversionRate: 22
      }
    ];
    
    setAutomations(sampleAutomations);
  };

  const generateEmailSuggestions = async (emails: any[]): Promise<EmailSuggestion[]> => {
    // Simulate AI-generated email suggestions
    const sampleSuggestions: EmailSuggestion[] = [
      {
        id: '1',
        type: 'response',
        subject: 'Re: Business Trip to London - Premium Options Available',
        content: `Dear John,

Thank you for your inquiry about business travel to London. Based on your preferences for premium accommodations and your travel history, I've curated some exceptional options:

• British Airways Business Class - Direct flights with flat-bed seats
• The Langham London - 5-star luxury in the heart of the city
• Priority airport transfers included

Given your previous bookings, I can offer a 15% discount on this package. The total investment would be $4,850 for the complete experience.

Would you like me to hold these reservations while you review?

Best regards,
Your Travel Specialist`,
        tone: 'professional',
        confidence: 92,
        urgency: 'high',
        estimatedEngagement: 78,
        reasons: [
          'Client has high engagement history',
          'Previous similar bookings worth $12K+',
          'Mentioned specific dates in last email',
          'Premium travel preferences identified'
        ],
        clientContext: {
          name: 'John Smith',
          lastInteraction: new Date('2024-01-15'),
          bookingHistory: 8,
          preferredClass: 'business',
          totalSpent: 45000
        }
      },
      {
        id: '2',
        type: 'follow_up',
        subject: 'Your Paris Trip Memories + Special Offer Inside',
        content: `Hi Sarah,

I hope you had an amazing time in Paris! I saw some wonderful photos you shared - the hotel recommendation was perfect, wasn't it?

I wanted to reach out because I have an exclusive opportunity that matches your travel style:

🌟 Mediterranean Yacht Experience - 7 days
🌟 Private chef and crew included
🌟 Available for your preferred dates in April

As one of our valued clients, you'd receive priority booking and a complimentary wine tasting tour in each port.

Interested in hearing more details?

Warm regards,
Your Travel Concierge`,
        tone: 'friendly',
        confidence: 85,
        urgency: 'medium',
        estimatedEngagement: 82,
        reasons: [
          'Recent trip completion indicates satisfaction',
          'Client prefers luxury experiences',
          'Seasonal travel patterns match',
          'High lifetime value client'
        ],
        clientContext: {
          name: 'Sarah Johnson',
          lastInteraction: new Date('2024-01-10'),
          bookingHistory: 12,
          preferredClass: 'first',
          totalSpent: 78000
        }
      },
      {
        id: '3',
        type: 'nurture',
        subject: 'Exclusive Travel Trends: What\'s Hot in 2024',
        content: `Hello Michael,

As someone who appreciates unique travel experiences, I thought you'd enjoy these insider insights on 2024's hottest destinations:

🏝️ Bhutan - Just opened to sustainable tourism
🏔️ Faroe Islands - Nordic luxury meets adventure
🌸 Japan's Hidden Ryokans - Ultra-exclusive mountain retreats

Each destination offers the authentic, off-the-beaten-path experiences you love. I'm already planning some incredible packages for select clients.

Want to be first to know when these become available?

Adventure awaits,
Your Travel Expert`,
        tone: 'casual',
        confidence: 75,
        urgency: 'low',
        estimatedEngagement: 65,
        reasons: [
          'Client enjoys unique destinations',
          'Long relationship needs nurturing',
          'Adventure travel preferences',
          'Educational content drives engagement'
        ],
        clientContext: {
          name: 'Michael Brown',
          lastInteraction: new Date('2023-12-20'),
          bookingHistory: 6,
          preferredClass: 'business',
          totalSpent: 32000
        }
      }
    ];

    return sampleSuggestions;
  };

  const generateCustomSuggestion = async () => {
    if (!customPrompt.trim()) {
      toast.error('Please enter a prompt for the AI');
      return;
    }

    setGenerating(true);
    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const customSuggestion: EmailSuggestion = {
        id: Date.now().toString(),
        type: 'response',
        subject: 'AI Generated: ' + customPrompt.substring(0, 50) + '...',
        content: `This is an AI-generated email based on your prompt: "${customPrompt}"\n\nDear Valued Client,\n\nThank you for your interest. Based on your requirements, I've prepared a tailored solution that addresses your specific needs.\n\n[AI would generate specific content here based on the prompt]\n\nI look forward to discussing this opportunity with you.\n\nBest regards,\nYour Travel Specialist`,
        tone: 'professional',
        confidence: 88,
        urgency: 'medium',
        estimatedEngagement: 72,
        reasons: ['Custom AI generation', 'Tailored to specific requirements'],
        clientContext: {
          name: 'Custom Client',
          lastInteraction: new Date(),
          bookingHistory: 0,
          preferredClass: 'business',
          totalSpent: 0
        }
      };

      setSuggestions([customSuggestion, ...suggestions]);
      setCustomPrompt('');
      toast.success('Custom email suggestion generated');
    } catch (error) {
      toast.error('Failed to generate custom suggestion');
    } finally {
      setGenerating(false);
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'professional': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'friendly': return 'bg-green-100 text-green-800 border-green-200';
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'casual': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'response': return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'follow_up': return <RefreshCw className="h-5 w-5 text-green-600" />;
      case 'upsell': return <TrendingUp className="h-5 w-5 text-purple-600" />;
      case 'nurture': return <Star className="h-5 w-5 text-yellow-600" />;
      default: return <Mail className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">AI Email Assistant</h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Email Assistant
          </h2>
          <p className="text-muted-foreground">AI-powered email suggestions and automation</p>
        </div>
        <Button 
          onClick={loadEmailSuggestions} 
          className="bg-primary"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Suggestions
        </Button>
      </div>

      <Tabs defaultValue="suggestions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
          <TabsTrigger value="automations">Email Automations</TabsTrigger>
          <TabsTrigger value="custom">Custom Generator</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="card-elevated hover-scale">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {getTypeIcon(suggestion.type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{suggestion.subject}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getToneColor(suggestion.tone)}>
                          {suggestion.tone}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {getUrgencyIcon(suggestion.urgency)}
                          <span className="text-sm text-muted-foreground">
                            {suggestion.urgency} priority
                          </span>
                        </div>
                        <Badge variant="outline">
                          {suggestion.confidence}% confidence
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg mb-3">
                        {suggestion.content.substring(0, 200)}...
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{suggestion.clientContext.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{suggestion.clientContext.bookingHistory} bookings</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span>{suggestion.estimatedEngagement}% engagement</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <strong>Why this suggestion:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {suggestion.reasons.slice(0, 2).map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{suggestion.subject}</DialogTitle>
                            <DialogDescription>
                              {suggestion.tone} tone • {suggestion.urgency} priority
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Email Content</Label>
                              <Textarea 
                                value={suggestion.content} 
                                readOnly 
                                className="min-h-[300px]"
                              />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" className="bg-primary">
                        <Send className="h-3 w-3 mr-1" />
                        Use Template
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {suggestions.length === 0 && (
            <Card className="card-elevated">
              <CardContent className="p-12 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Email Suggestions</h3>
                <p className="text-muted-foreground">
                  Start receiving emails from clients to get AI-powered response suggestions.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="automations" className="space-y-4">
          {automations.map((automation) => (
            <Card key={automation.id} className="card-elevated">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{automation.name}</h3>
                    <p className="text-muted-foreground mb-2">{automation.trigger}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={automation.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {automation.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">{automation.type}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{automation.openRate}%</div>
                    <div className="text-xs text-muted-foreground">Open Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{automation.clickRate}%</div>
                    <div className="text-xs text-muted-foreground">Click Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{automation.conversionRate}%</div>
                    <div className="text-xs text-muted-foreground">Conversion</div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                  <strong>Template Preview:</strong><br />
                  {automation.emailTemplate}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Custom AI Email Generator
              </CardTitle>
              <CardDescription>
                Describe the email you need and let AI create a personalized suggestion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="prompt">Describe the email you need</Label>
                <Textarea
                  id="prompt"
                  placeholder="e.g., Write a follow-up email for a client who just returned from Japan and is interested in another Asia trip..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <Button 
                onClick={generateCustomSuggestion} 
                disabled={generating || !customPrompt.trim()}
                className="w-full bg-primary"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating AI Email...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate AI Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIEmailAssistant;