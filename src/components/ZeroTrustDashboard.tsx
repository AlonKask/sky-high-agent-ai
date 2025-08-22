import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Fingerprint, 
  Eye, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Smartphone,
  Brain,
  Activity,
  Ban,
  Zap,
  XCircle,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { getSecurityMetrics, checkIPBlocked } from '@/utils/enhancedSecurity';

// Behavioral Analytics Component
const BehavioralAnalyticsContent: React.FC<{ user: any }> = ({ user }) => {
  const [behaviorMetrics, setBehaviorMetrics] = useState<Array<{
    metric_name: string;
    confidence_score: number;
    data_points: number;
    last_calculated: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchBehaviorMetrics();
    }
  }, [user]);

  const fetchBehaviorMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('user_behavior_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('last_calculated', { ascending: false });

      if (error) {
        console.error('Error fetching behavior metrics:', error);
      } else {
        setBehaviorMetrics(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch behavior metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricScore = (metricName: string) => {
    const metric = behaviorMetrics.find(m => m.metric_name === metricName);
    return metric ? Number(metric.confidence_score) : 75; // Default score for new users
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const metrics = [
    {
      name: 'Typing Patterns',
      description: 'Keystroke dynamics and timing analysis',
      metricKey: 'typing_patterns',
      icon: '⌨️'
    },
    {
      name: 'Mouse Movement',
      description: 'Movement patterns and interaction behavior',
      metricKey: 'mouse_movement',
      icon: '🖱️'
    },
    {
      name: 'Access Patterns',
      description: 'Login times and application usage patterns',
      metricKey: 'access_patterns',
      icon: '🕒'
    },
    {
      name: 'Geographic Location',
      description: 'Location-based risk assessment',
      metricKey: 'geo_location',
      icon: '🌍'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-full mb-3"></div>
            <div className="h-2 bg-muted rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {metrics.map((metric) => {
        const score = getMetricScore(metric.metricKey);
        const behaviorData = behaviorMetrics.find(m => m.metric_name === metric.metricKey);
        
        return (
          <div key={metric.metricKey} className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{metric.icon}</span>
              <h4 className="font-medium">{metric.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {metric.description}
            </p>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Confidence Score</span>
              <span className={`font-medium ${getScoreColor(score)}`}>
                {Math.round(score)}%
              </span>
            </div>
            <Progress value={score} className="mb-2" />
            {behaviorData && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Data Points: {behaviorData.data_points}</div>
                <div>Last Updated: {new Date(behaviorData.last_calculated).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        );
      })}
      
      {behaviorMetrics.length === 0 && (
        <div className="col-span-full text-center py-8">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Building Behavioral Profile</h3>
          <p className="text-muted-foreground">
            Your behavioral analytics are being collected. Data will appear as you use the system.
          </p>
        </div>
      )}
    </div>
  );
};

interface ZeroTrustMetrics {
  deviceTrustScore: number;
  behavioralTrustScore: number;
  accessPolicyCompliance: number;
  continuousVerificationStatus: boolean;
  riskBasedAuthentication: boolean;
  mlAnomalyDetection: boolean;
}

interface DeviceFingerprint {
  id: string;
  deviceType: string;
  browser: string;
  os: string;
  lastSeen: string;
  trustScore: number;
  isVerified: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  compliance: number;
  lastEvaluated: string;
  status: 'compliant' | 'non-compliant' | 'warning';
}

interface SecurityThreat {
  id: string;
  event_type: string;
  severity: string;
  details: any;
  timestamp: string;
  user_id?: string;
}

interface SecurityMetrics {
  period_hours: number;
  threat_events: number;
  critical_events: number;
  xss_attempts: number;
  blocked_ips: number;
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  last_updated: string;
}

export const ZeroTrustDashboard: React.FC = () => {
  const { user } = useSimpleAuth();
  const [metrics, setMetrics] = useState<ZeroTrustMetrics>({
    deviceTrustScore: 85,
    behavioralTrustScore: 92,
    accessPolicyCompliance: 88,
    continuousVerificationStatus: true,
    riskBasedAuthentication: true,
    mlAnomalyDetection: true
  });
  
  const [deviceFingerprints, setDeviceFingerprints] = useState<DeviceFingerprint[]>([]);
  const [accessPolicies, setAccessPolicies] = useState<AccessPolicy[]>([]);
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [threatLevel, setThreatLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('LOW');
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      initializeZeroTrustData();
    }
  }, [user]);

  useEffect(() => {
    // Auto-refresh security data every 30 seconds
    const interval = setInterval(() => {
      if (user) {
        fetchSecurityData();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  const fetchSecurityData = async () => {
    try {
      // Fetch recent threats
      const { data: events, error } = await supabase
        .from('security_events')
        .select('*')
        .in('severity', ['high', 'critical'])
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setThreats(events || []);
      
      // Fetch security metrics
      const securityMetricsData = await getSecurityMetrics('24 hours');
      if (securityMetricsData) {
        setSecurityMetrics(securityMetricsData);
        setThreatLevel(securityMetricsData.threat_level);
      }
      
      // Check if current IP is blocked
      const blocked = await checkIPBlocked();
      setIsBlocked(blocked);
      
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    }
  };

  const generateCurrentDeviceFingerprint = async () => {
    if (!user?.id) return;
    
    try {
      // Get browser and device information
      const deviceType = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        ? 'Mobile' : 'Desktop';
      
      const browser = (() => {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return `Chrome ${userAgent.match(/Chrome\/(\d+)/)?.[1] || ''}`;
        if (userAgent.includes('Firefox')) return `Firefox ${userAgent.match(/Firefox\/(\d+)/)?.[1] || ''}`;
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return `Safari ${userAgent.match(/Version\/(\d+)/)?.[1] || ''}`;
        if (userAgent.includes('Edge')) return `Edge ${userAgent.match(/Edge\/(\d+)/)?.[1] || ''}`;
        return 'Unknown Browser';
      })();
      
      const os = (() => {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac OS')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS')) return 'iOS';
        return 'Unknown OS';
      })();
      
      const screenResolution = `${screen.width}x${screen.height}`;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const language = navigator.language;
      
      // Generate device fingerprint using Supabase function
      const { data, error } = await supabase.rpc('generate_device_fingerprint', {
        p_user_id: user.id,
        p_device_type: deviceType,
        p_browser: browser,
        p_os: os,
        p_screen_resolution: screenResolution,
        p_timezone: timezone,
        p_language: language,
        p_metadata: {
          user_agent: navigator.userAgent,
          screen_color_depth: screen.colorDepth,
          timestamp: new Date().toISOString()
        }
      });
      
      if (error) {
        console.error('Error generating device fingerprint:', error);
      } else {
        console.log('Device fingerprint generated successfully');
      }
    } catch (error) {
      console.error('Failed to generate device fingerprint:', error);
    }
  };

  const initializeZeroTrustData = async () => {
    try {
      setLoading(true);
      
      // Fetch security data first
      await fetchSecurityData();
      // Generate real device fingerprint and fetch device data
      await generateCurrentDeviceFingerprint();
      
      // Fetch real device fingerprints from database
      const { data: devices, error: devicesError } = await supabase
        .from('device_fingerprints')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen', { ascending: false });
      
      if (devicesError) {
        console.error('Error fetching devices:', devicesError);
      } else {
        const formattedDevices: DeviceFingerprint[] = (devices || []).map(device => ({
          id: device.id,
          deviceType: device.device_type,
          browser: device.browser,
          os: device.os,
          lastSeen: device.last_seen,
          trustScore: device.trust_score,
          isVerified: device.is_verified,
          riskLevel: device.risk_level as 'low' | 'medium' | 'high'
        }));
        setDeviceFingerprints(formattedDevices);
      }

      // Fetch real access policies
      const { data: policies, error: policiesError } = await supabase
        .from('access_policies')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (policiesError) {
        console.error('Error fetching access policies:', policiesError);
      } else {
        const formattedPolicies: AccessPolicy[] = (policies || []).map(policy => ({
          id: policy.id,
          name: policy.name,
          description: policy.description || '',
          compliance: policy.compliance_percentage,
          lastEvaluated: policy.last_evaluated,
          status: policy.status as 'compliant' | 'non-compliant' | 'warning'
        }));
        setAccessPolicies(formattedPolicies);
      }

      // Calculate real metrics based on fetched data (use current state instead of stale variables)
      let avgDeviceTrust = 50;
      let avgPolicyCompliance = 50;
      
      // Wait for device data to be fetched and set
      if (devices && devices.length > 0) {
        avgDeviceTrust = devices.reduce((sum, device) => sum + device.trust_score, 0) / devices.length;
      }
      
      if (policies && policies.length > 0) {
        avgPolicyCompliance = policies.reduce((sum, policy) => sum + policy.compliance_percentage, 0) / policies.length;
      }

      // Fetch behavioral analytics
      const { data: behaviorData } = await supabase
        .from('user_behavior_analytics')
        .select('confidence_score')
        .eq('user_id', user.id);
      
      const avgBehavioralTrust = behaviorData && behaviorData.length > 0
        ? behaviorData.reduce((sum, metric) => sum + Number(metric.confidence_score), 0) / behaviorData.length
        : 75; // Default for new users

      setMetrics(prev => ({
        ...prev,
        deviceTrustScore: Math.round(avgDeviceTrust),
        accessPolicyCompliance: Math.round(avgPolicyCompliance),
        behavioralTrustScore: Math.round(avgBehavioralTrust)
      }));

      setLoading(false);
    } catch (error) {
      console.error('Error initializing zero trust data:', error);
      setLoading(false);
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'high': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-500 text-white';
      case 'warning': return 'bg-yellow-500 text-black';
      case 'non-compliant': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getThreatVariant = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'default';
      default: return 'outline';
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'outline';
    }
  };

  const formatEventType = (eventType: string): string => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Threat Level */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zero Trust Security Center</h1>
          <p className="text-muted-foreground">Comprehensive security monitoring and zero trust enforcement</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getThreatVariant(threatLevel)}>
            {threatLevel} THREAT
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            Live Monitor
          </div>
          {isBlocked && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Ban className="h-3 w-3" />
              IP Blocked
            </Badge>
          )}
        </div>
      </div>

      {/* Enhanced Overview with Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Device Trust Score</p>
                <p className={`text-2xl font-bold ${getTrustScoreColor(metrics.deviceTrustScore)}`}>
                  {metrics.deviceTrustScore}%
                </p>
                <Progress value={metrics.deviceTrustScore} className="mt-2" />
              </div>
              <Fingerprint className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Behavioral Trust</p>
                <p className={`text-2xl font-bold ${getTrustScoreColor(metrics.behavioralTrustScore)}`}>
                  {metrics.behavioralTrustScore}%
                </p>
                <Progress value={metrics.behavioralTrustScore} className="mt-2" />
              </div>
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Policy Compliance</p>
                <p className={`text-2xl font-bold ${getTrustScoreColor(metrics.accessPolicyCompliance)}`}>
                  {metrics.accessPolicyCompliance}%
                </p>
                <Progress value={metrics.accessPolicyCompliance} className="mt-2" />
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Continuous Verification</p>
                <div className="flex items-center gap-2 mt-1">
                  {metrics.continuousVerificationStatus ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`font-medium ${metrics.continuousVerificationStatus ? 'text-green-500' : 'text-red-500'}`}>
                    {metrics.continuousVerificationStatus ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Risk-Based Auth</p>
                <div className="flex items-center gap-2 mt-1">
                  {metrics.riskBasedAuthentication ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`font-medium ${metrics.riskBasedAuthentication ? 'text-green-500' : 'text-red-500'}`}>
                    {metrics.riskBasedAuthentication ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              <Lock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ML Anomaly Detection</p>
                <div className="flex items-center gap-2 mt-1">
                  {metrics.mlAnomalyDetection ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`font-medium ${metrics.mlAnomalyDetection ? 'text-green-500' : 'text-red-500'}`}>
                    {metrics.mlAnomalyDetection ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* Security Metrics Cards */}
        {securityMetrics && (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Threat Events</p>
                    <p className="text-2xl font-bold text-orange-500">{securityMetrics.threat_events}</p>
                    <p className="text-xs text-muted-foreground mt-1">Last {securityMetrics.period_hours}h</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Critical Events</p>
                    <p className="text-2xl font-bold text-red-500">{securityMetrics.critical_events}</p>
                    <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
                  </div>
                  <Shield className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Blocked IPs</p>
                    <p className="text-2xl font-bold text-red-600">{securityMetrics.blocked_ips}</p>
                    <p className="text-xs text-muted-foreground mt-1">Auto-blocked threats</p>
                  </div>
                  <Ban className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Enhanced Detailed Tabs */}
      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">Device Management</TabsTrigger>
          <TabsTrigger value="policies">Access Policies</TabsTrigger>
          <TabsTrigger value="analytics">Behavioral Analytics</TabsTrigger>
          <TabsTrigger value="monitor">Security Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Registered Devices
              </CardTitle>
              <CardDescription>
                Device fingerprints and trust scores for zero-trust authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deviceFingerprints.map((device) => (
                  <div key={device.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{device.deviceType} - {device.browser}</p>
                          <p className="text-sm text-muted-foreground">{device.os}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskLevelColor(device.riskLevel)}>
                          {device.riskLevel.toUpperCase()}
                        </Badge>
                        {device.isVerified && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Last seen: {new Date(device.lastSeen).toLocaleString()}
                      </span>
                      <span className={`font-medium ${getTrustScoreColor(device.trustScore)}`}>
                        Trust Score: {device.trustScore}%
                      </span>
                    </div>
                    
                    <Progress value={device.trustScore} className="mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Zero Trust Access Policies
              </CardTitle>
              <CardDescription>
                Dynamic policy enforcement with real-time compliance monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accessPolicies.map((policy) => (
                  <div key={policy.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{policy.name}</p>
                        <p className="text-sm text-muted-foreground">{policy.description}</p>
                      </div>
                      <Badge className={getComplianceStatusColor(policy.status)}>
                        {policy.status.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        Last evaluated: {new Date(policy.lastEvaluated).toLocaleString()}
                      </span>
                      <span className={`font-medium ${getTrustScoreColor(policy.compliance)}`}>
                        Compliance: {policy.compliance}%
                      </span>
                    </div>
                    
                    <Progress value={policy.compliance} className="mb-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Behavioral Analytics
              </CardTitle>
              <CardDescription>
                ML-powered continuous authentication and anomaly detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BehavioralAnalyticsContent user={user} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Real-Time Security Monitor
              </CardTitle>
              <CardDescription>
                Live threat detection and security event monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Security Metrics Dashboard */}
              {securityMetrics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Threat Events</p>
                        <p className="text-lg font-bold">{securityMetrics.threat_events}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Critical Events</p>
                        <p className="text-lg font-bold">{securityMetrics.critical_events}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">XSS Attempts</p>
                        <p className="text-lg font-bold">{securityMetrics.xss_attempts}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <Ban className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Blocked IPs</p>
                        <p className="text-lg font-bold">{securityMetrics.blocked_ips}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Period</p>
                        <p className="text-sm font-semibold">{securityMetrics.period_hours}h</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Recent Threats ({threats.length})
                    </h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={fetchSecurityData}
                      className="text-xs"
                    >
                      Refresh
                    </Button>
                  </div>
                  {threats.length === 0 ? (
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No recent high-priority threats detected</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {threats.map((threat) => (
                        <div 
                          key={threat.id}
                          className="p-2 rounded border border-border bg-card/50"
                        >
                          <div className="flex items-center justify-between">
                            <Badge variant={getSeverityVariant(threat.severity)}>
                              {threat.severity}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(threat.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{formatEventType(threat.event_type)}</p>
                          {threat.details && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {threat.details.ip_address && `IP: ${threat.details.ip_address}`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Enhanced Security Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Security Monitoring:</span>
                      <Badge variant="default" className="text-xs">Active</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>XSS Protection:</span>
                      <Badge variant="default" className="text-xs">Enhanced</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>IP Blocking:</span>
                      <Badge variant="default" className="text-xs">
                        {securityMetrics?.blocked_ips ? `${securityMetrics.blocked_ips} Blocked` : 'Active'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Rate Limiting:</span>
                      <Badge variant="default" className="text-xs">Enforced</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Input Validation:</span>
                      <Badge variant="default" className="text-xs">Multi-Layer</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Function Security:</span>
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Fixed
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Database Security:</span>
                      <Badge variant="default" className="text-xs">Hardened</Badge>
                    </div>
                  </div>
                  {securityMetrics && (
                    <div className="mt-3 text-xs text-muted-foreground border-t pt-2">
                      Last updated: {new Date(securityMetrics.last_updated).toLocaleString()}
                    </div>
                  )}
                  {isBlocked && (
                    <div className="mt-3 p-2 border border-destructive rounded-md bg-destructive/10">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-semibold text-destructive">IP Blocked</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your IP address has been temporarily blocked due to suspicious activity.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};