import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';

interface BackfillResult {
  processed: number;
  updated: number;
  remaining: number;
}

const EmailHtmlBackfill: React.FC = () => {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BackfillResult | null>(null);
  const { toast } = useToast();
  const { user } = useSimpleAuth();

  const handleBackfill = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to backfill email HTML content.",
        variant: "destructive"
      });
      return;
    }

    setIsBackfilling(true);
    setProgress(0);
    setResult(null);

    try {
      // Start with a smaller batch to avoid timeouts
      const batchSize = 10;
      
      const { data, error } = await supabase.functions.invoke('backfill-email-html', {
        body: {
          userId: user.id,
          batchSize
        }
      });

      if (error) {
        throw error;
      }

      setResult(data);
      setProgress(100);

      toast({
        title: "Backfill Complete",
        description: `Successfully updated ${data.updated} emails with HTML content out of ${data.processed} processed.`,
        variant: "default"
      });

    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: "Backfill Failed",
        description: error.message || "Failed to backfill email HTML content",
        variant: "destructive"
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Email HTML Content Backfill
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>
            This tool will fetch HTML content for existing emails that only have plain text.
            It will improve the email display experience by enabling rich formatting.
          </p>
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                This process may take some time and uses Gmail API quota
              </span>
            </div>
          </div>
        </div>

        {isBackfilling && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing emails...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {result && (
          <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Backfill Results</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium">Processed</div>
                <div className="text-2xl font-bold text-green-600">{result.processed}</div>
              </div>
              <div>
                <div className="font-medium">Updated</div>
                <div className="text-2xl font-bold text-green-600">{result.updated}</div>
              </div>
              <div>
                <div className="font-medium">Success Rate</div>
                <div className="text-2xl font-bold text-green-600">
                  {result.processed > 0 ? Math.round((result.updated / result.processed) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={handleBackfill} 
          disabled={isBackfilling}
          className="w-full"
          size="lg"
        >
          {isBackfilling ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Start HTML Backfill
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmailHtmlBackfill;