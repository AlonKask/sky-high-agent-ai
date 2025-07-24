import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const ManualGmailFix = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { refreshStatus } = useGmailIntegration();
  const { user } = useAuth();

  const handleManualExchange = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      // Exchange the authorization code we have
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: {
          action: 'exchange',
          code: '4/0AVMBsJiltJWHfJoOKzW-34Rak4Vc7SOjDkbGSpeRPdsYX3fduF4X4b7UX_tYzfWyY44woA',
          userId: user.id
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: "Gmail tokens exchanged and stored successfully",
        });
        // Refresh the integration status
        await refreshStatus();
      } else {
        throw new Error(data?.error || 'Exchange failed');
      }
    } catch (error) {
      console.error('Manual exchange failed:', error);
      toast({
        title: "Error",
        description: "Failed to exchange tokens. Please try connecting Gmail again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
      <h3 className="font-medium text-orange-800 mb-2">Gmail Integration Fix</h3>
      <p className="text-sm text-orange-700 mb-3">
        If your Gmail connection didn't complete properly, click below to manually process the tokens.
      </p>
      <Button 
        onClick={handleManualExchange}
        disabled={isProcessing}
        variant="outline"
        size="sm"
      >
        {isProcessing ? 'Processing...' : 'Fix Gmail Connection'}
      </Button>
    </div>
  );
};