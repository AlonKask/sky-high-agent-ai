import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown,
  ChevronUp,
  Copy,
  Mail,
  Phone,
  Globe,
  MapPin,
  User,
  Building2,
  DollarSign,
  Plane,
  Calendar,
  ImageIcon,
  Receipt,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastHelpers } from '@/utils/toastHelpers';
import DOMPurify from 'dompurify';

interface ParsedEmailData {
  cleanText: string;
  originalHtml: string;
  contactInfo: ContactInfo[];
  financialData: FinancialItem[];
  flightData: FlightItem[];
  businessInfo: BusinessInfo | null;
  bookingRefs: string[];
  images: ImageItem[];
  hasStructuredContent: boolean;
}

interface ContactInfo {
  type: 'phone' | 'email' | 'website';
  value: string;
  label?: string;
}

interface FinancialItem {
  type: 'price' | 'profit' | 'fee' | 'total';
  amount: number;
  currency: string;
  label: string;
}

interface FlightItem {
  airline: string;
  flightNumber: string;
  route: string;
  date?: string;
  bookingRef?: string;
}

interface BusinessInfo {
  name?: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

interface ImageItem {
  type: 'logo' | 'signature' | 'content' | 'attachment';
  description: string;
  alt?: string;
}

interface UnifiedEmailRendererProps {
  emailBody: string;
  subject?: string;
  className?: string;
  enableExtraction?: boolean;
}

const UnifiedEmailRenderer: React.FC<UnifiedEmailRendererProps> = ({
  emailBody,
  subject = '',
  className,
  enableExtraction = true
}) => {
  const [showRawHtml, setShowRawHtml] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    contact: true,
    financial: true,
    flight: true,
    business: true,
    booking: true,
    images: false
  });

  const parsedData = useMemo(() => {
    return parseEmailContent(emailBody, subject, enableExtraction);
  }, [emailBody, subject, enableExtraction]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastHelpers.success(`${label} copied to clipboard`);
    } catch (error) {
      toastHelpers.error('Failed to copy to clipboard');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD'
      }).format(amount);
    } catch {
      return `${currency}${amount}`;
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (showRawHtml) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <Badge variant="outline">Raw HTML Content</Badge>
          <Button variant="ghost" size="sm" onClick={() => setShowRawHtml(false)}>
            <Eye className="h-4 w-4 mr-2" />
            Show Formatted View
          </Button>
        </div>
        <div className="bg-muted/30 p-4 rounded-lg border">
          <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
            {parsedData.originalHtml}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            Enhanced Email View
          </Badge>
          {parsedData.hasStructuredContent && (
            <Badge variant="outline">
              {parsedData.contactInfo.length + parsedData.financialData.length + parsedData.flightData.length} Items Found
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowRawHtml(true)}>
          <EyeOff className="h-4 w-4 mr-2" />
          Show Raw HTML
        </Button>
      </div>

      {/* Main Email Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none text-sm">
            <div 
              className="whitespace-pre-wrap leading-relaxed"
              style={{ wordBreak: 'break-word' }}
            >
              {parsedData.cleanText}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      {parsedData.businessInfo && (
        <Collapsible open={expandedSections.business} onOpenChange={() => toggleSection('business')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Business Contact
                  </div>
                  {expandedSections.business ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3">
                {parsedData.businessInfo.name && (
                  <div>
                    <h4 className="font-semibold">{parsedData.businessInfo.name}</h4>
                    {parsedData.businessInfo.title && (
                      <p className="text-sm text-muted-foreground">{parsedData.businessInfo.title}</p>
                    )}
                  </div>
                )}
                {parsedData.businessInfo.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{parsedData.businessInfo.company}</span>
                  </div>
                )}
                {parsedData.businessInfo.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono">{formatPhone(parsedData.businessInfo.phone)}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(parsedData.businessInfo!.phone!, 'Phone number')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {parsedData.businessInfo.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{parsedData.businessInfo.email}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(parsedData.businessInfo!.email!, 'Email')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {parsedData.businessInfo.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={parsedData.businessInfo.website.startsWith('http') ? parsedData.businessInfo.website : `https://${parsedData.businessInfo.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {parsedData.businessInfo.website}
                    </a>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                {parsedData.businessInfo.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{parsedData.businessInfo.address}</span>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Financial Data */}
      {parsedData.financialData.length > 0 && (
        <Collapsible open={expandedSections.financial} onOpenChange={() => toggleSection('financial')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Financial Information ({parsedData.financialData.length})
                  </div>
                  {expandedSections.financial ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {parsedData.financialData.map((item, index) => (
                    <div key={index} className="bg-muted/30 p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        {item.type === 'profit' ? <Receipt className="h-4 w-4 text-success" /> : 
                         item.type === 'fee' ? <CreditCard className="h-4 w-4 text-info" /> :
                         <DollarSign className="h-4 w-4 text-warning" />}
                        <span className="text-xs font-medium capitalize">{item.type}</span>
                      </div>
                      <div className="text-lg font-bold">
                        {formatCurrency(item.amount, item.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.label}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(formatCurrency(item.amount, item.currency), item.label)}
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
      {parsedData.flightData.length > 0 && (
        <Collapsible open={expandedSections.flight} onOpenChange={() => toggleSection('flight')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Flight Information ({parsedData.flightData.length})
                  </div>
                  {expandedSections.flight ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-3">
                  {parsedData.flightData.map((flight, index) => (
                    <div key={index} className="bg-muted/30 p-3 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{flight.airline} {flight.flightNumber}</Badge>
                          <span className="text-sm font-medium">{flight.route}</span>
                        </div>
                        {flight.date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {flight.date}
                          </div>
                        )}
                      </div>
                      {flight.bookingRef && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Booking:</span>
                          <span className="text-xs font-mono">{flight.bookingRef}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(flight.bookingRef!, 'Booking reference')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Booking References */}
      {parsedData.bookingRefs.length > 0 && (
        <Collapsible open={expandedSections.booking} onOpenChange={() => toggleSection('booking')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Booking References ({parsedData.bookingRefs.length})
                  </div>
                  {expandedSections.booking ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {parsedData.bookingRefs.map((ref, index) => (
                    <div key={index} className="flex items-center gap-1 bg-muted/50 px-3 py-2 rounded-lg border">
                      <span className="font-mono font-semibold">{ref}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(ref, 'Booking reference')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Contact Information */}
      {parsedData.contactInfo.length > 0 && (
        <Collapsible open={expandedSections.contact} onOpenChange={() => toggleSection('contact')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Information ({parsedData.contactInfo.length})
                  </div>
                  {expandedSections.contact ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2">
                  {parsedData.contactInfo.map((contact, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {contact.type === 'phone' ? <Phone className="h-4 w-4 text-muted-foreground" /> :
                       contact.type === 'email' ? <Mail className="h-4 w-4 text-muted-foreground" /> :
                       <Globe className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm">{contact.value}</span>
                      {contact.label && (
                        <Badge variant="outline" className="text-xs">{contact.label}</Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(contact.value, contact.type)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Images */}
      {parsedData.images.length > 0 && (
        <Collapsible open={expandedSections.images} onOpenChange={() => toggleSection('images')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Images ({parsedData.images.length})
                  </div>
                  {expandedSections.images ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {parsedData.images.map((image, index) => (
                    <div key={index} className="bg-muted/30 p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">{image.type}</Badge>
                      </div>
                      <p className="text-sm">{image.description}</p>
                      {image.alt && (
                        <p className="text-xs text-muted-foreground mt-1">{image.alt}</p>
                      )}
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

// Enhanced email parsing function
function parseEmailContent(emailBody: string, subject: string = '', enableExtraction: boolean = true): ParsedEmailData {
  try {
    // Handle empty content gracefully
    if (!emailBody || typeof emailBody !== 'string') {
      return createEmptyParseResult();
    }

    // Sanitize HTML first
    const sanitizedHtml = DOMPurify.sanitize(emailBody, {
      ALLOWED_TAGS: ['p', 'div', 'br', 'span', 'strong', 'b', 'em', 'i', 'a', 'img', 'table', 'tr', 'td', 'th'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title']
    });

    // Convert HTML to clean text
    const cleanText = htmlToText(sanitizedHtml);
    
    if (!enableExtraction) {
      return {
        cleanText,
        originalHtml: sanitizedHtml,
        contactInfo: [],
        financialData: [],
        flightData: [],
        businessInfo: null,
        bookingRefs: [],
        images: [],
        hasStructuredContent: false
      };
    }

    // Extract structured data
    const contactInfo = extractContactInfo(cleanText);
    const financialData = extractFinancialData(cleanText);
    const flightData = extractFlightData(cleanText);
    const businessInfo = extractBusinessInfo(cleanText);
    const bookingRefs = extractBookingReferences(cleanText);
    const images = extractImages(sanitizedHtml);

    const hasStructuredContent = contactInfo.length > 0 || financialData.length > 0 || 
                                 flightData.length > 0 || businessInfo !== null || 
                                 bookingRefs.length > 0 || images.length > 0;

    return {
      cleanText,
      originalHtml: sanitizedHtml,
      contactInfo,
      financialData,
      flightData,
      businessInfo,
      bookingRefs,
      images,
      hasStructuredContent
    };
  } catch (error) {
    console.error('Error parsing email content:', error);
    return createEmptyParseResult(emailBody);
  }
}

function createEmptyParseResult(fallbackText: string = ''): ParsedEmailData {
  return {
    cleanText: fallbackText,
    originalHtml: fallbackText,
    contactInfo: [],
    financialData: [],
    flightData: [],
    businessInfo: null,
    bookingRefs: [],
    images: [],
    hasStructuredContent: false
  };
}

function htmlToText(html: string): string {
  try {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
  } catch (error) {
    console.error('Error converting HTML to text:', error);
    return html;
  }
}

function extractContactInfo(text: string): ContactInfo[] {
  const contacts: ContactInfo[] = [];
  
  // Phone numbers
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  let match;
  while ((match = phoneRegex.exec(text)) !== null) {
    contacts.push({
      type: 'phone',
      value: match[0].trim(),
      label: 'Phone'
    });
  }

  // Email addresses
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  while ((match = emailRegex.exec(text)) !== null) {
    contacts.push({
      type: 'email',
      value: match[1],
      label: 'Email'
    });
  }

  // Websites
  const websiteRegex = /((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/g;
  while ((match = websiteRegex.exec(text)) !== null) {
    contacts.push({
      type: 'website',
      value: match[1],
      label: 'Website'
    });
  }

  return contacts;
}

function extractFinancialData(text: string): FinancialItem[] {
  const financial: FinancialItem[] = [];
  
  // Price patterns
  const pricePatterns = [
    { regex: /(?:Net Price|Selling Price|Total|Amount):\s*[\$€£¥]?([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY|CAD)?/gi, type: 'price' as const },
    { regex: /(?:Clean Profit|Profit After|Profit):\s*[\$€£¥]?([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY|CAD)?/gi, type: 'profit' as const },
    { regex: /(?:Service Fee|IF|CK|Tips|TP|CFAR|FT|Fee):\s*[\$€£¥]?([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY|CAD)?/gi, type: 'fee' as const }
  ];

  pricePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        financial.push({
          type: pattern.type,
          amount,
          currency: match[2] || 'USD',
          label: match[0].trim()
        });
      }
    }
  });

  return financial;
}

function extractFlightData(text: string): FlightItem[] {
  const flights: FlightItem[] = [];
  
  // Flight number pattern (e.g., "AA 123", "EK 456")
  const flightRegex = /([A-Z]{2,3})\s*(\d{1,4})/g;
  let match;
  while ((match = flightRegex.exec(text)) !== null) {
    flights.push({
      airline: match[1],
      flightNumber: match[2],
      route: 'Unknown'
    });
  }

  // Route pattern (e.g., "JFKLAX", "NYC-LAX")
  const routeRegex = /([A-Z]{3})[-\s]?([A-Z]{3})/g;
  while ((match = routeRegex.exec(text)) !== null) {
    if (flights.length > 0) {
      flights[flights.length - 1].route = `${match[1]}-${match[2]}`;
    } else {
      flights.push({
        airline: 'Unknown',
        flightNumber: 'Unknown',
        route: `${match[1]}-${match[2]}`
      });
    }
  }

  return flights;
}

function extractBusinessInfo(text: string): BusinessInfo | null {
  const businessInfo: BusinessInfo = {};
  
  // Extract email from signature-like areas
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    businessInfo.email = emailMatch[1];
  }

  // Extract phone from signature areas
  const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
  if (phoneMatch) {
    businessInfo.phone = phoneMatch[0].trim();
  }

  // Extract website
  const websiteMatch = text.match(/((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/);
  if (websiteMatch) {
    businessInfo.website = websiteMatch[1];
  }

  return Object.keys(businessInfo).length > 0 ? businessInfo : null;
}

function extractBookingReferences(text: string): string[] {
  const refs: string[] = [];
  
  // Booking reference patterns
  const refPatterns = [
    /(?:EK #:|Booking|PNR|Reference|Conf|Confirmation):\s*([A-Z0-9]{5,8})/gi,
    /\b([A-Z]{6})\b/g // 6-letter codes
  ];

  refPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const ref = match[1].trim();
      if (ref && !refs.includes(ref)) {
        refs.push(ref);
      }
    }
  });

  return refs;
}

function extractImages(html: string): ImageItem[] {
  const images: ImageItem[] = [];
  
  // Extract image references from HTML
  const imgRegex = /<img[^>]*alt=["']([^"']*)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const alt = match[1];
    images.push({
      type: categorizeImageType(alt),
      description: alt || 'Image',
      alt
    });
  }

  // Extract [image: ...] patterns from text
  const textImageRegex = /\[image:\s*([^\]]+)\]/gi;
  while ((match = textImageRegex.exec(html)) !== null) {
    const description = match[1].trim();
    images.push({
      type: categorizeImageType(description),
      description,
      alt: description
    });
  }

  return images;
}

function categorizeImageType(description: string): 'logo' | 'signature' | 'content' | 'attachment' {
  const lower = description.toLowerCase();
  if (lower.includes('logo') || lower.includes('brand')) return 'logo';
  if (lower.includes('signature') || lower.includes('sign')) return 'signature';
  if (lower.includes('photo') || lower.includes('picture')) return 'content';
  return 'attachment';
}

export default UnifiedEmailRenderer;