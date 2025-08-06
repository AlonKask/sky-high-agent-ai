import React, { useState, useEffect } from 'react';
import { SafeHtmlRenderer } from '@/components/SafeHtmlRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toastHelpers } from '@/utils/toastHelpers';
import { 
  Brain, 
  FileText, 
  Clock, 
  Phone, 
  Mail, 
  CheckSquare,
  User,
  Sparkles,
  Loader2,
  Minimize2,
  Maximize2,
  X
} from 'lucide-react';

interface ProcessedEmailContent {
  cleanedBody: string;
  extractedSignature: string;
  attachmentsSummary: string[];
  imageDescriptions: string[];
  keyInformation: {
    sender: string;
    mainContent: string;
    actionItems: string[];
    importantDates: string[];
    contactInfo: string[];
  };
  readabilityScore: number;
}

interface EmailContentProcessorProps {
  email: {
    id: string;
    subject: string;
    from: string;
    to: string[];
    date: string;
    body: string;
    snippet: string;
  } | null;
  isProcessingEnabled: boolean;
  isMinimized?: boolean;
  onMinimizeToggle?: () => void;
  onClose?: () => void;
}

const EmailContentProcessor: React.FC<EmailContentProcessorProps> = ({ 
  email, 
  isProcessingEnabled,
  isMinimized = false,
  onMinimizeToggle,
  onClose
}) => {
  
  const [processedContent, setProcessedContent] = useState<ProcessedEmailContent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProcessed, setShowProcessed] = useState(false);

  const processEmailContent = async () => {
    if (!email) return;

    try {
      setIsProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('process-email-content', {
        body: {
          emailData: {
            subject: email.subject,
            from: email.from,
            to: email.to.join(', '),
            body: email.body,
            snippet: email.snippet
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setProcessedContent(data.processedContent);
        setShowProcessed(true);
        toastHelpers.success("Email Processed", { description: "AI has cleaned and extracted key information from the email" });
      } else {
        // Use fallback content if AI processing failed
        setProcessedContent(data.fallbackContent);
        setShowProcessed(true);
        toastHelpers.warning("Basic Processing", { description: "Using fallback processing - AI analysis unavailable" });
      }
    } catch (error) {
      console.error('Error processing email:', error);
      toastHelpers.error("Failed to process email content with AI", error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // Remove auto-processing to prevent errors
    // User can manually trigger processing if needed
  }, [email?.id, isProcessingEnabled]);

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select an email to view its content</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col transition-all duration-300 max-h-screen ${isMinimized ? 'w-12' : ''}`}>
      {/* Email Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-start justify-between mb-4">
          <div className={`flex-1 min-w-0 ${isMinimized ? 'hidden' : ''}`}>
            <h2 className="text-lg font-semibold mb-1 pr-4">{email.subject}</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="truncate">From: {email.from}</p>
              <p className="truncate">To: {email.to.join(', ')}</p>
              <p>Date: {new Date(email.date).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isMinimized && isProcessingEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={processEmailContent}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                {isProcessing ? 'Processing...' : 'AI Process'}
              </Button>
            )}
            {!isMinimized && processedContent && (
              <Button
                variant={showProcessed ? "default" : "outline"}
                size="sm"
                onClick={() => setShowProcessed(!showProcessed)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {showProcessed ? 'Show Raw' : 'Show Processed'}
              </Button>
            )}
            {onMinimizeToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMinimizeToggle}
                title={isMinimized ? "Expand Email" : "Minimize Email"}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                title="Close Email"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {isMinimized && (
          <div className="text-center">
            <Mail className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground mt-1 truncate">{email.subject}</p>
          </div>
        )}
      </div>

      {/* Email Content */}
      {!isMinimized && (
        <ScrollArea className="flex-1 p-4">
          {showProcessed && processedContent ? (
            <div className="space-y-6">
              {/* Readability Score */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Readability: {processedContent.readabilityScore}/10
                </Badge>
                <Badge variant="outline">
                  <Brain className="h-3 w-3 mr-1" />
                  AI Processed
                </Badge>
              </div>

              {/* Key Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Key Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Main Content:</p>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                      {processedContent.keyInformation.mainContent}
                    </p>
                  </div>

                  {processedContent.keyInformation.actionItems.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        Action Items:
                      </p>
                      <ul className="text-sm space-y-1">
                        {processedContent.keyInformation.actionItems.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-muted-foreground">-</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {processedContent.keyInformation.importantDates.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Important Dates:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {processedContent.keyInformation.importantDates.map((date, index) => (
                          <Badge key={index} variant="outline">{date}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {processedContent.keyInformation.contactInfo.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Contact Information:
                      </p>
                      <div className="space-y-1">
                        {processedContent.keyInformation.contactInfo.map((contact, index) => (
                          <p key={index} className="text-sm text-muted-foreground">{contact}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cleaned Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cleaned Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none text-sm">
                    <div className="whitespace-pre-wrap bg-muted/50 p-4 rounded">
                      {processedContent.cleanedBody}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Signature */}
              {processedContent.extractedSignature && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Signature
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                      {processedContent.extractedSignature}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Attachments */}
              {processedContent.attachmentsSummary.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Attachments Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      {processedContent.attachmentsSummary.map((attachment, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-muted-foreground">📎</span>
                          {attachment}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* Raw Email Content */
            <div className="prose max-w-none">
              <SafeHtmlRenderer 
                html={email.body || email.snippet || ''}
                type="email"
              />
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
};

export default EmailContentProcessor;