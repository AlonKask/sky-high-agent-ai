import React from 'react';
import { sanitizeHtml, sanitizeEmailContent } from '@/utils/sanitization';

interface SafeHtmlRendererProps {
  html: string;
  className?: string;
  type?: 'general' | 'email';
  fallback?: React.ReactNode;
}

/**
 * Safe HTML renderer component that prevents XSS attacks
 * Replaces direct dangerouslySetInnerHTML usage
 */
export const SafeHtmlRenderer: React.FC<SafeHtmlRendererProps> = ({ 
  html, 
  className = '', 
  type = 'general',
  fallback = <p className="text-muted-foreground">No content available</p>
}) => {
  if (!html) {
    return <>{fallback}</>;
  }

  const sanitizedHtml = type === 'email' 
    ? sanitizeEmailContent(html)
    : sanitizeHtml(html);

  // If sanitization resulted in empty content, show fallback
  if (!sanitizedHtml.trim()) {
    return <>{fallback}</>;
  }

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

/**
 * Safe text renderer for plain text content
 */
export const SafeTextRenderer: React.FC<{ 
  text: string; 
  className?: string;
  maxLength?: number;
}> = ({ text, className = '', maxLength = 10000 }) => {
  if (!text) return null;
  
  // Truncate and escape text content
  const safeText = text.slice(0, maxLength);
  
  return (
    <div className={className}>
      {safeText}
    </div>
  );
};