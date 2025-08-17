/**
 * Emergency Access Dialog - Zero-Trust Emergency Override
 * Secure emergency access request for client data
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Clock, Lock } from 'lucide-react';
import { useEnhancedClientSecurity } from '@/hooks/useEnhancedClientSecurity';

interface EmergencyAccessDialogProps {
  clientId: string;
  clientName?: string;
  children: React.ReactNode;
}

export const EmergencyAccessDialog = ({ clientId, clientName, children }: EmergencyAccessDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [emergencyType, setEmergencyType] = useState<'medical_emergency' | 'legal_requirement' | 'fraud_investigation' | 'system_compromise' | 'compliance_audit' | 'other'>('other');
  const [duration, setDuration] = useState('1 hour');
  
  const { requestEmergencyAccess, emergencyAccessPending } = useEnhancedClientSecurity();

  const handleEmergencyAccess = async () => {
    if (!justification.trim()) {
      return;
    }

    const success = await requestEmergencyAccess(clientId, justification, emergencyType);
    
    if (success) {
      setIsOpen(false);
      setJustification('');
      setEmergencyType('other');
      setDuration('1 hour');
    }
  };

  const emergencyTypeLabels = {
    medical_emergency: 'Medical Emergency',
    legal_requirement: 'Legal Requirement',
    fraud_investigation: 'Fraud Investigation',
    system_compromise: 'System Compromise',
    compliance_audit: 'Compliance Audit',
    other: 'Other'
  };

  const getSeverityColor = (type: string) => {
    switch (type) {
      case 'medical_emergency': return 'bg-red-500 text-white';
      case 'legal_requirement': return 'bg-blue-500 text-white';
      case 'fraud_investigation': return 'bg-orange-500 text-white';
      case 'system_compromise': return 'bg-purple-500 text-white';
      case 'compliance_audit': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Emergency Access Request
          </DialogTitle>
          <DialogDescription>
            Request emergency access to client data. This action is logged and requires justification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Information */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Client Information</AlertTitle>
            <AlertDescription>
              Emergency access requested for: <strong>{clientName || clientId}</strong>
            </AlertDescription>
          </Alert>

          {/* Emergency Type */}
          <div className="space-y-2">
            <Label htmlFor="emergency-type">Emergency Type</Label>
            <Select value={emergencyType} onValueChange={(value: any) => setEmergencyType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select emergency type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(emergencyTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(value)}>{label}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Access Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Access Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30 minutes">30 Minutes</SelectItem>
                <SelectItem value="1 hour">1 Hour</SelectItem>
                <SelectItem value="2 hours">2 Hours</SelectItem>
                <SelectItem value="4 hours">4 Hours</SelectItem>
                <SelectItem value="8 hours">8 Hours</SelectItem>
                <SelectItem value="24 hours">24 Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label htmlFor="justification">Business Justification *</Label>
            <Textarea
              id="justification"
              placeholder="Provide detailed justification for emergency access..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              This justification will be permanently logged for audit purposes.
            </p>
          </div>

          {/* Security Warning */}
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Security Notice</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Emergency access will:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Be logged with your user ID and timestamp</li>
                <li>Require supervisor approval for certain data types</li>
                <li>Automatically expire after the specified duration</li>
                <li>Trigger security monitoring alerts</li>
                <li>Be subject to compliance audit review</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEmergencyAccess}
              disabled={!justification.trim() || emergencyAccessPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {emergencyAccessPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Request Emergency Access
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};