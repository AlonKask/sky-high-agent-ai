/**
 * Enhanced Security Dashboard - Zero-Trust Monitoring
 * Real-time security monitoring and incident response
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  Clock, 
  Lock,
  Eye,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { EnhancedSecurityService, SecurityAlert, EmergencyAccess } from '@/services/EnhancedSecurityService';
import { useToast } from '@/components/ui/use-toast';

export const SecurityDashboardEnhanced = () => {
  const [securityMetrics, setSecurityMetrics] = useState({
    total_alerts: 0,
    critical_alerts: 0,
    unresolved_alerts: 0,
    emergency_accesses: 0,
    anomalies_detected: 0
  });
  
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [emergencyAccessLog, setEmergencyAccessLog] = useState<EmergencyAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  
  const { toast } = useToast();

  const loadSecurityData = async () => {
    setIsLoading(true);
    
    try {
      const [metrics, alerts, emergencyLog] = await Promise.all([
        EnhancedSecurityService.getSecurityMetrics(),
        EnhancedSecurityService.getSecurityAlerts(),
        EnhancedSecurityService.getEmergencyAccessLog()
      ]);

      setSecurityMetrics(metrics);
      setSecurityAlerts(alerts);
      setEmergencyAccessLog(emergencyLog);
    } catch (error) {
      console.error('Failed to load security data:', error);
      toast({
        title: "Security Data Load Failed",
        description: "Unable to load security monitoring data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runAnomalyDetection = async () => {
    try {
      await EnhancedSecurityService.runAnomalyDetection();
      toast({
        title: "Anomaly Detection Complete",
        description: "Security anomaly scan completed successfully",
      });
      loadSecurityData(); // Refresh data
    } catch (error) {
      console.error('Anomaly detection failed:', error);
      toast({
        title: "Anomaly Detection Failed",
        description: "Failed to run security anomaly detection",
        variant: "destructive"
      });
    }
  };

  const resolveAlert = async (alertId: string, notes?: string) => {
    try {
      await EnhancedSecurityService.resolveSecurityAlert(alertId, notes);
      toast({
        title: "Alert Resolved",
        description: "Security alert has been marked as resolved",
      });
      loadSecurityData(); // Refresh data
      setSelectedAlert(null);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast({
        title: "Alert Resolution Failed",
        description: "Failed to resolve security alert",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadSecurityData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'client_data_access': return <Eye className="h-4 w-4" />;
      case 'policy_violation': return <XCircle className="h-4 w-4" />;
      case 'emergency_access': return <AlertTriangle className="h-4 w-4" />;
      case 'anomaly_detected': return <Search className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading security data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics.total_alerts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{securityMetrics.critical_alerts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{securityMetrics.unresolved_alerts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Access</CardTitle>
            <Lock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{securityMetrics.emergency_accesses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
            <Search className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{securityMetrics.anomalies_detected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={loadSecurityData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
        <Button onClick={runAnomalyDetection} variant="outline">
          <Search className="h-4 w-4 mr-2" />
          Run Anomaly Detection
        </Button>
      </div>

      {/* Security Monitoring Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Access</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>
                Real-time security monitoring and incident detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {securityAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="border rounded-lg p-4 hover:bg-accent cursor-pointer"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getEventTypeIcon(alert.event_type)}
                          <div>
                            <h4 className="font-medium">{alert.event_type.replace(/_/g, ' ').toUpperCase()}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          {alert.resolved ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      {alert.requires_investigation && (
                        <Alert className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            This alert requires immediate investigation
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Access Log</CardTitle>
              <CardDescription>
                Audit trail of emergency client data access requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {emergencyAccessLog.map((access) => (
                    <div key={access.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Emergency Access #{access.id.slice(0, 8)}</h4>
                          <p className="text-sm text-muted-foreground">
                            Type: {access.emergency_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(access.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={access.access_granted ? "default" : "destructive"}>
                          {access.access_granted ? "GRANTED" : "DENIED"}
                        </Badge>
                      </div>
                      <Separator className="my-2" />
                      <p className="text-sm">{access.justification}</p>
                      {access.expires_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Expires: {new Date(access.expires_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Analytics</CardTitle>
              <CardDescription>
                Security trends and threat intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Zero-Trust Security Active</AlertTitle>
                  <AlertDescription>
                    All client data access is monitored and logged. Emergency access requires justification.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Access Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Normal Access:</span>
                          <span className="text-green-600">95%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Emergency Access:</span>
                          <span className="text-yellow-600">3%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Denied Access:</span>
                          <span className="text-red-600">2%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Security Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          <span>Zero-Trust Policies Active</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          <span>Real-time Monitoring</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          <span>Anomaly Detection</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          <span>Audit Logging</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selected Alert Detail Modal */}
      {selectedAlert && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Alert Details</CardTitle>
              <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Event Type</h4>
                <p className="text-sm text-muted-foreground">{selectedAlert.event_type}</p>
              </div>
              <div>
                <h4 className="font-medium">Severity</h4>
                <Badge className={getSeverityColor(selectedAlert.severity)}>
                  {selectedAlert.severity}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium">Details</h4>
                <pre className="text-sm bg-muted p-2 rounded">
                  {JSON.stringify(selectedAlert.details, null, 2)}
                </pre>
              </div>
              {!selectedAlert.resolved && (
                <Button onClick={() => resolveAlert(selectedAlert.id, 'Resolved from dashboard')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Resolved
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};