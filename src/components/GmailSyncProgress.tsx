import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  RefreshCw,
  Activity,
  Clock
} from 'lucide-react';

interface SyncStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
  timestamp?: Date;
}

interface GmailSyncProgressProps {
  isVisible: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export const GmailSyncProgress = ({ isVisible, onClose, onRetry }: GmailSyncProgressProps) => {
  const [steps, setSteps] = useState<SyncStep[]>([
    { id: 'init', name: 'Initializing sync', status: 'pending' },
    { id: 'auth', name: 'Verifying Gmail connection', status: 'pending' },
    { id: 'fetch', name: 'Fetching recent emails', status: 'pending' },
    { id: 'process', name: 'Processing email content', status: 'pending' },
    { id: 'store', name: 'Storing emails', status: 'pending' },
    { id: 'complete', name: 'Sync completed', status: 'pending' }
  ]);

  const [progress, setProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

  // Phase 5: Enhanced sync progress monitoring
  useEffect(() => {
    if (!isVisible) return;

    const handleSyncProgress = (event: CustomEvent) => {
      const { step, status, message, progress: stepProgress } = event.detail;
      
      setSteps(prev => prev.map(s => 
        s.id === step ? { ...s, status, message, timestamp: new Date() } : s
      ));
      
      if (stepProgress !== undefined) {
        setProgress(stepProgress);
      }
    };

    const handleSyncComplete = (event: CustomEvent) => {
      const { count, success, error } = event.detail;
      setSyncResult({ success, count, error });
      
      if (success) {
        setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
        setProgress(100);
      } else {
        setSteps(prev => prev.map((s, index) => 
          index < 3 ? { ...s, status: 'completed' } : 
          index === 3 ? { ...s, status: 'error', message: error } : s
        ));
      }
    };

    window.addEventListener('gmail-sync-progress', handleSyncProgress as EventListener);
    window.addEventListener('gmail-sync-complete', handleSyncComplete as EventListener);

    return () => {
      window.removeEventListener('gmail-sync-progress', handleSyncProgress as EventListener);
      window.removeEventListener('gmail-sync-complete', handleSyncComplete as EventListener);
    };
  }, [isVisible]);

  const getStepIcon = (status: SyncStep['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    if (syncResult?.success) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
    }
    if (syncResult?.success === false) {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="secondary">In Progress</Badge>;
  };

  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="h-6 w-6 text-blue-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Gmail Sync</h3>
            <p className="text-sm text-muted-foreground">Syncing your emails...</p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
        </div>

        {/* Sync Steps */}
        <div className="space-y-3 mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-3">
              {getStepIcon(step.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{step.name}</p>
                {step.message && (
                  <p className="text-xs text-muted-foreground">{step.message}</p>
                )}
                {step.timestamp && (
                  <p className="text-xs text-muted-foreground">
                    {step.timestamp.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Result Message */}
        {syncResult && (
          <div className="mb-4 p-3 rounded-lg bg-gray-50">
            {syncResult.success ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">
                  Successfully synced {syncResult.count || 0} emails
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{syncResult.error || 'Sync failed'}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {syncResult?.success === false && onRetry && (
            <Button onClick={onRetry} size="sm" variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          )}
          <Button 
            onClick={onClose} 
            size="sm" 
            variant={syncResult?.success ? "default" : "outline"}
            className="flex-1"
          >
            {syncResult?.success ? 'Done' : 'Close'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};