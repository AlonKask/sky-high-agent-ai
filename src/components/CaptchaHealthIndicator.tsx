/**
 * CAPTCHA Health Indicator Component
 * Real-time monitoring of CAPTCHA service health and performance
 */

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCaptchaMonitoring } from '@/hooks/useCaptchaMonitoring';

interface CaptchaHealthIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export const CaptchaHealthIndicator: React.FC<CaptchaHealthIndicatorProps> = ({
  showDetails = false,
  className = ''
}) => {
  const {
    isHealthy,
    metrics,
    lastError,
    isEnabled,
    environment,
    isPerformingWell,
    needsAttention,
    hasMultipleFailures,
    isUnderAttack,
    checkHealth
  } = useCaptchaMonitoring();

  const [lastHealthCheck, setLastHealthCheck] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      checkHealth().then(() => {
        setLastHealthCheck(new Date());
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkHealth]);

  const getHealthStatus = () => {
    if (!isEnabled) return { color: 'gray', text: 'Disabled', icon: XCircle };
    if (isUnderAttack) return { color: 'red', text: 'Under Attack', icon: AlertTriangle };
    if (!isHealthy) return { color: 'red', text: 'Unhealthy', icon: XCircle };
    if (needsAttention) return { color: 'yellow', text: 'Needs Attention', icon: AlertTriangle };
    if (isPerformingWell) return { color: 'green', text: 'Excellent', icon: CheckCircle };
    return { color: 'green', text: 'Healthy', icon: CheckCircle };
  };

  const status = getHealthStatus();
  const StatusIcon = status.icon;

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Shield className="h-4 w-4 text-muted-foreground" />
        <Badge variant={status.color === 'green' ? 'default' : status.color === 'yellow' ? 'secondary' : 'destructive'}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {status.text}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>CAPTCHA Security Status</span>
          </CardTitle>
          <Badge variant={status.color === 'green' ? 'default' : status.color === 'yellow' ? 'secondary' : 'destructive'}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.text}
          </Badge>
        </div>
        <CardDescription>
          Real-time monitoring of security verification service
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Environment and Configuration */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Environment:</span>
            <Badge variant="outline" className="ml-2">
              {environment}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Service:</span>
            <Badge variant={isEnabled ? 'default' : 'secondary'} className="ml-2">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </div>

        {/* Performance Metrics */}
        {isEnabled && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="font-semibold text-lg">{metrics.totalAttempts}</div>
              <div className="text-muted-foreground">Total Attempts</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="font-semibold text-lg text-green-600">{metrics.successfulVerifications}</div>
              <div className="text-muted-foreground">Successful</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="font-semibold text-lg text-red-600">{metrics.failedVerifications}</div>
              <div className="text-muted-foreground">Failed</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="font-semibold text-lg">{metrics.successRate.toFixed(1)}%</div>
              <div className="text-muted-foreground">Success Rate</div>
            </div>
          </div>
        )}

        {/* Performance Insights */}
        {metrics.averageVerificationTime > 0 && (
          <div className="flex items-center space-x-2 text-sm">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Average verification time:</span>
            <Badge variant="outline">
              {(metrics.averageVerificationTime / 1000).toFixed(2)}s
            </Badge>
          </div>
        )}

        {/* Security Alerts */}
        {isUnderAttack && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Alert:</strong> Unusual verification failure patterns detected. 
              System may be under automated attack.
            </AlertDescription>
          </Alert>
        )}

        {hasMultipleFailures && !isUnderAttack && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Multiple CAPTCHA verification failures detected. Enhanced security measures active.
            </AlertDescription>
          </Alert>
        )}

        {lastError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Service Error:</strong> {lastError}
            </AlertDescription>
          </Alert>
        )}

        {/* Last Health Check */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Last health check: {lastHealthCheck.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default CaptchaHealthIndicator;