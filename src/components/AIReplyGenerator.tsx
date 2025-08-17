import { useState, useEffect } from "react";
import { SafeHtmlRenderer } from "@/components/SafeHtmlRenderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Loader2,
  Eye,
  Send,
  RefreshCw,
  Brain,
  Shield,
  Search,
  ClipboardCheck,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toastHelpers } from '@/utils/toastHelpers';

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
  client_id?: string;
  request_id?: string;
}

interface AgentResult {
  agent: string;
  result: any;
  confidence: number;
  timestamp: string;
  processingTime: number;
  issues?: string[];
  suggestions?: string[];
}

interface AIReplyGeneratorProps {
  originalEmail: EmailExchange;
  clientId?: string;
  requestId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const AgentCard = ({ 
  agent, 
  status, 
  confidence, 
  processingTime, 
  issues = [], 
  suggestions = [] 
}: {
  agent: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  confidence?: number;
  processingTime?: number;
  issues?: string[];
  suggestions?: string[];
}) => {
  const getAgentIcon = (agentName: string) => {
    switch (agentName) {
      case 'Content Analysis Agent': return <Search className="h-4 w-4" />;
      case 'Draft Generator Agent': return <Brain className="h-4 w-4" />;
      case 'Verification Agent': return <ClipboardCheck className="h-4 w-4" />;
      case 'Hallucination Detection Agent': return <Shield className="h-4 w-4" />;
      case 'Final Review Agent': return <Star className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <div className="h-4 w-4 rounded-full bg-muted" />;
    }
  };

  const getConfidenceColor = (conf?: number) => {
    if (!conf) return 'bg-muted';
    if (conf >= 0.8) return 'bg-success';
    if (conf >= 0.6) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      status === 'processing' && "ring-2 ring-primary/20",
      status === 'completed' && confidence && confidence >= 0.8 && "ring-1 ring-success/30",
      status === 'error' && "ring-1 ring-destructive/30"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getAgentIcon(agent)}
            <CardTitle className="text-sm">{agent}</CardTitle>
          </div>
          {getStatusIcon()}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {confidence !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>Confidence</span>
                <span>{Math.round(confidence * 100)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", getConfidenceColor(confidence))}
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {processingTime && (
            <div className="text-xs text-muted-foreground">
              Processed in {processingTime}ms
            </div>
          )}
          
          {issues.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-destructive">Issues:</div>
              {issues.map((issue, index) => (
                <div key={index} className="text-xs text-muted-foreground">
                  - {issue}
                </div>
              ))}
            </div>
          )}
          
          {suggestions.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-warning">Suggestions:</div>
              {suggestions.map((suggestion, index) => (
                <div key={index} className="text-xs text-muted-foreground">
                  - {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const AIReplyGenerator = ({ 
  originalEmail, 
  clientId, 
  requestId, 
  isOpen, 
  onClose 
}: AIReplyGeneratorProps) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [agentResults, setAgentResults] = useState<AgentResult[]>([]);
  const [currentAgent, setCurrentAgent] = useState<string>('');
  const [generatedReply, setGeneratedReply] = useState<any>(null);
  const [editedReply, setEditedReply] = useState('');
  const [editMode, setEditMode] = useState(false);
  

  const agents = [
    'Content Analysis Agent',
    'Draft Generator Agent', 
    'Verification Agent',
    'Hallucination Detection Agent',
    'Final Review Agent'
  ];

  const getAgentStatus = (agentName: string) => {
    if (!processing && agentResults.length === 0) return 'pending';
    if (currentAgent === agentName) return 'processing';
    
    const result = agentResults.find(r => r.agent === agentName);
    if (result) {
      return result.result.error ? 'error' : 'completed';
    }
    
    const agentIndex = agents.indexOf(agentName);
    const currentIndex = agents.indexOf(currentAgent);
    return agentIndex < currentIndex ? 'completed' : 'pending';
  };

  const generateReply = async () => {
    setProcessing(true);
    setProgress(0);
    setAgentResults([]);
    setGeneratedReply(null);
    setCurrentAgent(agents[0]);

    try {
      // Get context data
      const context: any = {
        clientId,
        requestId
      };

      // Fetch client information if available
      if (clientId) {
        const { data: client } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();
        context.client = client;
      }

      // Fetch request information if available
      if (requestId) {
        const { data: request } = await supabase
          .from('requests')
          .select('*')
          .eq('id', requestId)
          .single();
        context.request = request;
      }

      const { data, error } = await supabase.functions.invoke('ai-email-reply-generator', {
        body: {
          originalEmail,
          context
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = data;
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate reply');
      }

      setAgentResults(result.agentResults || []);
      setGeneratedReply(result.finalDraft);
      setEditedReply(result.finalDraft?.body || '');
      setProgress(100);

      toastHelpers.success("AI Reply Generated", { description: `Generated with ${Math.round(result.averageConfidence * 100)}% confidence` });

    } catch (error) {
      console.error('Error generating AI reply:', error);
      toastHelpers.error("Failed to generate AI reply", error);
    } finally {
      setProcessing(false);
      setCurrentAgent('');
    }
  };

  const sendReply = async () => {
    try {
      const replyContent = editMode ? editedReply : generatedReply?.body;
      
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: [originalEmail.sender_email],
          subject: generatedReply?.subject || `Re: ${originalEmail.subject}`,
          body: replyContent,
          clientId,
          requestId,
          emailType: 'ai_generated_reply'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toastHelpers.success("Reply Sent", { description: "Your AI-generated reply has been sent successfully" });

      onClose();

    } catch (error) {
      console.error('Error sending reply:', error);
      toastHelpers.error("Failed to send reply", error);
    }
  };

  // Simulate progress during processing
  useEffect(() => {
    if (processing) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const agentIndex = agents.indexOf(currentAgent);
          const baseProgress = (agentIndex * 20);
          return Math.min(baseProgress + 15, 95);
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [processing, currentAgent]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Reply Generator
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[75vh]">
          {/* Left Panel - Original Email & Agent Status */}
          <div className="space-y-4">
            {/* Original Email */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Original Email</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Subject:</span> {originalEmail.subject}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">From:</span> {originalEmail.sender_email}
                  </div>
                  <Separator />
                  <ScrollArea className="h-32">
                    <div className="text-sm text-muted-foreground">
                      {originalEmail.body}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            {/* Processing Progress */}
            {processing && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Processing Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      Currently processing: {currentAgent}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Agent Status Cards */}
            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {agents.map((agent) => {
                  const result = agentResults.find(r => r.agent === agent);
                  return (
                    <AgentCard
                      key={agent}
                      agent={agent}
                      status={getAgentStatus(agent)}
                      confidence={result?.confidence}
                      processingTime={result?.processingTime}
                      issues={result?.issues}
                      suggestions={result?.suggestions}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Generated Reply */}
          <div className="space-y-4">
            {!generatedReply ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Bot className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">Ready to Generate AI Reply</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click the button below to start the multi-agent AI processing
                  </p>
                </div>
                <Button 
                  onClick={generateReply} 
                  disabled={processing}
                  className="gap-2"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                  {processing ? 'Generating...' : 'Generate AI Reply'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 h-full flex flex-col">
                {/* Reply Preview */}
                <Card className="flex-1">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Generated Reply</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditMode(!editMode)}
                          className="gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          {editMode ? 'Preview' : 'Edit'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateReply}
                          className="gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-3 h-full">
                      <div className="text-sm">
                        <span className="font-medium">Subject:</span> {generatedReply.subject}
                      </div>
                      <Separator />
                      
                      {editMode ? (
                        <Textarea
                          value={editedReply}
                          onChange={(e) => setEditedReply(e.target.value)}
                          className="h-64 resize-none"
                          placeholder="Edit the generated reply..."
                        />
                      ) : (
                        <ScrollArea className="h-64">
                          <SafeHtmlRenderer 
                            html={editMode ? editedReply : generatedReply.body}
                            className="prose prose-sm max-w-none"
                            type="email"
                          />
                        </ScrollArea>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button onClick={onClose} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={sendReply} className="flex-1 gap-2">
                    <Send className="h-4 w-4" />
                    Send Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIReplyGenerator;