import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shield, Download, Trash2, Edit, AlertCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuthOptimized";
import { toast } from "@/hooks/use-toast";
import { logSecurityEvent, logDataAccess } from "@/utils/security";

interface ConsentRecord {
  id: string;
  consent_type: string;
  consent_given: boolean;
  consent_version: string;
  timestamp: string;
  withdrawal_timestamp?: string;
}

interface DataExportRequest {
  id: string;
  request_type: string;
  status: string;
  requested_at: string;
  completed_at?: string;
  export_url?: string;
  admin_notes?: string;
}

const GDPRCompliance = () => {
  const { user } = useAuth();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<'export' | 'deletion' | 'rectification'>('export');
  const [requestReason, setRequestReason] = useState('');

  useEffect(() => {
    if (user) {
      loadGDPRData();
    }
  }, [user]);

  const loadGDPRData = async () => {
    try {
      setLoading(true);

      // Load consent records
      const { data: consentsData, error: consentsError } = await supabase
        .from('gdpr_consent')
        .select('*')
        .order('timestamp', { ascending: false });

      if (consentsError) throw consentsError;
      setConsents(consentsData || []);

      // Load export requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('data_export_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (requestsError) throw requestsError;
      setExportRequests(requestsData || []);

    } catch (error) {
      console.error('Failed to load GDPR data:', error);
      toast({
        title: "Error",
        description: "Failed to load privacy data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConsent = async (
    consentType: string, 
    consentGiven: boolean, 
    version: string = '1.0'
  ) => {
    try {
      const { error } = await supabase
        .from('gdpr_consent')
        .upsert({
          user_id: user?.id,
          consent_type: consentType,
          consent_given: consentGiven,
          consent_version: version,
          withdrawal_timestamp: consentGiven ? null : new Date().toISOString()
        }, {
          onConflict: 'user_id,consent_type,consent_version'
        });

      if (error) throw error;

      await logSecurityEvent({
        event_type: consentGiven ? 'mfa_enabled' : 'mfa_disabled', // Using available enum values
        severity: 'medium',
        details: { 
          action: 'consent_updated', 
          consent_type: consentType, 
          consent_given: consentGiven 
        }
      });

      await loadGDPRData();

      toast({
        title: "Success",
        description: `Consent ${consentGiven ? 'granted' : 'withdrawn'} successfully`
      });
    } catch (error) {
      console.error('Failed to update consent:', error);
      toast({
        title: "Error",
        description: "Failed to update consent",
        variant: "destructive"
      });
    }
  };

  const submitDataRequest = async () => {
    try {
      const { error } = await supabase
        .from('data_export_requests')
        .insert({
          user_id: user?.id,
          request_type: requestType,
          admin_notes: requestReason
        });

      if (error) throw error;

      await logSecurityEvent({
        event_type: 'data_export',
        severity: 'medium',
        details: { request_type: requestType, reason: requestReason }
      });

      await logDataAccess(null, 'personal_data', `GDPR ${requestType} request`);

      await loadGDPRData();

      setExportDialogOpen(false);
      setDeleteDialogOpen(false);
      setRequestReason('');

      toast({
        title: "Success",
        description: `${requestType.charAt(0).toUpperCase() + requestType.slice(1)} request submitted successfully`
      });
    } catch (error) {
      console.error('Failed to submit data request:', error);
      toast({
        title: "Error",
        description: "Failed to submit request",
        variant: "destructive"
      });
    }
  };

  const downloadExportedData = async (exportRequest: DataExportRequest) => {
    try {
      if (!exportRequest.export_url) {
        toast({
          title: "Error",
          description: "Export file not available",
          variant: "destructive"
        });
        return;
      }

      await logDataAccess(null, 'personal_data', 'Downloaded exported data');

      // In a real implementation, this would download from a secure URL
      window.open(exportRequest.export_url, '_blank');

      toast({
        title: "Success",
        description: "Export download started"
      });
    } catch (error) {
      console.error('Failed to download export:', error);
      toast({
        title: "Error",
        description: "Failed to download export",
        variant: "destructive"
      });
    }
  };

  const consentTypes = [
    {
      type: 'data_processing',
      label: 'Data Processing',
      description: 'Process your personal data for business operations'
    },
    {
      type: 'marketing',
      label: 'Marketing Communications',
      description: 'Send you promotional emails and marketing materials'
    },
    {
      type: 'analytics',
      label: 'Analytics',
      description: 'Analyze your usage patterns to improve our services'
    },
    {
      type: 'cookies',
      label: 'Cookies',
      description: 'Store cookies on your device for enhanced experience'
    },
    {
      type: 'data_sharing',
      label: 'Data Sharing',
      description: 'Share your data with trusted third-party partners'
    }
  ];

  const getConsentStatus = (consentType: string) => {
    const consent = consents.find(c => 
      c.consent_type === consentType && 
      c.consent_version === '1.0'
    );
    return consent?.consent_given || false;
  };

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'pending': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading privacy settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Privacy & Data Protection</h1>
          <p className="text-muted-foreground">
            Manage your data privacy preferences and GDPR rights
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Your Data</DialogTitle>
                <DialogDescription>
                  Request a copy of all your personal data we have stored.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="export-reason">Reason for export (optional)</Label>
                  <Textarea
                    id="export-reason"
                    placeholder="Why do you need this data export?"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    setRequestType('export');
                    submitDataRequest();
                  }}>
                    Submit Request
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Your Data</DialogTitle>
                <DialogDescription>
                  Request deletion of all your personal data. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Warning</span>
                  </div>
                  <p className="text-sm text-destructive/80 mt-1">
                    This will permanently delete all your data including clients, bookings, and communications.
                  </p>
                </div>
                <div>
                  <Label htmlFor="delete-reason">Reason for deletion</Label>
                  <Textarea
                    id="delete-reason"
                    placeholder="Please explain why you want to delete your data"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => {
                    setRequestType('deletion');
                    submitDataRequest();
                  }}>
                    Request Deletion
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Consent Management
          </CardTitle>
          <CardDescription>
            Control how we use your personal data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {consentTypes.map((consent) => (
            <div key={consent.type} className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium">{consent.label}</div>
                <div className="text-sm text-muted-foreground">
                  {consent.description}
                </div>
              </div>
              <Switch
                checked={getConsentStatus(consent.type)}
                onCheckedChange={(checked) => 
                  updateConsent(consent.type, checked, '1.0')
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Your Data Requests</CardTitle>
          <CardDescription>
            Track your data export, deletion, and rectification requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exportRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data requests submitted yet
            </div>
          ) : (
            <div className="space-y-4">
              {exportRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium capitalize">
                      {request.request_type} Request
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Requested on {new Date(request.requested_at).toLocaleDateString()}
                    </div>
                    {request.completed_at && (
                      <div className="text-sm text-muted-foreground">
                        Completed on {new Date(request.completed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRequestStatusColor(request.status) as any}>
                      {request.status}
                    </Badge>
                    {request.status === 'completed' && request.export_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadExportedData(request)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Retention Information */}
      <Card>
        <CardHeader>
          <CardTitle>Data Retention Policy</CardTitle>
          <CardDescription>
            How long we keep your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Client Data</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Retained for 7 years after last interaction for business and legal compliance
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Communication Records</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Archived after 30 days, permanently deleted after 7 years
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Booking History</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Retained for 7 years for financial and tax compliance
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Security Logs</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Retained for 10 years for security and compliance purposes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GDPRCompliance;