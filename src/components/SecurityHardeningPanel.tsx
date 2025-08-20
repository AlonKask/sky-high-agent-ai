import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Shield, Lock, Eye, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logSecurityEvent } from '@/utils/enhancedSecurity';

interface SecuritySetting {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  critical: boolean;
  category: 'authentication' | 'monitoring' | 'data_protection' | 'headers';
}

interface SecurityScore {
  total: number;
  current: number;
  percentage: number;
}

export const SecurityHardeningPanel: React.FC = () => {
  const [settings, setSettings] = useState<SecuritySetting[]>([
    {
      id: 'enhanced_session_validation',
      name: 'Enhanced Session Validation',
      description: 'Advanced session fingerprinting and hijacking detection',
      enabled: true,
      critical: true,
      category: 'authentication'
    },
    {
      id: 'rate_limiting',
      name: 'Aggressive Rate Limiting',
      description: 'Strict rate limits for authentication and API calls',
      enabled: true,
      critical: false,
      category: 'authentication'
    },
    {
      id: 'input_sanitization',
      name: 'Enhanced Input Sanitization',
      description: 'Advanced XSS and injection attack prevention',
      enabled: true,
      critical: true,
      category: 'data_protection'
    },
    {
      id: 'security_monitoring',
      name: 'Real-time Security Monitoring',
      description: 'Continuous monitoring for suspicious activities',
      enabled: true,
      critical: false,
      category: 'monitoring'
    },
    {
      id: 'data_encryption',
      name: 'Client-side Data Encryption',
      description: 'Encrypt sensitive data before sending to server',
      enabled: false,
      critical: true,
      category: 'data_protection'
    },
    {
      id: 'security_headers',
      name: 'Advanced Security Headers',
      description: 'CSP, HSTS, and other protective headers',
      enabled: false,
      critical: false,
      category: 'headers'
    },
    {
      id: 'anomaly_detection',
      name: 'Behavioral Anomaly Detection',
      description: 'AI-powered detection of unusual user behavior',
      enabled: false,
      critical: false,
      category: 'monitoring'
    },
    {
      id: 'zero_trust_access',
      name: 'Zero Trust Access Control',
      description: 'Never trust, always verify access patterns',
      enabled: true,
      critical: true,
      category: 'authentication'
    }
  ]);

  const [securityScore, setSecurityScore] = useState<SecurityScore>({
    total: 0,
    current: 0,
    percentage: 0
  });

  const calculateSecurityScore = () => {
    const totalPoints = settings.reduce((sum, setting) => 
      sum + (setting.critical ? 20 : 10), 0
    );
    
    const currentPoints = settings.reduce((sum, setting) => 
      sum + (setting.enabled ? (setting.critical ? 20 : 10) : 0), 0
    );
    
    const percentage = totalPoints > 0 ? Math.round((currentPoints / totalPoints) * 100) : 0;
    
    setSecurityScore({
      total: totalPoints,
      current: currentPoints,
      percentage
    });
  };

  const toggleSetting = async (settingId: string) => {
    const setting = settings.find(s => s.id === settingId);
    if (!setting) return;

    const newEnabled = !setting.enabled;
    
    setSettings(prevSettings =>
      prevSettings.map(s =>
        s.id === settingId ? { ...s, enabled: newEnabled } : s
      )
    );

    // Log security configuration change
    await logSecurityEvent('security_config_updated', 'medium', {
      setting_id: settingId,
      setting_name: setting.name,
      enabled: newEnabled,
      critical: setting.critical,
      category: setting.category
    });

    toast({
      title: `Security Setting ${newEnabled ? 'Enabled' : 'Disabled'}`,
      description: setting.name,
      variant: newEnabled ? 'default' : 'destructive',
    });
  };

  const enableAllCritical = async () => {
    const criticalSettings = settings.filter(s => s.critical && !s.enabled);
    
    setSettings(prevSettings =>
      prevSettings.map(s =>
        s.critical ? { ...s, enabled: true } : s
      )
    );

    await logSecurityEvent('critical_security_enabled', 'high', {
      enabled_settings: criticalSettings.map(s => s.id),
      count: criticalSettings.length
    });

    toast({
      title: "Critical Security Enabled",
      description: `Enabled ${criticalSettings.length} critical security features`,
    });
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreStatus = (percentage: number) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 70) return 'Good';
    if (percentage >= 50) return 'Fair';
    return 'Poor';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication': return <Lock className="h-4 w-4" />;
      case 'monitoring': return <Eye className="h-4 w-4" />;
      case 'data_protection': return <Shield className="h-4 w-4" />;
      case 'headers': return <Settings className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    calculateSecurityScore();
  }, [settings]);

  const criticalDisabled = settings.filter(s => s.critical && !s.enabled).length;
  const categoryGroups = settings.reduce((groups, setting) => {
    const category = setting.category;
    if (!groups[category]) groups[category] = [];
    groups[category].push(setting);
    return groups;
  }, {} as Record<string, SecuritySetting[]>);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Hardening</h1>
          <p className="text-muted-foreground">Configure advanced security features</p>
        </div>
      </div>

      {/* Security Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security Score</span>
          </CardTitle>
          <CardDescription>
            Your current security posture based on enabled features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {securityScore.current} of {securityScore.total} points
              </span>
              <span className={`text-2xl font-bold ${getScoreColor(securityScore.percentage)}`}>
                {securityScore.percentage}% - {getScoreStatus(securityScore.percentage)}
              </span>
            </div>
            <Progress 
              value={securityScore.percentage} 
              className={`h-3 ${securityScore.percentage >= 70 ? 'bg-green-100' : 'bg-red-100'}`}
            />
            
            {criticalDisabled > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Critical Security Features Disabled</AlertTitle>
                <AlertDescription>
                  {criticalDisabled} critical security feature(s) are disabled. 
                  <Button 
                    variant="link" 
                    className="p-0 ml-1 h-auto text-red-600" 
                    onClick={enableAllCritical}
                  >
                    Enable all critical features
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Settings by Category */}
      {Object.entries(categoryGroups).map(([category, categorySettings]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 capitalize">
              {getCategoryIcon(category)}
              <span>{category.replace('_', ' ')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categorySettings.map((setting, index) => (
                <div key={setting.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{setting.name}</span>
                        {setting.critical && (
                          <Badge variant="destructive" className="text-xs">
                            Critical
                          </Badge>
                        )}
                        {setting.enabled && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {setting.description}
                      </p>
                    </div>
                    <Switch
                      checked={setting.enabled}
                      onCheckedChange={() => toggleSetting(setting.id)}
                      className="ml-4"
                    />
                  </div>
                  {index < categorySettings.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
          <CardDescription>
            Based on your current configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityScore.percentage < 90 && (
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Improve Security Score</p>
                  <p className="text-xs text-muted-foreground">
                    Enable more security features to reach 90%+ security score
                  </p>
                </div>
              </div>
            )}
            
            {criticalDisabled > 0 && (
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Enable Critical Features</p>
                  <p className="text-xs text-muted-foreground">
                    Critical security features should always be enabled for maximum protection
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Regular Security Monitoring</p>
                <p className="text-xs text-muted-foreground">
                  Security monitoring is active and tracking potential threats
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Eye className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Review Security Events</p>
                <p className="text-xs text-muted-foreground">
                  Regularly check the security dashboard for any incidents
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};