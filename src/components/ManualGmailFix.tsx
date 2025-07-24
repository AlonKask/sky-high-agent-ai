import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const ManualGmailFix = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { connectGmail, refreshStatus } = useGmailIntegration();
  const { user } = useAuth();

  const handleGmailConnection = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      // Use the proper OAuth flow from useGmailIntegration
      await connectGmail();
      
      toast({
        title: "Success",
        description: "Gmail connection initiated successfully",
      });
      
      // Refresh the integration status
      await refreshStatus();
    } catch (error) {
      console.error('Gmail connection failed:', error);
      toast({
        title: "Error",
        description: "Failed to connect Gmail. Please try again.",
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
        onClick={handleGmailConnection}
        disabled={isProcessing}
        variant="outline"
        size="sm"
      >
        {isProcessing ? 'Processing...' : 'Fix Gmail Connection'}
      </Button>
    </div>
  );
};