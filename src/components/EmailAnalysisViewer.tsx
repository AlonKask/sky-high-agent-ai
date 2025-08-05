import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, 
  TrendingUp, 
  AlertCircle, 
  Target, 
  Users, 
  Calendar,
  Phone,
  Mail,
  Building,
  Star,
  CheckCircle
} from 'lucide-react';
import { toastHelpers } from '@/utils/toastHelpers';
import { supabase } from '@/integrations/supabase/client';

interface EmailAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  intent: 'inquiry' | 'complaint' | 'purchase' | 'support' | 'follow_up' | 'other';
  clientProfile: {
    buyingSignals: string[];
    painPoints: string[];
    decisionMaker: boolean;
    budget: 'low' | 'medium' | 'high' | 'unknown';
    timeline: 'immediate' | 'short_term' | 'long_term' | 'unknown';
  };
  keyInformation: {
    contactInfo: string[];
    importantDates: string[];
    actionItems: string[];
    competitorMentions: string[];
  };
  salesOpportunity: {
    score: number;
    confidence: number;
    reasoning: string;
    nextSteps: string[];
  };
  personalizationData: {
    interests: string[];
    companyInfo: string;
    personalDetails: string;
    communicationStyle: 'formal' | 'casual' | 'technical';
  };
}

interface Email {
  metadata?: { ai_analysis?: EmailAnalysis };
  sender_email?: string;
  [key: string]: unknown;
}

interface EmailAnalysisViewerProps {
  emailId: string;
  email: Email;
  onAnalysisComplete?: (analysis: EmailAnalysis) => void;
}

export const EmailAnalysisViewer: React.FC<EmailAnalysisViewerProps> = ({
  emailId,
  email,
  onAnalysisComplete
}) => {
  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(
    email.metadata?.ai_analysis || null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  

  const analyzeEmail = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('advanced-email-analysis', {
        body: {
          emailId,
          emailContent: email,
          senderInfo: `${email.sender_email} - Previous communication history available`
        }
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      onAnalysisComplete?.(data.analysis);
      
      toastHelpers.success("Analysis Complete", { description: "Email has been analyzed with advanced AI insights." });
    } catch (error) {
      console.error('Error analyzing email:', error);
      toastHelpers.error("Could not analyze email. Please try again.", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500';
      case 'negative': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getOpportunityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Email Analysis
          </CardTitle>
          {!analysis && (
            <Button 
              onClick={analyzeEmail} 
              disabled={isAnalyzing}
              variant="outline"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Email'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!analysis ? (
          <div className="text-center py-8 text-muted-foreground">
            Click "Analyze Email" to get AI-powered insights about this email.
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="client">Client Profile</TabsTrigger>
              <TabsTrigger value="sales">Sales Opportunity</TabsTrigger>
              <TabsTrigger value="personalization">Personalization</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getSentimentColor(analysis.sentiment)}`} />
                      <span className="text-sm font-medium">Sentiment</span>
                    </div>
                    <p className="text-lg font-semibold capitalize">{analysis.sentiment}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Urgency</span>
                    </div>
                    <Badge className={`${getUrgencyColor(analysis.urgency)} text-white`}>
                      {analysis.urgency}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      <span className="text-sm font-medium">Intent</span>
                    </div>
                    <p className="text-lg font-semibold capitalize">{analysis.intent.replace('_', ' ')}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">Sales Score</span>
                    </div>
                    <p className={`text-lg font-semibold ${getOpportunityColor(analysis.salesOpportunity.score)}`}>
                      {analysis.salesOpportunity.score}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Action Items
                  </h4>
                  <ScrollArea className="max-h-32">
                    {analysis.keyInformation.actionItems.map((item, index) => (
                      <div key={index} className="flex items-start gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>

                {analysis.keyInformation.importantDates.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Important Dates
                    </h4>
                    <div className="space-y-1">
                      {analysis.keyInformation.importantDates.map((date, index) => (
                        <Badge key={index} variant="secondary" className="mr-2">
                          {date}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="client" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Buying Signals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysis.clientProfile.buyingSignals.length > 0 ? (
                      <ul className="space-y-2">
                        {analysis.clientProfile.buyingSignals.map((signal, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <span className="text-sm">{signal}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No buying signals detected</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Pain Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysis.clientProfile.painPoints.length > 0 ? (
                      <ul className="space-y-2">
                        {analysis.clientProfile.painPoints.map((pain, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                            <span className="text-sm">{pain}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No pain points identified</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {analysis.clientProfile.decisionMaker ? '✓' : '✗'}
                  </div>
                  <p className="text-sm text-muted-foreground">Decision Maker</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold capitalize">
                    {analysis.clientProfile.budget}
                  </div>
                  <p className="text-sm text-muted-foreground">Budget Level</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold capitalize">
                    {analysis.clientProfile.timeline.replace('_', ' ')}
                  </div>
                  <p className="text-sm text-muted-foreground">Timeline</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {analysis.keyInformation.contactInfo.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Contacts Found</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Sales Opportunity Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Opportunity Score</span>
                      <span className={`font-bold ${getOpportunityColor(analysis.salesOpportunity.score)}`}>
                        {analysis.salesOpportunity.score}%
                      </span>
                    </div>
                    <Progress value={analysis.salesOpportunity.score} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Confidence Level</span>
                      <span className="font-bold">{analysis.salesOpportunity.confidence}%</span>
                    </div>
                    <Progress value={analysis.salesOpportunity.confidence} className="h-2" />
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Reasoning</h4>
                    <p className="text-sm text-muted-foreground">{analysis.salesOpportunity.reasoning}</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Recommended Next Steps</h4>
                    <ul className="space-y-2">
                      {analysis.salesOpportunity.nextSteps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                          <span className="text-sm">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="personalization" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Interests & Personal Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.personalizationData.interests.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Interests</h5>
                        <div className="flex flex-wrap gap-1">
                          {analysis.personalizationData.interests.map((interest, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {analysis.personalizationData.personalDetails && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Personal Details</h5>
                        <p className="text-sm text-muted-foreground">
                          {analysis.personalizationData.personalDetails}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.personalizationData.companyInfo && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Company Details</h5>
                        <p className="text-sm text-muted-foreground">
                          {analysis.personalizationData.companyInfo}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <h5 className="font-medium text-sm mb-2">Communication Style</h5>
                      <Badge variant="outline" className="capitalize">
                        {analysis.personalizationData.communicationStyle}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {analysis.keyInformation.contactInfo.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contact Information Extracted
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {analysis.keyInformation.contactInfo.map((contact, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">{contact}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};