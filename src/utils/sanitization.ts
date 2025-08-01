import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Removes dangerous elements while preserving safe formatting
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  // Configure DOMPurify to allow only safe tags and attributes
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'a', 'span', 'div', 'table', 'tr', 'td', 'th',
      'thead', 'tbody', 'pre', 'code'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class'
    ],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
  });

  return cleanHtml;
};

/**
 * Sanitizes plain text input to prevent script injection
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitizes email content for display
 * Preserves basic formatting while removing dangerous content
 */
export const sanitizeEmailContent = (content: string): string => {
  if (!content) return '';
  
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'span', 'div', 
      'table', 'tr', 'td', 'th', 'thead', 'tbody', 'ul', 'ol', 'li',
      'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class', 'src', 'alt', 'width', 'height', 
      'style', 'title', 'loading', 'decoding'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
  });
};

/**
 * Creates safe HTML rendering component props
 */
export const createSafeHtmlProps = (html: string) => ({
  dangerouslySetInnerHTML: { __html: sanitizeHtml(html) }
});

/**
 * Validates and sanitizes user input
 */
export const validateAndSanitize = (input: string, maxLength: number = 1000): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Truncate to max length
  const truncated = input.slice(0, maxLength);
  
  // Sanitize the content
  return sanitizeText(truncated);
};

/**
 * Mask sensitive data for logging and display
 */
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (!data || data.length <= visibleChars) return '***';
  
  const masked = '*'.repeat(data.length - visibleChars);
  return masked + data.slice(-visibleChars);
};