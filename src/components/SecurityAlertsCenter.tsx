import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  metadata: any;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export const SecurityAlertsCenter = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
    subscribeToAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching security alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch security alerts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToAlerts = () => {
    const channel = supabase
      .channel('security_alerts')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'security_alerts' },
        (payload) => {
          const newAlert = payload.new as SecurityAlert;
          setAlerts(prev => [newAlert, ...prev]);
          
          // Show toast for critical alerts
          if (newAlert.severity === 'critical') {
            toast({
              title: "🚨 Critical Security Alert",
              description: newAlert.title,
              variant: "destructive"
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledged_at: new Date().toISOString() }
            : alert
        )
      );

      toast({
        title: "Alert Acknowledged",
        description: "Security alert has been acknowledged"
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium': return <Shield className="h-4 w-4 text-warning" />;
      case 'low': return <Shield className="h-4 w-4 text-muted-foreground" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Alerts Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading alerts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Alerts Center
          {alerts.filter(a => !a.acknowledged).length > 0 && (
            <Badge variant="destructive">
              {alerts.filter(a => !a.acknowledged).length} unacknowledged
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
            <p>No security alerts - all systems secure!</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <Card key={alert.id} className={`${!alert.acknowledged ? 'ring-2 ring-primary/20' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                        <span>Type: {alert.alert_type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.acknowledged ? (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Acknowledged
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
};