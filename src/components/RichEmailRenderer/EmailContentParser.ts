export interface ParsedEmailContent {
  cleanedBody: string;
  extractedImages: ImageInfo[];
  businessSignature: BusinessSignature | null;
  structuredData: StructuredData[];
  threadMessages: ThreadMessage[];
  quotedSections: QuotedSection[];
  contactInfo: ContactInfo[];
  financialData: FinancialData[];
  flightInfo: FlightInfo[];
  bookingReferences: string[];
}

export interface ImageInfo {
  id: string;
  type: 'photo' | 'icon' | 'logo' | 'attachment';
  alt?: string;
  src?: string;
  cid?: string;
  inline: boolean;
  description?: string;
}

export interface BusinessSignature {
  name: string;
  title?: string;
  company?: string;
  phone?: string[];
  email?: string;
  website?: string;
  address?: string;
  logoUrl?: string;
}

export interface StructuredData {
  type: 'reservation' | 'financial' | 'booking' | 'contact' | 'date';
  data: Record<string, any>;
  confidence: number;
}

export interface ThreadMessage {
  id: string;
  from: string;
  date: string;
  content: string;
  isQuoted: boolean;
}

export interface QuotedSection {
  id: string;
  content: string;
  level: number;
  originalSender?: string;
}

export interface ContactInfo {
  type: 'phone' | 'email' | 'website' | 'address';
  value: string;
  label?: string;
}

export interface FinancialData {
  type: 'price' | 'profit' | 'fee' | 'commission';
  amount: number;
  currency: string;
  label: string;
}

export interface FlightInfo {
  flightNumber?: string;
  airline?: string;
  route?: string;
  departure?: string;
  arrival?: string;
  date?: string;
  class?: string;
  bookingRef?: string;
}

export class EmailContentParser {
  private static readonly IMAGE_PATTERNS = {
    inline: /\[image:\s*([^\]]+)\]/gi,
    cid: /cid:([^"'>\s]+)/gi,
    attachment: /\[image:\s*(photo|icon|image\.png|image\.jpg)\]/gi
  };

  private static readonly FINANCIAL_PATTERNS = {
    price: /(?:Net Price|Selling Price|Total|Amount):\s*[\$€£¥]?([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY)?/gi,
    profit: /(?:Clean Profit|Profit After|Profit):\s*[\$€£¥]?([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY)?/gi,
    fee: /(?:Service Fee|IF|CK|Tips|TP|CFAR|FT):\s*[\$€£¥]?([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY)?/gi
  };

  private static readonly FLIGHT_PATTERNS = {
    flightNumber: /([A-Z]{2,3})\s*(\d{1,4})/g,
    route: /([A-Z]{3})([A-Z]{3})/g,
    bookingRef: /(?:EK #:|Booking|PNR|Reference):\s*([A-Z0-9]{5,8})/gi
  };

  private static readonly CONTACT_PATTERNS = {
    phone: /\+?1?\s*\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})(?:\s*-?\s*ext\.?\s*(\d+))?/gi,
    email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    website: /((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/gi
  };

  static parseEmailContent(emailBody: string, subject: string = ''): ParsedEmailContent {
    const cleanedBody = this.cleanHtmlContent(emailBody);
    
    return {
      cleanedBody,
      extractedImages: this.extractImages(emailBody),
      businessSignature: this.extractBusinessSignature(cleanedBody),
      structuredData: this.extractStructuredData(cleanedBody, subject),
      threadMessages: this.parseEmailThread(emailBody),
      quotedSections: this.extractQuotedSections(cleanedBody),
      contactInfo: this.extractContactInfo(cleanedBody),
      financialData: this.extractFinancialData(cleanedBody),
      flightInfo: this.extractFlightInfo(cleanedBody),
      bookingReferences: this.extractBookingReferences(cleanedBody)
    };
  }

  private static cleanHtmlContent(html: string): string {
    try {
      // Handle empty or undefined content
      if (!html || typeof html !== 'string') {
        return '';
      }

      // Remove potentially dangerous content first
      let cleaned = html
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<head[^>]*>.*?<\/head>/gis, '')
        .replace(/<!--.*?-->/gs, '');

      // Extract images with proper handling
      const images = [];
      cleaned = cleaned.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, (match, src, alt) => {
        images.push({ src, alt: alt || 'Image' });
        return `[image: ${alt || 'image'}]`;
      });

      // Convert HTML structure to readable text with preserved formatting
      cleaned = cleaned
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/div>/gi, '\n')
        .replace(/<div[^>]*>/gi, '')
        .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1')
        .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
        .replace(/<[^>]+>/g, ' '); // Remove any remaining tags

      // Decode HTML entities
      cleaned = cleaned
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));

      // Clean up whitespace and formatting
      cleaned = cleaned
        .replace(/\n\s*\n\s*\n+/g, '\n\n') // Max 2 consecutive newlines
        .replace(/[ \t]+/g, ' ') // Collapse multiple spaces
        .replace(/^\s+|\s+$/gm, '') // Trim each line
        .trim();

      return cleaned;
    } catch (error) {
      console.error('Error cleaning HTML content:', error);
      return html; // Return original content if cleaning fails
    }
  }

