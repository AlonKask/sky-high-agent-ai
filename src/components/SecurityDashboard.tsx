import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, AlertTriangle, Eye, Download, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";
import { logSecurityEvent } from "@/utils/security";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  timestamp: string;
  ip_address: unknown;
  user_agent: string;
  details: any;
  resolved: boolean;
}

interface AuditLog {
  id: string;
  table_name: string;
  operation: string;
  timestamp: string;
  user_id: string;
  record_id: string;
  old_values: any;
  new_values: any;
}

interface DataAccessLog {
  id: string;
  data_type: string;
  access_reason: string;
  timestamp: string;
  ip_address: unknown;
  client_id: string;
}

const SecurityDashboard = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dataAccessLogs, setDataAccessLogs] = useState<DataAccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'admin') {
      loadSecurityData();
    }
  }, [role]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load security events
      const { data: events, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;
      setSecurityEvents(events || []);

      // Load audit logs
      const { data: audits, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (auditError) throw auditError;
      setAuditLogs(audits || []);

      // Load data access logs
      const { data: access, error: accessError } = await supabase
        .from('sensitive_data_access')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (accessError) throw accessError;
      setDataAccessLogs(access || []);

    } catch (error) {
      console.error('Failed to load security data:', error);
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveSecurityEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('security_events')
        .update({ resolved: true })
        .eq('id', eventId);

      if (error) throw error;

      await logSecurityEvent({
        event_type: 'admin_action',
        severity: 'medium',
        details: { action: 'resolved_security_event', event_id: eventId }
      });

      setSecurityEvents(prev => 
        prev.map(event => 
          event.id === eventId ? { ...event, resolved: true } : event
        )
      );

      toast({
        title: "Success",
        description: "Security event marked as resolved"
      });
    } catch (error) {
      console.error('Failed to resolve security event:', error);
      toast({
        title: "Error",
        description: "Failed to resolve security event",
        variant: "destructive"
      });
    }
  };

  const exportSecurityReport = async () => {
    try {
      await logSecurityEvent({
        event_type: 'data_export',
        severity: 'medium',
        details: { export_type: 'security_report' }
      });

      const reportData = {
        securityEvents: securityEvents.slice(0, 100),
        auditLogs: auditLogs.slice(0, 100),
        dataAccessLogs: dataAccessLogs.slice(0, 100),
        generatedAt: new Date().toISOString(),
        generatedBy: user?.email
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Security report exported successfully"
      });
    } catch (error) {
      console.error('Failed to export security report:', error);
      toast({
        title: "Error",
        description: "Failed to export security report",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need administrator privileges to access the security dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading security data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor security events, audit logs, and data access
          </p>
        </div>
        <Button onClick={exportSecurityReport} className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {securityEvents.filter(e => e.severity === 'critical' && !e.resolved).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {securityEvents.filter(e => e.severity === 'high' && !e.resolved).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Access Today</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dataAccessLogs.filter(log => 
                new Date(log.timestamp).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Audits</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {auditLogs.filter(log => 
                new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="access">Data Access</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>
                Recent security events and incidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">
                        {event.event_type.replace(/_/g, ' ').toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(event.severity) as any}>
                          {event.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(event.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{String(event.ip_address) || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={event.resolved ? 'outline' : 'destructive'}>
                          {event.resolved ? 'Resolved' : 'Open'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!event.resolved && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => resolveSecurityEvent(event.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                Database operations and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Record ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.table_name}</TableCell>
                      <TableCell>
                        <Badge variant={
                          log.operation === 'DELETE' ? 'destructive' :
                          log.operation === 'INSERT' ? 'default' : 'secondary'
                        }>
                          {log.operation}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.user_id?.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.record_id?.slice(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sensitive Data Access</CardTitle>
              <CardDescription>
                Log of sensitive data access and operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Type</TableHead>
                    <TableHead>Access Reason</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Client ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataAccessLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {log.data_type.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.access_reason || 'Not specified'}</TableCell>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{String(log.ip_address) || 'Unknown'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.client_id?.slice(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityDashboard;