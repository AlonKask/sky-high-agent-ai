import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  Sparkles, 
  Eye, 
  EyeOff,
  AlertTriangle,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';

interface EnhancedEmailRendererProps {
  htmlContent?: string;
  textContent: string;
  subject?: string;
  className?: string;
  showToggle?: boolean;
  defaultView?: 'html' | 'text';
}

const EnhancedEmailRenderer: React.FC<EnhancedEmailRendererProps> = ({
  htmlContent,
  textContent,
  subject = '',
  className,
  showToggle = true,
  defaultView = 'html'
}) => {
  const [viewMode, setViewMode] = React.useState<'html' | 'text'>(
    htmlContent ? defaultView : 'text'
  );

  // Sanitize and enhance HTML for safe Gmail-like rendering
  const sanitizedHtml = useMemo(() => {
    if (!htmlContent) return '';
    
    try {
      // Configure DOMPurify to allow more Gmail-like elements while staying secure
      const cleanHtml = DOMPurify.sanitize(htmlContent, {
        ALLOWED_TAGS: [
          'div', 'span', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
          'a', 'ul', 'ol', 'li', 'blockquote', 'table', 'tr', 'td', 'th', 'thead',
          'tbody', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'font', 'center',
          'hr', 'pre', 'code', 'sub', 'sup', 'small', 'big'
        ],
        ALLOWED_ATTR: [
          'style', 'class', 'id', 'href', 'src', 'alt', 'title', 'target',
          'color', 'size', 'face', 'width', 'height', 'align', 'valign',
          'cellpadding', 'cellspacing', 'border', 'bgcolor'
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        ADD_TAGS: ['style'],
        ADD_ATTR: ['target'],
        ALLOW_DATA_ATTR: false
      });

      return cleanHtml;
    } catch (error) {
      console.warn('HTML sanitization failed:', error);
      return '';
    }
  }, [htmlContent]);

  // Format plain text content with basic formatting
  const formattedTextContent = useMemo(() => {
    return textContent
      .split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(Boolean)
      .join('\n\n');
  }, [textContent]);

  const hasValidHtml = sanitizedHtml && sanitizedHtml.trim().length > 0;
  const canShowHtml = hasValidHtml && htmlContent;

  return (
    <div className={cn("space-y-4", className)}>
      {/* View Controls */}
      {showToggle && canShowHtml && (
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <Badge variant={viewMode === 'html' ? 'default' : 'outline'}>
              {viewMode === 'html' ? (
                <>
                  <Globe className="h-3 w-3 mr-1" />
                  Gmail View
                </>
              ) : (
                <>
                  <FileText className="h-3 w-3 mr-1" />
                  Plain Text
                </>
              )}
            </Badge>
            {canShowHtml && (
              <Badge variant="secondary" className="text-xs">
                Rich HTML Available
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('text')}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Text
            </Button>
            {canShowHtml && (
              <Button
                variant={viewMode === 'html' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('html')}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Rich
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Content Display */}
      <Card>
        <CardContent className="p-0">
          {viewMode === 'html' && canShowHtml ? (
            <div className="gmail-email-content">
              {/* Gmail-like HTML rendering */}
              <div 
                className="prose prose-sm max-w-none p-4"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  color: 'var(--foreground)',
                  backgroundColor: 'var(--background)'
                }}
              />
            </div>
          ) : (
            <div className="p-4">
              {/* Plain text rendering with basic formatting */}
              <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {formattedTextContent.split('\n\n').map((paragraph, index) => (
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
              
              {!canShowHtml && htmlContent && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      HTML content could not be safely rendered
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Statistics */}
      {(canShowHtml || textContent) && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Content: {canShowHtml ? 'HTML + Text' : 'Text Only'}</div>
          <div>
            Size: {canShowHtml ? 
              `${Math.round(sanitizedHtml.length / 1024)}KB HTML, ${Math.round(textContent.length / 1024)}KB text` :
              `${Math.round(textContent.length / 1024)}KB text`
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedEmailRenderer;