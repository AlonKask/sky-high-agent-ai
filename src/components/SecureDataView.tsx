import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { secureAccess, secureDecrypt, validateData } from '@/utils/advancedSecurity';
import { supabase } from '@/integrations/supabase/client';

interface SecureDataViewProps {
  data: any;
  tableId: string;
  recordId: string;
  dataType: string;
  classification: 'confidential' | 'restricted' | 'secret';
  encryptedFields?: string[];
  children?: React.ReactNode;
}

export const SecureDataView = ({ 
  data, 
  tableId, 
  recordId, 
  dataType, 
  classification,
  encryptedFields = [],
  children 
}: SecureDataViewProps) => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [decryptedData, setDecryptedData] = useState<any>({});
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [accessJustification, setAccessJustification] = useState('');
  const [accessApproved, setAccessApproved] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAuthorizedRole = role && ['admin', 'manager', 'supervisor'].includes(role);
  const requiresJustification = classification === 'restricted' || classification === 'secret';

  useEffect(() => {
    if (accessApproved && data) {
      validateAndDecryptData();
    }
  }, [accessApproved, data]);

  const validateAndDecryptData = async () => {
    if (!user || !data) return;

    setLoading(true);
    try {
      // Validate data integrity
      const isValidData = await validateData(tableId, data);
      if (!isValidData) {
        throw new Error('Data validation failed');
      }

      // Log secure access
      const accessGranted = await secureAccess({
        tableId,
        recordId,
        dataType,
        accessReason: accessJustification || 'authorized_access'
      });

      if (!accessGranted) {
        throw new Error('Access denied by security system');
      }

      // Decrypt sensitive fields
      const decrypted: any = {};
      for (const field of encryptedFields) {
        if (data[field]) {
          try {
            decrypted[field] = await secureDecrypt(data[field], classification);
          } catch (error) {
            console.error(`Failed to decrypt field ${field}:`, error);
            decrypted[field] = '[DECRYPTION_FAILED]';
          }
        }
      }
      
      setDecryptedData(decrypted);
    } catch (error) {
      console.error('Secure data access failed:', error);
      // Log security incident
      await supabase.rpc('log_security_event', {
        p_event_type: 'secure_data_access_failed',
        p_severity: 'high',
        p_details: {
          tableId,
          recordId,
          dataType,
          error: error.message,
          userId: user.id
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const requestAccess = async () => {
    if (requiresJustification && !accessJustification.trim()) {
      alert('Please provide justification for accessing this sensitive data.');
      return;
    }

    setLoading(true);
    try {
      // Log access request
      await supabase.rpc('log_security_event', {
        p_event_type: 'sensitive_data_access_requested',
        p_severity: 'medium',
        p_details: {
          tableId,
          recordId,
          dataType,
          classification,
          justification: accessJustification,
          userId: user?.id
        }
      });

      setAccessApproved(true);
    } catch (error) {
      console.error('Access request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFieldVisibility = (field: string) => {
    const newVisible = new Set(visibleFields);
    if (newVisible.has(field)) {
      newVisible.delete(field);
    } else {
      newVisible.add(field);
    }
    setVisibleFields(newVisible);
  };

  const maskSensitiveData = (value: string, field: string) => {
    if (!value) return '';
    
    if (field.includes('email')) {
      const [name, domain] = value.split('@');
      return `${name.substring(0, 2)}***@${domain}`;
    }
    
    if (field.includes('phone')) {
      return `XXX-XXX-${value.slice(-4)}`;
    }
    
    if (field.includes('ssn')) {
      return `XXX-XX-${value.slice(-4)}`;
    }
    
    if (field.includes('passport')) {
      return `${value.substring(0, 2)}XXXXXX${value.slice(-2)}`;
    }
    
    return `${value.substring(0, 2)}${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-2)}`;
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'secret': return 'destructive';
      case 'restricted': return 'secondary';
      case 'confidential': return 'outline';
      default: return 'outline';
    }
  };

  const renderSecureField = (field: string, value: any) => {
    const isEncrypted = encryptedFields.includes(field);
    const isVisible = visibleFields.has(field);
    const displayValue = isEncrypted 
      ? (accessApproved && decryptedData[field] 
         ? (isVisible ? decryptedData[field] : maskSensitiveData(decryptedData[field], field))
         : '[ENCRYPTED]')
      : (isVisible ? value : maskSensitiveData(String(value), field));

    return (
      <div key={field} className="flex items-center justify-between p-3 border rounded">
        <div className="flex-1">
          <Label className="text-sm font-medium capitalize">
            {field.replace(/_/g, ' ')}
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-sm">
              {displayValue}
            </span>
            {isEncrypted && (
              <Badge variant="outline" className="text-xs">
                <Lock className="w-3 h-3 mr-1" />
                ENCRYPTED
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleFieldVisibility(field)}
          disabled={isEncrypted && !accessApproved}
        >
          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>
    );
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Authentication required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthorizedRole) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Shield className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-2 text-sm text-destructive">
              Insufficient permissions to view {classification} data
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Secure Data View
            </CardTitle>
            <CardDescription>
              {dataType} - {tableId}
            </CardDescription>
          </div>
          <Badge variant={getClassificationColor(classification) as any}>
            {classification.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!accessApproved ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Access authorization required</span>
            </div>
            
            {requiresJustification && (
              <div className="space-y-2">
                <Label htmlFor="justification">Access Justification *</Label>
                <Input
                  id="justification"
                  value={accessJustification}
                  onChange={(e) => setAccessJustification(e.target.value)}
                  placeholder="Explain why you need access to this sensitive data..."
                />
              </div>
            )}
            
            <Button 
              onClick={requestAccess}
              disabled={loading || (requiresJustification && !accessJustification.trim())}
              className="w-full"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Requesting Access...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Unlock className="w-4 h-4" />
                  Request Access
                </div>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Access authorized - All actions logged</span>
            </div>
            
            {children}
            
            {Object.entries(data).map(([field, value]) => 
              renderSecureField(field, value)
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SecureDataView;