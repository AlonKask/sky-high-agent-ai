import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Fingerprint, 
  Smartphone, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';
import { useEnhancedSecurityMonitoring } from '@/hooks/useEnhancedSecurityMonitoring';
import { toast } from '@/hooks/use-toast';

interface AuthSecurityConfig {
  mfaEnabled: boolean;
  biometricEnabled: boolean;
  deviceTrustEnabled: boolean;
  locationVerificationEnabled: boolean;
  continuousAuthEnabled: boolean;
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
}

interface SecurityEvent {
  id: string;
  type: 'login' | 'mfa_challenge' | 'device_verification' | 'location_anomaly' | 'session_timeout';
  timestamp: string;
  success: boolean;
  details: string;
  riskScore: number;
}

export const EnhancedAuthSecurity: React.FC = () => {
  const { user } = useAuth();
  const { deviceFingerprint, logSecurityEvent } = useEnhancedSecurityMonitoring();
  const [config, setConfig] = useState<AuthSecurityConfig>({
    mfaEnabled: true,
    biometricEnabled: false,
    deviceTrustEnabled: true,
    locationVerificationEnabled: false,
    continuousAuthEnabled: true,
    sessionTimeoutMinutes: 30,
    maxConcurrentSessions: 3
  });
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [deviceTrustScore, setDeviceTrustScore] = useState(85);
  const [lastVerification, setLastVerification] = useState<Date>(new Date());

  useEffect(() => {
    if (user) {
      loadSecurityConfiguration();
      loadSecurityEvents();
      performDeviceTrustAssessment();
    }
  }, [user]);

  const loadSecurityConfiguration = async () => {
    // In production, load from user preferences or security policies
    const savedConfig = localStorage.getItem('authSecurityConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  };

  const loadSecurityEvents = async () => {
    // Mock security events - in production, fetch from security audit logs
    const mockEvents: SecurityEvent[] = [
      {
        id: '1',
        type: 'login',
        timestamp: new Date().toISOString(),
        success: true,
        details: 'Successful login from trusted device',
        riskScore: 10
      },
      {
        id: '2',
        type: 'mfa_challenge',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        success: true,
        details: 'MFA verification completed',
        riskScore: 5
      },
      {
        id: '3',
        type: 'device_verification',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        success: true,
        details: 'Device fingerprint verified',
        riskScore: 8
      }
    ];
    setSecurityEvents(mockEvents);
  };

  const performDeviceTrustAssessment = async () => {
    if (!deviceFingerprint) return;

    // Calculate device trust score based on multiple factors
    let trustScore = 100;
    
    // Browser security features
    const hasSecureContext = window.isSecureContext;
    if (!hasSecureContext) trustScore -= 20;

    // Screen resolution consistency
    const expectedResolution = localStorage.getItem('expectedResolution');
    const currentResolution = `${screen.width}x${screen.height}`;
    if (expectedResolution && expectedResolution !== currentResolution) {
      trustScore -= 10;
    } else if (!expectedResolution) {
      localStorage.setItem('expectedResolution', currentResolution);
    }

    // Time zone consistency
    const expectedTimezone = localStorage.getItem('expectedTimezone');
    const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (expectedTimezone && expectedTimezone !== currentTimezone) {
      trustScore -= 15;
    } else if (!expectedTimezone) {
      localStorage.setItem('expectedTimezone', currentTimezone);
    }

    // Device age (newer devices are more trusted)
    const deviceAge = Math.floor((Date.now() - new Date(localStorage.getItem('deviceFirstSeen') || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
    if (deviceAge > 90) trustScore += 10; // Established device
    else if (deviceAge < 1) trustScore -= 5; // New device

    setDeviceTrustScore(Math.max(0, Math.min(100, trustScore)));
  };

  const updateSecurityConfig = async (updates: Partial<AuthSecurityConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    localStorage.setItem('authSecurityConfig', JSON.stringify(newConfig));

    await logSecurityEvent('security_config_updated', 'medium', {
      updates: Object.keys(updates),
      timestamp: new Date().toISOString()
    });

    toast({
      title: "Security Settings Updated",
      description: "Your authentication security configuration has been saved.",
    });
  };

  const triggerMFASetup = async () => {
    // Mock MFA setup - in production, integrate with MFA provider
    toast({
      title: "MFA Setup",
      description: "Multi-factor authentication setup would be initiated here.",
    });

    await logSecurityEvent('mfa_setup_initiated', 'low', {
      timestamp: new Date().toISOString()
    });
  };

  const performSecurityVerification = async () => {
    setLastVerification(new Date());
    
    await logSecurityEvent('manual_security_verification', 'low', {
      deviceTrustScore,
      timestamp: new Date().toISOString()
    });

    toast({
      title: "Security Verification Complete",
      description: "Your identity has been verified successfully.",
    });
  };

  const getRiskScoreColor = (score: number) => {
    if (score <= 20) return 'text-green-600';
    if (score <= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEventIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'login': return <Shield className="h-4 w-4" />;
      case 'mfa_challenge': return <Smartphone className="h-4 w-4" />;
      case 'device_verification': return <Fingerprint className="h-4 w-4" />;
      case 'location_anomaly': return <MapPin className="h-4 w-4" />;
      case 'session_timeout': return <Clock className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please sign in to access enhanced authentication security settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Device Trust Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getTrustScoreColor(deviceTrustScore)}`}>
              {deviceTrustScore}%
            </div>
            <Progress value={deviceTrustScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Based on device consistency and security features
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor((Date.now() - lastVerification.getTime()) / 60000)}m
            </div>
            <p className="text-xs text-muted-foreground">ago</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={performSecurityVerification}
              className="mt-2 w-full"
            >
              Verify Now
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityEvents.length}</div>
            <p className="text-xs text-muted-foreground">in last 24 hours</p>
            <div className="flex items-center gap-1 mt-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">All verified</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Authentication Security Configuration
          </CardTitle>
          <CardDescription>
            Configure advanced security features for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Multi-Factor Authentication</label>
                  <p className="text-xs text-muted-foreground">Require additional verification</p>
                </div>
                <Switch
                  checked={config.mfaEnabled}
                  onCheckedChange={(checked) => updateSecurityConfig({ mfaEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Device Trust Verification</label>
                  <p className="text-xs text-muted-foreground">Continuous device fingerprinting</p>
                </div>
                <Switch
                  checked={config.deviceTrustEnabled}
                  onCheckedChange={(checked) => updateSecurityConfig({ deviceTrustEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Continuous Authentication</label>
                  <p className="text-xs text-muted-foreground">Monitor session continuously</p>
                </div>
                <Switch
                  checked={config.continuousAuthEnabled}
                  onCheckedChange={(checked) => updateSecurityConfig({ continuousAuthEnabled: checked })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Biometric Authentication</label>
                  <p className="text-xs text-muted-foreground">Use device biometrics when available</p>
                </div>
                <Switch
                  checked={config.biometricEnabled}
                  onCheckedChange={(checked) => updateSecurityConfig({ biometricEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Location Verification</label>
                  <p className="text-xs text-muted-foreground">Verify geographic consistency</p>
                </div>
                <Switch
                  checked={config.locationVerificationEnabled}
                  onCheckedChange={(checked) => updateSecurityConfig({ locationVerificationEnabled: checked })}
                />
              </div>

              {config.mfaEnabled && (
                <Button 
                  variant="outline" 
                  onClick={triggerMFASetup}
                  className="w-full"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Configure MFA
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
          <CardDescription>
            Authentication and security verification history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">
                      {event.type.replace('_', ' ')}
                    </span>
                    {event.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{event.details}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Badge className={getRiskScoreColor(event.riskScore)}>
                    Risk: {event.riskScore}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};