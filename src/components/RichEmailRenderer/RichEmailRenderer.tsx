import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  User, 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  MapPin,
  DollarSign,
  Plane,
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  Quote,
  Receipt,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailContentParser, type ParsedEmailContent } from './EmailContentParser';
import { useToast } from '@/hooks/use-toast';

interface RichEmailRendererProps {
  emailBody: string;
  subject?: string;
  className?: string;
  showRawContent?: boolean;
  onToggleRaw?: () => void;
}

const RichEmailRenderer: React.FC<RichEmailRendererProps> = ({
  emailBody,
  subject = '',
  className,
  showRawContent = false,
  onToggleRaw
}) => {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState({
    signature: true,
    financial: true,
    flights: true,
    images: false,
    quoted: false,
    thread: false
  });

  const parsedContent = useMemo(() => {
    return EmailContentParser.parseEmailContent(emailBody, subject);
  }, [emailBody, subject]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    });
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (showRawContent) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <Badge variant="outline">Raw Content</Badge>
          {onToggleRaw && (
            <Button variant="ghost" size="sm" onClick={onToggleRaw}>
              <Sparkles className="h-4 w-4 mr-2" />
              Show Rich View
            </Button>
          )}
        </div>
        <div className="bg-muted/30 p-4 rounded-lg border font-mono text-sm whitespace-pre-wrap">
          {parsedContent.cleanedBody}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            Rich Email View
          </Badge>
          {parsedContent.structuredData.length > 0 && (
            <Badge variant="outline">
              {parsedContent.structuredData.length} Structured Elements
            </Badge>
          )}
        </div>
        {onToggleRaw && (
          <Button variant="ghost" size="sm" onClick={onToggleRaw}>
            Show Raw Content
          </Button>
        )}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none text-sm leading-relaxed">
            {parsedContent.cleanedBody.split('\n\n').map((paragraph, index) => (
              <p key={index} className="mb-4 last:mb-0">
                {paragraph.split('\n').map((line, lineIndex) => (
                  <React.Fragment key={lineIndex}>
                    {line}
                    {lineIndex < paragraph.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Business Signature */}
      {parsedContent.businessSignature && (
        <Collapsible open={expandedSections.signature} onOpenChange={() => toggleSection('signature')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Business Signature
                  </div>
                  {expandedSections.signature ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-lg">{parsedContent.businessSignature.name}</h4>
                      {parsedContent.businessSignature.title && (
                        <p className="text-muted-foreground">{parsedContent.businessSignature.title}</p>
                      )}
                      {parsedContent.businessSignature.company && (
                        <div className="flex items-center gap-2 mt-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{parsedContent.businessSignature.company}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {parsedContent.businessSignature.phone?.map((phone, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-mono">{formatPhoneNumber(phone)}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(phone, 'Phone number')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      
                      {parsedContent.businessSignature.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{parsedContent.businessSignature.email}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(parsedContent.businessSignature!.email!, 'Email')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      {parsedContent.businessSignature.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={parsedContent.businessSignature.website.startsWith('http') 
                              ? parsedContent.businessSignature.website 
                              : `https://${parsedContent.businessSignature.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {parsedContent.businessSignature.website}
                          </a>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      
                      {parsedContent.businessSignature.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="text-sm">{parsedContent.businessSignature.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Financial Data */}
      {parsedContent.financialData.length > 0 && (
        <Collapsible open={expandedSections.financial} onOpenChange={() => toggleSection('financial')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Information
                  </div>
                  {expandedSections.financial ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {parsedContent.financialData.map((item, index) => (
                    <div key={index} className="bg-muted/30 p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        {item.type === 'profit' ? <Receipt className="h-4 w-4 text-green-500" /> : 
                         item.type === 'fee' ? <CreditCard className="h-4 w-4 text-blue-500" /> :
                         <DollarSign className="h-4 w-4 text-orange-500" />}
                        <span className="text-sm font-medium capitalize">{item.type}</span>
                      </div>
                      <div className="text-lg font-bold">
                        {formatCurrency(item.amount, item.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.label}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(item.amount.toString(), `${item.type} amount`)}
                        className="mt-2 h-6 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Flight Information */}
      {parsedContent.flightInfo.length > 0 && (
        <Collapsible open={expandedSections.flights} onOpenChange={() => toggleSection('flights')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5" />
                    Flight Information
                  </div>
                  {expandedSections.flights ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  {parsedContent.flightInfo.map((flight, index) => (
                    <div key={index} className="bg-muted/30 p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Plane className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold">{flight.flightNumber}</span>
                          {flight.airline && <Badge variant="outline">{flight.airline}</Badge>}
                        </div>
                        {flight.class && <Badge variant="secondary">{flight.class}</Badge>}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {flight.route && (
                          <div>
                            <span className="text-muted-foreground">Route:</span>
                            <div className="font-medium">{flight.route}</div>
                          </div>
                        )}
                        {flight.date && (
                          <div>
                            <span className="text-muted-foreground">Date:</span>
                            <div className="font-medium">{flight.date}</div>
                          </div>
                        )}
                        {flight.departure && (
                          <div>
                            <span className="text-muted-foreground">Departure:</span>
                            <div className="font-medium">{flight.departure}</div>
                          </div>
                        )}
                        {flight.arrival && (
                          <div>
                            <span className="text-muted-foreground">Arrival:</span>
                            <div className="font-medium">{flight.arrival}</div>
                          </div>
                        )}
                      </div>
                      
                      {flight.bookingRef && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Booking Reference:</span>
                            <span className="font-mono font-medium">{flight.bookingRef}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => copyToClipboard(flight.bookingRef!, 'Booking reference')}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {parsedContent.bookingReferences.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Additional Booking References:</h4>
                      <div className="flex flex-wrap gap-2">
                        {parsedContent.bookingReferences.map((ref, index) => (
                          <div key={index} className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                            <span className="font-mono text-sm">{ref}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => copyToClipboard(ref, 'Booking reference')}
                              className="h-5 w-5 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Images */}
      {parsedContent.extractedImages.length > 0 && (
        <Collapsible open={expandedSections.images} onOpenChange={() => toggleSection('images')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Images ({parsedContent.extractedImages.length})
                  </div>
                  {expandedSections.images ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {parsedContent.extractedImages.map((image, index) => (
                    <div key={index} className="bg-muted/30 p-3 rounded-lg border text-center">
                      <div className="w-12 h-12 mx-auto mb-2 bg-muted rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <Badge variant="outline" className="text-xs mb-1">
                        {image.type}
                      </Badge>
                      {image.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {image.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Email Thread */}
      {parsedContent.threadMessages.length > 1 && (
        <Collapsible open={expandedSections.thread} onOpenChange={() => toggleSection('thread')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Email Thread ({parsedContent.threadMessages.length} messages)
                  </div>
                  {expandedSections.thread ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-3">
                  {parsedContent.threadMessages.map((message, index) => (
                    <div 
                      key={message.id} 
                      className={cn(
                        "p-3 rounded-lg border",
                        message.isQuoted ? "bg-muted/30 border-l-4 border-l-primary/30" : "bg-background"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{message.from}</span>
                        {message.isQuoted && <Badge variant="outline" className="text-xs">Quoted</Badge>}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Quoted Sections */}
      {parsedContent.quotedSections.length > 0 && (
        <Collapsible open={expandedSections.quoted} onOpenChange={() => toggleSection('quoted')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Quote className="h-5 w-5" />
                    Quoted Text ({parsedContent.quotedSections.length})
                  </div>
                  {expandedSections.quoted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-3">
                  {parsedContent.quotedSections.map((quote) => (
                    <div 
                      key={quote.id}
                      className="p-3 rounded-lg bg-muted/30 border-l-4 border-l-muted-foreground/30"
                      style={{ marginLeft: `${quote.level * 12}px` }}
                    >
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {quote.content}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};

export default RichEmailRenderer;