import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailProcessingRequest {
  emailContent: string;
  subject: string;
  senderEmail: string;
  isHtml: boolean;
}

interface ProcessedEmailContent {
  cleanedBody: string;
  signature: string | null;
  quotedContent: string | null;
  attachments: Array<{
    name: string;
    type: string;
    size?: number;
  }>;
  keyInformation: {
    sender: string;
    summary: string;
    actionItems: string[];
    dates: string[];
    contacts: string[];
    importance: 'low' | 'medium' | 'high';
  };
  readabilityScore: number;
  snippet: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { emailContent, subject, senderEmail, isHtml }: EmailProcessingRequest = await req.json();

    if (!emailContent) {
      throw new Error('Email content is required');
    }

    console.log('🔄 Processing email content for enhanced display...');

    // Clean and extract email content
    const processedContent = await processEmailContent(emailContent, subject, senderEmail, isHtml);

    return new Response(
      JSON.stringify({
        success: true,
        processedContent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Email processing error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function processEmailContent(
  content: string, 
  subject: string, 
  senderEmail: string, 
  isHtml: boolean
): Promise<ProcessedEmailContent> {
  // Remove HTML tags if it's HTML content
  let textContent = content;
  if (isHtml) {
    textContent = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  // Extract signature
  const signature = extractSignature(textContent);
  
  // Extract quoted content (replies/forwards)
  const quotedContent = extractQuotedContent(textContent);
  
  // Clean the main content
  let cleanedBody = textContent;
  if (signature) {
    cleanedBody = cleanedBody.replace(signature, '');
  }
  if (quotedContent) {
    cleanedBody = cleanedBody.replace(quotedContent, '');
  }
  
  // Clean up extra whitespace
  cleanedBody = cleanedBody
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .trim();

  // Generate snippet (first 150 characters)
  const snippet = cleanedBody.length > 150 
    ? cleanedBody.substring(0, 150) + '...' 
    : cleanedBody;

  // Extract key information
  const keyInformation = extractKeyInformation(cleanedBody, subject, senderEmail);
  
  // Calculate readability score (simple heuristic)
  const readabilityScore = calculateReadabilityScore(cleanedBody);

  return {
    cleanedBody: formatContent(cleanedBody, isHtml),
    signature: signature ? formatContent(signature, isHtml) : null,
    quotedContent: quotedContent ? formatContent(quotedContent, isHtml) : null,
    attachments: [], // Will be populated by email sync
    keyInformation,
    readabilityScore,
    snippet
  };
}

function extractSignature(content: string): string | null {
  // Common signature patterns
  const signaturePatterns = [
    /^--\s*$/m,
    /^Best regards?[,\s]/im,
    /^Sincerely[,\s]/im,
    /^Thanks?[,\s]/im,
    /^Cheers[,\s]/im,
    /^Sent from my/im,
    /^Get Outlook for/im
  ];

  for (const pattern of signaturePatterns) {
    const match = content.search(pattern);
    if (match !== -1) {
      return content.substring(match).trim();
    }
  }

  // Look for patterns like "Name\nTitle\nCompany\nPhone"
  const lines = content.split('\n');
  const lastLines = lines.slice(-10); // Check last 10 lines
  
  for (let i = 0; i < lastLines.length - 1; i++) {
    const line = lastLines[i].trim();
    const nextLine = lastLines[i + 1]?.trim();
    
    // If we find a line with what looks like a name followed by title/company
    if (line && nextLine && 
        line.length < 50 && 
        !line.includes('@') && 
        (nextLine.includes('CEO') || nextLine.includes('Manager') || 
         nextLine.includes('Director') || nextLine.includes('Ltd') ||
         nextLine.includes('Inc') || nextLine.includes('LLC'))) {
      return lastLines.slice(i).join('\n').trim();
    }
  }

  return null;
}

function extractQuotedContent(content: string): string | null {
  // Look for quoted/forwarded content patterns
  const quotedPatterns = [
    /^>.*$/gm,
    /^On .* wrote:$/m,
    /^From:.*$/m,
    /^-----Original Message-----/m,
    /^________________________________/m
  ];

  for (const pattern of quotedPatterns) {
    const match = content.search(pattern);
    if (match !== -1) {
      return content.substring(match).trim();
    }
  }

  return null;
}

function extractKeyInformation(content: string, subject: string, senderEmail: string) {
  const actionItems: string[] = [];
  const dates: string[] = [];
  const contacts: string[] = [];

  // Extract action items (simple patterns)
  const actionPatterns = [
    /please\s+([\w\s]+)/gi,
    /need\s+to\s+([\w\s]+)/gi,
    /can\s+you\s+([\w\s]+)/gi,
    /would\s+you\s+([\w\s]+)/gi
  ];

  actionPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      actionItems.push(...matches.slice(0, 3)); // Limit to 3
    }
  });

  // Extract dates
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    /\b\d{1,2}-\d{1,2}-\d{4}\b/g,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi
  ];

  datePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      dates.push(...matches.slice(0, 3)); // Limit to 3
    }
  });

  // Extract email addresses and phone numbers
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  
  const emailMatches = content.match(emailPattern);
  const phoneMatches = content.match(phonePattern);
  
  if (emailMatches) contacts.push(...emailMatches.slice(0, 3));
  if (phoneMatches) contacts.push(...phoneMatches.slice(0, 3));

  // Determine importance based on keywords and urgency
  let importance: 'low' | 'medium' | 'high' = 'medium';
  const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'critical'];
  const lowPriorityKeywords = ['fyi', 'for your information', 'no rush', 'when you can'];
  
  const lowerContent = (content + ' ' + subject).toLowerCase();
  
  if (urgentKeywords.some(keyword => lowerContent.includes(keyword))) {
    importance = 'high';
  } else if (lowPriorityKeywords.some(keyword => lowerContent.includes(keyword))) {
    importance = 'low';
  }

  // Generate summary (first sentence or up to 100 chars)
  const sentences = content.split(/[.!?]+/);
  const summary = sentences[0]?.trim().substring(0, 100) + 
    (sentences[0]?.length > 100 ? '...' : '') || 'No summary available';

  return {
    sender: senderEmail,
    summary,
    actionItems: actionItems.slice(0, 3),
    dates: dates.slice(0, 3),
    contacts: contacts.slice(0, 3),
    importance
  };
}

function calculateReadabilityScore(content: string): number {
  if (!content || content.length < 10) return 0;
  
  const words = content.split(/\s+/).length;
  const sentences = content.split(/[.!?]+/).length;
  const syllables = content.split(/[aeiouAEIOU]/).length - 1;
  
  // Simple readability heuristic (0-100 scale)
  const avgWordsPerSentence = words / Math.max(sentences, 1);
  const avgSyllablesPerWord = syllables / Math.max(words, 1);
  
  // Flesch Reading Ease approximation
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function formatContent(content: string, preserveHtml: boolean): string {
  if (preserveHtml) {
    return content;
  }
  
  // Convert plain text to HTML with basic formatting
  return content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}