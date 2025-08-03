import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown,
  ChevronUp,
  Copy,
  DollarSign,
  Plane,
  User,
  Phone,
  Mail,
  Globe,
  MapPin,
  Building2,
  ExternalLink,
  Receipt,
  CreditCard,
  Sparkles,
  ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastHelpers } from '@/utils/toastHelpers';
import { sanitizeEmailContent } from '@/utils/sanitization';
import DOMPurify from 'dompurify';

interface SafeEmailRendererProps {
  emailBody: string;
  subject?: string;
  className?: string;
  showRawContent?: boolean;
  onToggleRaw?: () => void;
}

interface ExtractedData {
  financialData: Array<{
    type: string;
    amount: number;
    currency: string;
    label: string;
  }>;
  bookingRefs: string[];
  contactInfo: Array<{
    type: string;
    value: string;
    label?: string;
  }>;
  businessInfo: {
    name?: string;
    title?: string;
    company?: string;
    phone?: string[];
    email?: string;
    website?: string;
    address?: string;
  } | null;
  images: Array<{
    src: string;
    alt?: string;
    width?: string;
    height?: string;
    type: 'signature' | 'header' | 'content' | 'attachment';
  }>;
}

const SafeEmailRenderer: React.FC<SafeEmailRendererProps> = ({
  emailBody,
  subject = '',
  className,
  showRawContent = false,
  onToggleRaw
}) => {
  
  const [expandedSections, setExpandedSections] = useState({
    signature: true,
    financial: true,
    booking: true,
    images: true
  });

  const extractedData = useMemo(() => {
    return extractEmailData(emailBody);
  }, [emailBody]);

  const sanitizedHtml = useMemo(() => {
    return sanitizeEmailContent(emailBody);
  }, [emailBody]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toastHelpers.success("Copied", { description: `${label} copied to clipboard` });
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
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
        <div 
          className="bg-muted/30 p-4 rounded-lg border text-sm"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
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
            Enhanced Email View
          </Badge>
          <Badge variant="outline">
            {extractedData.financialData.length + extractedData.bookingRefs.length + extractedData.images.length} Items Extracted
          </Badge>
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
          <div 
            className="prose max-w-none text-sm leading-relaxed email-content"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </CardContent>
      </Card>

      {/* Business Signature */}
      {extractedData.businessInfo && (
        <Collapsible open={expandedSections.signature} onOpenChange={() => toggleSection('signature')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Business Contact
                  </div>
                  {expandedSections.signature ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {extractedData.businessInfo.name && (
                      <div>
                        <h4 className="font-semibold text-lg">{extractedData.businessInfo.name}</h4>
                        {extractedData.businessInfo.title && (
                          <p className="text-muted-foreground">{extractedData.businessInfo.title}</p>
                        )}
                        {extractedData.businessInfo.company && (
                          <div className="flex items-center gap-2 mt-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{extractedData.businessInfo.company}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      {extractedData.businessInfo.phone?.map((phone, index) => (
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
                      
                      {extractedData.businessInfo.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{extractedData.businessInfo.email}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(extractedData.businessInfo!.email!, 'Email')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      {extractedData.businessInfo.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={extractedData.businessInfo.website.startsWith('http') 
                              ? extractedData.businessInfo.website 
                              : `https://${extractedData.businessInfo.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {extractedData.businessInfo.website}
                          </a>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      
                      {extractedData.businessInfo.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="text-sm">{extractedData.businessInfo.address}</span>
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
      {extractedData.financialData.length > 0 && (
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
                  {extractedData.financialData.map((item, index) => (
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

      {/* Booking References */}
      {extractedData.bookingRefs.length > 0 && (
        <Collapsible open={expandedSections.booking} onOpenChange={() => toggleSection('booking')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5" />
                    Booking References
                  </div>
                  {expandedSections.booking ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {extractedData.bookingRefs.map((ref, index) => (
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

      {/* Images */}
      {extractedData.images.length > 0 && (
        <Collapsible open={expandedSections.images} onOpenChange={() => toggleSection('images')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Images ({extractedData.images.length})
                  </div>
                  {expandedSections.images ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {extractedData.images.map((image, index) => (
                    <div key={index} className="bg-muted/30 p-3 rounded-lg border">
                      <div className="aspect-square bg-background rounded-md overflow-hidden mb-2">
                        <img
                          src={image.src}
                          alt={image.alt || `Email image ${index + 1}`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-muted-foreground"><svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {image.type}
                        </Badge>
                        {image.alt && (
                          <p className="text-xs text-muted-foreground">{image.alt}</p>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(image.src, 'Image URL')}
                          className="h-6 text-xs w-full"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy URL
                        </Button>
                      </div>
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

// Helper functions
function cleanEmailContent(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  try {
    // First sanitize with DOMPurify to remove dangerous content
    const sanitized = DOMPurify.sanitize(html, { 
      ALLOWED_TAGS: ['p', 'div', 'br', 'span', 'strong', 'b', 'em', 'i', 'a'],
      ALLOWED_ATTR: ['href']
    });

    // Convert HTML to readable text while preserving structure
    let cleaned = sanitized
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
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
      .replace(/&quot;/gi, '"');

    // Clean up whitespace
    cleaned = cleaned
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/^\s+|\s+$/gm, '')
      .trim();

    return cleaned;
  } catch (error) {
    console.error('Error cleaning email content:', error);
    return html;
  }
}

function extractEmailData(content: string): ExtractedData {
  const cleanContent = cleanEmailContent(content);
  
  return {
    financialData: extractFinancialData(cleanContent),
    bookingRefs: extractBookingReferences(cleanContent),
    contactInfo: extractContactInfo(cleanContent),
    businessInfo: extractBusinessSignature(cleanContent),
    images: extractImages(content)
  };
}

function extractFinancialData(content: string) {
  const financial = [];
  
  const patterns = {
    profit: /(?:Clean Profit|Profit After|Profit):\s*\*?[\$€£¥]?([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY)?\s*\*?/gi,
    price: /(?:Net Price|Selling Price|Total|Amount|Price):\s*[\$€£¥]?([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY)?/gi,
    fee: /(?:Service Fee|IF|CK|Tips|TP|CFAR|FT):\s*[\$€£¥]?([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY)?/gi
  };

  Object.entries(patterns).forEach(([type, pattern]) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        financial.push({
          type,
          amount,
          currency: match[2] || 'USD',
          label: match[0].trim()
        });
      }
    }
  });

  return financial;
}

function extractBookingReferences(content: string) {
  const refs = [];
  const patterns = [
    /(?:EK #|Booking|PNR|Reference):\s*([A-Z0-9]{4,8})/gi,
    /\b([A-Z]{6})\b/g,
    /\*([A-Z0-9]{5,7})\*/g
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const ref = match[1];
      if (ref && !refs.includes(ref)) {
        refs.push(ref);
      }
    }
  });

  return refs;
}

function extractContactInfo(content: string) {
  const contacts = [];
  
  const phonePattern = /\+?1?\s*\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})(?:\s*-?\s*ext\.?\s*(\d+))?/gi;
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const websitePattern = /((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/gi;

  let match;
  while ((match = phonePattern.exec(content)) !== null) {
    contacts.push({
      type: 'phone',
      value: match[0],
      label: match[4] ? `ext. ${match[4]}` : undefined
    });
  }

  while ((match = emailPattern.exec(content)) !== null) {
    contacts.push({
      type: 'email',
      value: match[1]
    });
  }

  while ((match = websitePattern.exec(content)) !== null) {
    contacts.push({
      type: 'website',
      value: match[1]
    });
  }

  return contacts;
}

function extractBusinessSignature(content: string) {
  const lines = content.split('\n').filter(line => line.trim());
  
  // Look for signature in last 15 lines
  const signatureLines = lines.slice(-15);
  const signature: any = {};

  for (const line of signatureLines) {
    const trimmed = line.trim();
    
    // Extract name (typically stands alone, proper case)
    if (!signature.name && /^[A-Z][a-z]+(?: [A-Z][a-z]+)*$/.test(trimmed) && 
        trimmed.length > 2 && trimmed.length < 50 && 
        !trimmed.includes('@') && !trimmed.includes('www')) {
      signature.name = trimmed;
      continue;
    }

    // Extract title
    if (!signature.title && (trimmed.toLowerCase().includes('expert') || 
        trimmed.toLowerCase().includes('agent') || 
        trimmed.toLowerCase().includes('manager'))) {
      signature.title = trimmed;
      continue;
    }

    // Extract phone
    const phoneMatch = trimmed.match(/\+?1?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch && !signature.phone) {
      signature.phone = [phoneMatch[0]];
    }

    // Extract email
    const emailMatch = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && !signature.email) {
      signature.email = emailMatch[1];
    }

    // Extract website
    const websiteMatch = trimmed.match(/((?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/);
    if (websiteMatch && !signature.website) {
      signature.website = websiteMatch[1];
    }

    // Extract address
    if (!signature.address && (trimmed.toLowerCase().includes('avenue') || 
        trimmed.toLowerCase().includes('street') || 
        trimmed.toLowerCase().includes('miami'))) {
      signature.address = trimmed;
    }
  }

  return Object.keys(signature).length > 0 ? signature : null;
}

function extractImages(content: string) {
  const images = [];
  const imgPattern = /<img[^>]+>/gi;
  const matches = content.match(imgPattern) || [];
  
  matches.forEach((imgTag, index) => {
    const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
    const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
    const widthMatch = imgTag.match(/width=["']([^"']+)["']/i);
    const heightMatch = imgTag.match(/height=["']([^"']+)["']/i);
    
    if (srcMatch && srcMatch[1]) {
      // Categorize image type based on src URL and context
      let type: 'signature' | 'header' | 'content' | 'attachment' = 'content';
      const src = srcMatch[1].toLowerCase();
      
      if (src.includes('signature') || src.includes('logo') || content.toLowerCase().includes('signature')) {
        type = 'signature';
      } else if (src.includes('header') || src.includes('banner')) {
        type = 'header';
      } else if (src.includes('attachment') || src.includes('upload')) {
        type = 'attachment';
      }
      
      images.push({
        src: srcMatch[1],
        alt: altMatch ? altMatch[1] : undefined,
        width: widthMatch ? widthMatch[1] : undefined,
        height: heightMatch ? heightMatch[1] : undefined,
        type
      });
    }
  });
  
  return images;
}

export default SafeEmailRenderer;