  private static extractImages(content: string): ImageInfo[] {
    const images: ImageInfo[] = [];
    let match;

    // Extract [image: ...] patterns
    const imagePattern = /\[image:\s*([^\]]+)\]/gi;
    while ((match = imagePattern.exec(content)) !== null) {
      const description = match[1].trim();
      images.push({
        id: `img_${images.length}`,
        type: this.categorizeImageType(description),
        description,
        inline: true,
        alt: description
      });
    }

    return images;
  }

  private static categorizeImageType(description: string): 'photo' | 'icon' | 'logo' | 'attachment' {
    const desc = description.toLowerCase();
    if (desc.includes('photo') || desc.includes('picture')) return 'photo';
    if (desc.includes('icon')) return 'icon';
    if (desc.includes('logo')) return 'logo';
    return 'attachment';
  }

  private static extractBusinessSignature(content: string): BusinessSignature | null {
    const lines = content.split('\n').filter(line => line.trim());
    
    // Look for signature patterns in the last part of the email
    const signatureStart = this.findSignatureStart(lines);
    if (signatureStart === -1) return null;

    const signatureLines = lines.slice(signatureStart);
    const signature: Partial<BusinessSignature> = {};

    for (const line of signatureLines) {
      // Extract name (usually the first line or has title indicators)
      if (!signature.name && this.looksLikeName(line)) {
        signature.name = line.trim();
        continue;
      }

      // Extract title
      if (!signature.title && this.looksLikeTitle(line)) {
        signature.title = line.trim();
        continue;
      }

      // Extract phone numbers
      const phoneMatch = line.match(this.CONTACT_PATTERNS.phone);
      if (phoneMatch && !signature.phone) {
        signature.phone = [phoneMatch[0]];
      }

      // Extract email
      const emailMatch = line.match(this.CONTACT_PATTERNS.email);
      if (emailMatch && !signature.email) {
        signature.email = emailMatch[0];
      }

      // Extract website
      const websiteMatch = line.match(this.CONTACT_PATTERNS.website);
      if (websiteMatch && !signature.website) {
        signature.website = websiteMatch[0];
      }

      // Extract address (lines with common address indicators)
      if (!signature.address && this.looksLikeAddress(line)) {
        signature.address = line.trim();
      }
    }

    return signature.name ? signature as BusinessSignature : null;
  }

  private static findSignatureStart(lines: string[]): number {
    // Look for common signature separators or patterns
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
      const line = lines[i].toLowerCase();
      if (line.includes('--') || 
          line.includes('best regards') || 
          line.includes('thank you') ||
          line.includes('sincerely') ||
          this.looksLikeName(lines[i])) {
        return i;
      }
    }
    
    // Fallback: assume last 10 lines might contain signature
    return Math.max(0, lines.length - 10);
  }

  private static looksLikeName(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.length > 2 && 
           trimmed.length < 50 && 
           /^[A-Z][a-z]+(?: [A-Z][a-z]+)*$/.test(trimmed) &&
           !trimmed.includes('@') &&
           !trimmed.includes('www') &&
           !trimmed.includes('+1');
  }

  private static looksLikeTitle(line: string): boolean {
    const trimmed = line.trim().toLowerCase();
    return (trimmed.includes('expert') || 
            trimmed.includes('agent') || 
            trimmed.includes('manager') || 
            trimmed.includes('specialist') ||
            trimmed.includes('consultant')) &&
           trimmed.length < 100;
  }

  private static looksLikeAddress(line: string): boolean {
    const trimmed = line.trim().toLowerCase();
    return (trimmed.includes('avenue') || 
            trimmed.includes('street') || 
            trimmed.includes('suite') ||
            trimmed.includes('miami') ||
            trimmed.includes('beach')) &&
           trimmed.length < 200;
  }

  private static extractContactInfo(content: string): ContactInfo[] {
    const contacts: ContactInfo[] = [];

    // Extract phone numbers
    let match;
    while ((match = this.CONTACT_PATTERNS.phone.exec(content)) !== null) {
      contacts.push({
        type: 'phone',
        value: match[0],
        label: match[4] ? `ext. ${match[4]}` : undefined
      });
    }

    // Extract emails
    while ((match = this.CONTACT_PATTERNS.email.exec(content)) !== null) {
      contacts.push({
        type: 'email',
        value: match[1]
      });
    }

    // Extract websites
    while ((match = this.CONTACT_PATTERNS.website.exec(content)) !== null) {
      contacts.push({
        type: 'website',
        value: match[1]
      });
    }

    return contacts;
  }

  private static extractFinancialData(content: string): FinancialData[] {
    const financial: FinancialData[] = [];

    try {
      // Enhanced patterns for financial data extraction
      const patterns = {
        profit: /(?:Clean Profit|Profit After|Profit):\s*\*?[\$€£¥]?([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY)?\s*\*?/gi,
        price: /(?:Net Price|Selling Price|Total|Amount|Price):\s*[\$€£¥]?([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY)?/gi,
        fee: /(?:Service Fee|IF|CK|Tips|TP|CFAR|FT):\s*[\$€£¥]?([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY)?/gi
      };

      Object.entries(patterns).forEach(([type, pattern]) => {
        let match;
        const usedPattern = new RegExp(pattern.source, pattern.flags);
        while ((match = usedPattern.exec(content)) !== null) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(amount)) {
            const currency = match[2] || 'USD';
            financial.push({
              type: type as any,
              amount,
              currency,
              label: match[0].trim()
            });
          }
        }
      });

      return financial;
    } catch (error) {
      console.error('Error extracting financial data:', error);
      return [];
    }
  }

  private static extractFlightInfo(content: string): FlightInfo[] {
    const flights: FlightInfo[] = [];
    const lines = content.split('\n');

    // Look for flight reservation dumps
    for (const line of lines) {
      const flightMatch = line.match(/(\d+)([A-Z]{2,3})(\d+)([A-Z]{3})([A-Z]{3})(\d{2}[A-Z]{3})(\d{4})(\d{4})([A-Z])\(([A-Z])\)/);
      if (flightMatch) {
        flights.push({
          flightNumber: `${flightMatch[2]}${flightMatch[3]}`,
          airline: flightMatch[2],
          route: `${flightMatch[4]}-${flightMatch[5]}`,
          departure: `${flightMatch[4]}`,
          arrival: `${flightMatch[5]}`,
          date: flightMatch[6],
          class: flightMatch[10]
        });
      }
    }

    return flights;
  }

  private static extractBookingReferences(content: string): string[] {
    const refs: string[] = [];
    
    try {
      // Enhanced booking reference patterns
      const patterns = [
        /(?:EK #|Booking|PNR|Reference|Confirmation):\s*([A-Z0-9]{4,8})/gi,
        /\b([A-Z]{6})\b/g, // 6-letter codes like LNEKP2
        /\b([A-Z0-9]{5,7})\b(?=\s*-\s*Booked)/gi // Codes before "Booked"
      ];

      patterns.forEach(pattern => {
        let match;
        const usedPattern = new RegExp(pattern.source, pattern.flags);
        while ((match = usedPattern.exec(content)) !== null) {
          const ref = match[1];
          if (ref && !refs.includes(ref)) {
            refs.push(ref);
          }
        }
      });

      return refs;
    } catch (error) {
      console.error('Error extracting booking references:', error);
      return [];
    }
  }

  private static extractStructuredData(content: string, subject: string): StructuredData[] {
    const structured: StructuredData[] = [];

    // Extract booking confirmations
    if (content.includes('Booked') || content.includes('Reservation')) {
      structured.push({
        type: 'booking',
        data: { confirmed: true, source: 'email_content' },
        confidence: 0.8
      });
    }

    // Extract sale confirmations
    if (content.includes('Sale Closed') || content.includes('Charged')) {
      structured.push({
        type: 'financial',
        data: { status: 'completed', type: 'sale' },
        confidence: 0.9
      });
    }

    return structured;
  }

  private static parseEmailThread(content: string): ThreadMessage[] {
    const messages: ThreadMessage[] = [];
    
    // Split by common thread separators
    const parts = content.split(/On .+? wrote:|From:|>+/);
    
    parts.forEach((part, index) => {
      if (part.trim()) {
        messages.push({
          id: `thread_${index}`,
          from: 'Unknown',
          date: '',
          content: part.trim(),
          isQuoted: index > 0
        });
      }
    });

    return messages;
  }

  private static extractQuotedSections(content: string): QuotedSection[] {
    const quoted: QuotedSection[] = [];
    const lines = content.split('\n');
    
    let currentQuote: string[] = [];
    let quoteLevel = 0;
    
    for (const line of lines) {
      const level = (line.match(/^>+/) || [''])[0].length;
      
      if (level > 0) {
        if (level !== quoteLevel) {
          if (currentQuote.length > 0) {
            quoted.push({
              id: `quote_${quoted.length}`,
              content: currentQuote.join('\n'),
              level: quoteLevel
            });
          }
          currentQuote = [];
          quoteLevel = level;
        }
        currentQuote.push(line.substring(level).trim());
      } else {
        if (currentQuote.length > 0) {
          quoted.push({
            id: `quote_${quoted.length}`,
            content: currentQuote.join('\n'),
            level: quoteLevel
          });
          currentQuote = [];
          quoteLevel = 0;
        }
      }
    }
    
    if (currentQuote.length > 0) {
      quoted.push({
        id: `quote_${quoted.length}`,
        content: currentQuote.join('\n'),
        level: quoteLevel
      });
    }

    return quoted;
  }
}