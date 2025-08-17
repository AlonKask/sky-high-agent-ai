import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Eye, 
  FileText, 
  UserX,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface ClientSecurityMonitorProps {
  clientId: string;
  userRole: string;
}

export const ClientSecurityMonitor = ({ clientId, userRole }: ClientSecurityMonitorProps) => {
  const [loading, setLoading] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [businessJustification, setBusinessJustification] = useState('');
  const [accessLog, setAccessLog] = useState<any[]>([]);

  const requestSecureAccess = async (fields: string[]) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_client_data_secure', {
        p_client_id: clientId,
        p_fields: fields,
        p_business_justification: businessJustification || null
      });

      if (error) {
        toast({
          title: "Access Denied",
          description: error.message,
          variant: "destructive"
        });
        return null;
      }

      toast({
        title: "Secure Access Granted",
        description: "Client data accessed with full audit trail",
      });

      return data;
    } catch (error) {
      console.error('Secure access error:', error);
      toast({
        title: "Security Error",
        description: "Failed to access client data securely",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const requestEmergencyAccess = async () => {
    if (!emergencyReason.trim()) {
      toast({
        title: "Emergency Reason Required",
        description: "Please provide a reason for emergency access",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // For demo purposes, using current user as approver
      // In production, this would require actual approval workflow
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('emergency_client_access_with_approval', {
        p_client_id: clientId,
        p_emergency_reason: emergencyReason,
        p_approver_id: user?.id,
        p_incident_reference: `EMG-${Date.now()}`
      });

      if (error) {
        toast({
          title: "Emergency Access Denied",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Emergency Access Granted",
        description: "Critical access logged and monitored",
        variant: "destructive"
      });

      return data;
    } catch (error) {
      console.error('Emergency access error:', error);
      toast({
        title: "Emergency Access Failed",
        description: "Failed to grant emergency access",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const anonymizeClientData = async () => {
    if (userRole !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only admins can anonymize client data",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('anonymize_client_data', {
        p_client_id: clientId,
        p_reason: 'GDPR_REQUEST'
      });

      if (error) {
        toast({
          title: "Anonymization Failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Client Data Anonymized",
        description: "All sensitive data has been permanently anonymized",
      });

    } catch (error) {
      console.error('Anonymization error:', error);
      toast({
        title: "Anonymization Error",
        description: "Failed to anonymize client data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAccessAuditLog = async () => {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('details->>client_id', clientId)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (!error) {
        setAccessLog(data || []);
      }
    } catch (error) {
      console.error('Failed to load audit log:', error);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Critical
        </Badge>;
      case 'high':
        return <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800">
          <AlertTriangle className="h-3 w-3" />
          High
        </Badge>;
      case 'medium':
        return <Badge variant="outline" className="flex items-center gap-1 border-yellow-200 text-yellow-800">
          <Clock className="h-3 w-3" />
          Medium
        </Badge>;
      case 'low':
        return <Badge variant="outline" className="flex items-center gap-1 border-green-200 text-green-800">
          <CheckCircle className="h-3 w-3" />
          Low
        </Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Secure Access Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Secure Client Data Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business Justification</Label>
            <Textarea
              placeholder="Provide a business reason for accessing this client data..."
              value={businessJustification}
              onChange={(e) => setBusinessJustification(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestSecureAccess(['id', 'first_name', 'last_name', 'email'])}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Basic Info
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestSecureAccess(['phone', 'company', 'notes'])}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Contact Details
            </Button>
            
            {userRole === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => requestSecureAccess(['encrypted_ssn', 'encrypted_passport_number'])}
                disabled={loading}
                className="flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                <Lock className="h-4 w-4" />
                Sensitive Data
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Access */}
      {userRole === 'admin' && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Emergency Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Emergency Reason</Label>
              <Input
                placeholder="Describe the emergency situation..."
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
              />
            </div>
            
            <Button
              variant="destructive"
              onClick={requestEmergencyAccess}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Grant Emergency Access
            </Button>
          </CardContent>
        </Card>
      )}

      {/* GDPR Compliance */}
      {userRole === 'admin' && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <UserX className="h-5 w-5" />
              GDPR Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Permanently anonymize all client personal data to comply with GDPR deletion requests.
              This action cannot be undone.
            </p>
            
            <Button
              variant="outline"
              onClick={anonymizeClientData}
              disabled={loading}
              className="flex items-center gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <UserX className="h-4 w-4" />
              Anonymize Client Data
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Access Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Access Audit Log
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadAccessAuditLog}>
            Load Recent Activity
          </Button>
        </CardHeader>
        <CardContent>
          {accessLog.length > 0 ? (
            <div className="space-y-3">
              {accessLog.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{event.event_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {getSeverityBadge(event.severity)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No audit logs available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};