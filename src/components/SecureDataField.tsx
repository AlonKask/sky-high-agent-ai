import React, { useState } from 'react';
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserRole } from '@/hooks/useUserRole';
import { maskSensitiveData, shouldMaskData, type SensitiveFieldType } from '@/utils/dataMasking';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecureDataFieldProps {
  value: string | null | undefined;
  fieldType: SensitiveFieldType;
  dataClassification?: 'general' | 'confidential' | 'restricted' | 'secret';
  label?: string;
  clientId?: string;
  allowUnmask?: boolean;
  requireJustification?: boolean;
  className?: string;
}

export const SecureDataField: React.FC<SecureDataFieldProps> = ({
  value,
  fieldType,
  dataClassification = 'confidential',
  label,
  clientId,
  allowUnmask = true,
  requireJustification = false,
  className = ''
}) => {
  const { role } = useUserRole();
  const [isUnmasked, setIsUnmasked] = useState(false);
  const [justification, setJustification] = useState('');
  const [showJustificationInput, setShowJustificationInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!value) {
    return <span className={`text-muted-foreground ${className}`}>—</span>;
  }

  const shouldMask = shouldMaskData(role, dataClassification, fieldType);
  const canUnmask = allowUnmask && ['admin', 'manager'].includes(role || '');

  const handleUnmask = async () => {
    if (requireJustification && !justification.trim()) {
      setShowJustificationInput(true);
      return;
    }

    setIsLoading(true);
    try {
      // Log the data access attempt
      await supabase.rpc('log_data_access_audit', {
        p_table_name: 'clients',
        p_record_id: clientId || null,
        p_access_type: 'unmask_sensitive_field',
        p_classification: dataClassification,
        p_justification: justification || `Unmasked ${fieldType} field: ${label || 'unnamed'}`
      });

      setIsUnmasked(true);
      setShowJustificationInput(false);
      toast.success('Data unmasked and access logged');
    } catch (error) {
      console.error('Error logging data access:', error);
      toast.error('Failed to log data access');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMask = () => {
    setIsUnmasked(false);
    setJustification('');
    setShowJustificationInput(false);
  };

  const displayValue = (shouldMask && !isUnmasked) 
    ? maskSensitiveData(value, fieldType)
    : value;

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'secret': return 'destructive';
      case 'restricted': return 'destructive';
      case 'confidential': return 'default';
      default: return 'secondary';
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'secret':
      case 'restricted':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Shield className="h-3 w-3" />;
    }
  };

  return (
    <TooltipProvider>
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center space-x-2">
          <span className={`font-mono ${shouldMask && !isUnmasked ? 'tracking-wider' : ''}`}>
            {displayValue}
          </span>
          
          {shouldMask && (
            <div className="flex items-center space-x-1">
              <Badge 
                variant={getClassificationColor(dataClassification)} 
                className="text-xs px-1 py-0"
              >
                <span className="flex items-center space-x-1">
                  {getClassificationIcon(dataClassification)}
                  <span>{dataClassification}</span>
                </span>
              </Badge>

              {canUnmask && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={isUnmasked ? handleMask : handleUnmask}
                      disabled={isLoading}
                    >
                      {isUnmasked ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isUnmasked ? 'Mask data' : 'Unmask data (logged)'}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        {showJustificationInput && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2 mt-2">
                <p className="text-sm">
                  Business justification required to unmask {fieldType} data:
                </p>
                <input
                  type="text"
                  placeholder="Enter reason for accessing this sensitive data..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                />
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={handleUnmask}
                    disabled={!justification.trim() || isLoading}
                  >
                    Confirm Access
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowJustificationInput(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!canUnmask && shouldMask && dataClassification !== 'general' && (
          <p className="text-xs text-muted-foreground">
            {role === 'user' ? 'Insufficient privileges to view sensitive data' : 
             'Contact admin to access this classified information'}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
};