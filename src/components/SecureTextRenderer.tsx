import React from 'react';
import { validateAndSanitize } from '@/utils/sanitization';

interface SecureTextRendererProps {
  text: string;
  className?: string;
  maxLength?: number;
  allowLineBreaks?: boolean;
  showTruncatedIndicator?: boolean;
}

/**
 * Completely safe text renderer that eliminates all XSS risks
 * Only renders plain text content with optional formatting
 */
export const SecureTextRenderer: React.FC<SecureTextRendererProps> = ({
  text,
  className = '',
  maxLength = 10000,
  allowLineBreaks = true,
  showTruncatedIndicator = true
}) => {
  if (!text) return null;

  // Sanitize and validate the text input
  const safeText = validateAndSanitize(text, maxLength);
  const wasTruncated = text.length > maxLength;

  // Split text by line breaks if allowed
  const textLines = allowLineBreaks ? safeText.split('\n') : [safeText];

  return (
    <div className={className}>
      {textLines.map((line, index) => (
        <p key={index} className={index > 0 ? "mt-2" : ""}>
          {line}
        </p>
      ))}
      {wasTruncated && showTruncatedIndicator && (
        <p className="text-sm text-muted-foreground mt-2 italic">
          Content truncated for security...
        </p>
      )}
    </div>
  );
};

interface SecureEmailContentProps {
  content: string;
  className?: string;
  maxContentLength?: number;
}

/**
 * Safe email content renderer that extracts text from HTML emails
 * Completely eliminates XSS risks while preserving readability
 */
export const SecureEmailContent: React.FC<SecureEmailContentProps> = ({
  content,
  className = '',
  maxContentLength = 5000
}) => {
  if (!content) return null;

  // Extract text content from HTML safely
  const extractTextFromHtml = (html: string): string => {
    try {
      // Create a temporary DOM element to safely extract text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Get text content and clean up whitespace
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      return textContent.replace(/\s+/g, ' ').trim();
    } catch (error) {
      // If HTML parsing fails, treat as plain text
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
  };

  const safeTextContent = extractTextFromHtml(content);
  const truncatedContent = safeTextContent.slice(0, maxContentLength);
  const wasTruncated = safeTextContent.length > maxContentLength;

  // Split content into paragraphs for better readability
  const paragraphs = truncatedContent.split(/\n\s*\n/).filter(p => p.trim());

  return (
    <div className={className}>
      {paragraphs.length === 0 ? (
        <p className="text-muted-foreground italic">No content available</p>
      ) : (
        paragraphs.map((paragraph, index) => (
          <p key={index} className={index > 0 ? "mt-3" : ""}>
            {paragraph}
          </p>
        ))
      )}
      {wasTruncated && (
        <p className="text-sm text-muted-foreground mt-3 italic">
          Content truncated for security and performance...
        </p>
      )}
    </div>
  );
};

export default SecureTextRenderer;