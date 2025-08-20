import React, { useEffect, useState } from 'react';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';

interface SecurityEnhancementMonitorProps {
  className?: string;
}

/**
 * Real-time security monitoring component that displays current threat status
 * and allows users to respond to security incidents
 */
export const SecurityEnhancementMonitor: React.FC<SecurityEnhancementMonitorProps> = ({
  className = ''
}) => {
  const { 
    metrics, 
    sessionValid, 
    validateSession, 
    logSecurityEvent,
    forceSecurityLogout 
  } = useEnhancedSecurity();
  
  const [isVisible, setIsVisible] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  // Auto-refresh security metrics every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      validateSession();
      setLastCheck(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [validateSession]);

  // Show monitor if there are security concerns
  useEffect(() => {
    const shouldShow = metrics.threatLevel !== 'low' || 
                     !sessionValid || 
                     metrics.suspiciousActivityCount > 0;
    setIsVisible(shouldShow);
  }, [metrics, sessionValid]);

  const handleSecurityAction = async (action: string) => {
    await logSecurityEvent('security_monitor_action', 'medium', {
      action,
      threat_level: metrics.threatLevel,
      timestamp: new Date().toISOString()
    });
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'outline';
    }
  };

  const getThreatIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'high':
        return <XCircle className="h-4 w-4" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />;
      case 'low':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Eye className="h-4 w-4 mr-2" />
        Security Status
      </Button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-80 ${className}`}>
      <Card className="border-border/50 bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Monitor
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Threat Level Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Threat Level</span>
            <Badge 
              variant={getThreatColor(metrics.threatLevel) as any}
              className="text-xs"
            >
              {getThreatIcon(metrics.threatLevel)}
              <span className="ml-1 capitalize">{metrics.threatLevel}</span>
            </Badge>
          </div>

          {/* Session Validation */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Session Status</span>
            <Badge variant={sessionValid ? 'default' : 'destructive'} className="text-xs">
              {sessionValid ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Valid
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Invalid
                </>
              )}
            </Badge>
          </div>

          {/* Risk Score */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Risk Score</span>
            <span className="text-xs font-mono">
              {metrics.riskScore}/100
            </span>
          </div>

          {/* Suspicious Activity */}
          {metrics.suspiciousActivityCount > 0 && (
            <Alert className="py-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                {metrics.suspiciousActivityCount} suspicious activities detected
              </AlertDescription>
            </Alert>
          )}

          {/* Invalid Session Alert */}
          {!sessionValid && (
            <Alert variant="destructive" className="py-2">
              <XCircle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                Session validation failed. Please re-authenticate.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSecurityAction('manual_validation')}
              className="flex-1 text-xs"
            >
              Validate
            </Button>
            
            {(metrics.threatLevel === 'high' || metrics.threatLevel === 'critical') && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => forceSecurityLogout('user_initiated_security_logout')}
                className="flex-1 text-xs"
              >
                Force Logout
              </Button>
            )}
          </div>

          {/* Last Check Timestamp */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last check: {lastCheck.toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityEnhancementMonitor;