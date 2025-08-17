import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Globe, 
  Target, 
  Zap,
  Eye,
  Brain,
  Activity,
  Database
} from 'lucide-react';
import { useEnhancedSecurityMonitoring } from '@/hooks/useEnhancedSecurityMonitoring';

interface ThreatIntelligence {
  id: string;
  type: 'malware' | 'phishing' | 'brute_force' | 'ddos' | 'insider_threat' | 'data_exfiltration';
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  source: string;
  description: string;
  indicators: string[];
  firstSeen: string;
  lastSeen: string;
  affectedSystems: number;
  mitigation: string;
}

interface SecurityIncident {
  id: string;
  title: string;
  type: 'detected' | 'investigating' | 'contained' | 'resolved';
  severity: 'critical' | 'high' | 'medium' | 'low';
  detectedAt: string;
  lastUpdate: string;
  affectedUsers: number;
  automated: boolean;
  details: string;
}

interface ThreatMetrics {
  totalThreats: number;
  activeThreatHunts: number;
  incidentsResolved: number;
  meanTimeToDetection: number;
  meanTimeToResponse: number;
  falsePositiveRate: number;
}

export const ThreatIntelligenceCenter: React.FC = () => {
  const { logSecurityEvent } = useEnhancedSecurityMonitoring();
  const [threats, setThreats] = useState<ThreatIntelligence[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [metrics, setMetrics] = useState<ThreatMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeThreatData();
  }, []);

  const initializeThreatData = async () => {
    // Mock threat intelligence data - in production, this would come from threat feeds
    const mockThreats: ThreatIntelligence[] = [
      {
        id: '1',
        type: 'phishing',
        severity: 'high',
        confidence: 92,
        source: 'External Feed',
        description: 'Sophisticated phishing campaign targeting business email accounts',
        indicators: ['suspicious-domain.com', '192.168.1.100', 'malicious@example.com'],
        firstSeen: new Date(Date.now() - 86400000).toISOString(),
        lastSeen: new Date().toISOString(),
        affectedSystems: 3,
        mitigation: 'Block suspicious domains, enhance email filtering'
      },
      {
        id: '2',
        type: 'brute_force',
        severity: 'medium',
        confidence: 87,
        source: 'Internal Detection',
        description: 'Multiple failed login attempts from various IP addresses',
        indicators: ['203.0.113.1', '203.0.113.2', '203.0.113.3'],
        firstSeen: new Date(Date.now() - 3600000).toISOString(),
        lastSeen: new Date(Date.now() - 600000).toISOString(),
        affectedSystems: 1,
        mitigation: 'Implement IP blocking, enhance rate limiting'
      },
      {
        id: '3',
        type: 'insider_threat',
        severity: 'critical',
        confidence: 76,
        source: 'Behavioral Analysis',
        description: 'Unusual data access patterns detected for privileged user',
        indicators: ['abnormal_hours_access', 'bulk_data_download', 'vpn_anomaly'],
        firstSeen: new Date(Date.now() - 7200000).toISOString(),
        lastSeen: new Date(Date.now() - 1800000).toISOString(),
        affectedSystems: 5,
        mitigation: 'Review user permissions, conduct investigation'
      }
    ];

    const mockIncidents: SecurityIncident[] = [
      {
        id: '1',
        title: 'Automated Threat Containment - Phishing Campaign',
        type: 'contained',
        severity: 'high',
        detectedAt: new Date(Date.now() - 1800000).toISOString(),
        lastUpdate: new Date(Date.now() - 900000).toISOString(),
        affectedUsers: 12,
        automated: true,
        details: 'Malicious emails automatically quarantined, users notified'
      },
      {
        id: '2',
        title: 'Brute Force Attack Mitigation',
        type: 'resolved',
        severity: 'medium',
        detectedAt: new Date(Date.now() - 3600000).toISOString(),
        lastUpdate: new Date(Date.now() - 600000).toISOString(),
        affectedUsers: 0,
        automated: true,
        details: 'Attacking IP addresses blocked, rate limiting enhanced'
      },
      {
        id: '3',
        title: 'Insider Threat Investigation',
        type: 'investigating',
        severity: 'critical',
        detectedAt: new Date(Date.now() - 7200000).toISOString(),
        lastUpdate: new Date(Date.now() - 300000).toISOString(),
        affectedUsers: 1,
        automated: false,
        details: 'Security team reviewing access logs and user behavior patterns'
      }
    ];

    const mockMetrics: ThreatMetrics = {
      totalThreats: 147,
      activeThreatHunts: 12,
      incidentsResolved: 89,
      meanTimeToDetection: 2.4,
      meanTimeToResponse: 4.7,
      falsePositiveRate: 8.2
    };

    setThreats(mockThreats);
    setIncidents(mockIncidents);
    setMetrics(mockMetrics);
    setLoading(false);
  };

  const triggerThreatHunt = async () => {
    await logSecurityEvent('threat_hunt_initiated', 'medium', {
      timestamp: new Date().toISOString(),
      automated: false
    });

    // Simulate threat hunting process
    const newIncident: SecurityIncident = {
      id: Date.now().toString(),
      title: 'Manual Threat Hunt - Network Anomaly',
      type: 'investigating',
      severity: 'medium',
      detectedAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      affectedUsers: 0,
      automated: false,
      details: 'Proactive threat hunting initiated by security team'
    };

    setIncidents(prev => [newIncident, ...prev]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIncidentStatusColor = (type: string) => {
    switch (type) {
      case 'detected': return 'bg-red-100 text-red-800';
      case 'investigating': return 'bg-yellow-100 text-yellow-800';
      case 'contained': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getThreatTypeIcon = (type: string) => {
    switch (type) {
      case 'malware': return <Shield className="h-4 w-4" />;
      case 'phishing': return <Target className="h-4 w-4" />;
      case 'brute_force': return <Zap className="h-4 w-4" />;
      case 'ddos': return <Globe className="h-4 w-4" />;
      case 'insider_threat': return <Eye className="h-4 w-4" />;
      case 'data_exfiltration': return <Database className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading || !metrics) {
    return <div>Loading threat intelligence...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Threat Intelligence Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Threats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.totalThreats}</div>
            <p className="text-xs text-muted-foreground">Tracked indicators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Hunts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.activeThreatHunts}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.incidentsResolved}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">MTTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.meanTimeToDetection}h</div>
            <p className="text-xs text-muted-foreground">Mean time to detect</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">MTTR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.meanTimeToResponse}h</div>
            <p className="text-xs text-muted-foreground">Mean time to respond</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">False Positive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.falsePositiveRate}%</div>
            <p className="text-xs text-muted-foreground">Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Threats Alert */}
      {threats.some(t => t.severity === 'critical') && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Critical threats detected!</strong> Immediate attention required for {threats.filter(t => t.severity === 'critical').length} high-priority threats.
          </AlertDescription>
        </Alert>
      )}

      {/* Threat Intelligence and Incident Management */}
      <Tabs defaultValue="threats" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="threats">Threat Intelligence</TabsTrigger>
            <TabsTrigger value="incidents">Active Incidents</TabsTrigger>
            <TabsTrigger value="hunting">Threat Hunting</TabsTrigger>
          </TabsList>
          <Button onClick={triggerThreatHunt} className="ml-auto">
            <Brain className="h-4 w-4 mr-2" />
            Start Threat Hunt
          </Button>
        </div>

        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Active Threat Intelligence
              </CardTitle>
              <CardDescription>
                Real-time threat indicators and intelligence feeds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {threats.map((threat) => (
                  <div key={threat.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getThreatTypeIcon(threat.type)}
                        <div>
                          <h4 className="font-medium">{threat.description}</h4>
                          <p className="text-sm text-muted-foreground">
                            Source: {threat.source} • Confidence: {threat.confidence}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(threat.severity)}>
                          {threat.severity}
                        </Badge>
                        <Badge variant="outline">
                          {threat.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Indicators: </span>
                        <span className="text-sm text-muted-foreground">
                          {threat.indicators.join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Mitigation: </span>
                        <span className="text-sm text-muted-foreground">
                          {threat.mitigation}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Affected systems: {threat.affectedSystems}</span>
                      <span>Last seen: {new Date(threat.lastSeen).toLocaleString()}</span>
                    </div>

                    <Progress value={threat.confidence} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Security Incident Response
              </CardTitle>
              <CardDescription>
                Active security incidents and automated responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div key={incident.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{incident.title}</h4>
                        <p className="text-sm text-muted-foreground">{incident.details}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                        <Badge className={getIncidentStatusColor(incident.type)}>
                          {incident.type}
                        </Badge>
                        {incident.automated && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            Automated
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Affected users: {incident.affectedUsers}</span>
                      <span>Detected: {new Date(incident.detectedAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hunting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Advanced Threat Hunting
              </CardTitle>
              <CardDescription>
                Proactive threat detection and hunting capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-dashed">
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <Eye className="h-8 w-8 mx-auto text-muted-foreground" />
                        <h4 className="font-medium">Behavioral Analysis</h4>
                        <p className="text-sm text-muted-foreground">
                          AI-powered user behavior monitoring
                        </p>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground" />
                        <h4 className="font-medium">Anomaly Detection</h4>
                        <p className="text-sm text-muted-foreground">
                          Statistical anomaly identification
                        </p>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Hunting Scenarios</h4>
                  <div className="space-y-2">
                    {[
                      'Lateral movement detection',
                      'Credential stuffing analysis',
                      'Data exfiltration patterns',
                      'Privilege escalation attempts',
                      'Suspicious API usage'
                    ].map((scenario, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">{scenario}</span>
                        <Button variant="outline" size="sm">Hunt</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};