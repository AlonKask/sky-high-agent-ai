import { supabase } from "@/integrations/supabase/client";

interface EncryptionService {
  encryptField: (data: string, fieldType: 'ssn' | 'passport' | 'payment' | 'general', clientId?: string) => Promise<string>;
  decryptField: (encryptedData: string, fieldType: 'ssn' | 'passport' | 'payment' | 'general', clientId?: string) => Promise<string>;
}

class SecureEncryptionService implements EncryptionService {
  async encryptField(data: string, fieldType: 'ssn' | 'passport' | 'payment' | 'general', clientId?: string): Promise<string> {
    try {
      const { data: result, error } = await supabase.functions.invoke('secure-data-encryption', {
        body: {
          action: 'encrypt',
          data,
          fieldType,
          clientId
        }
      });

      if (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt sensitive data');
      }

      if (!result.success) {
        throw new Error(result.error || 'Encryption failed');
      }

      return result.result;
    } catch (error) {
      console.error('Field encryption error:', error);
      throw new Error('Unable to secure sensitive data');
    }
  }

  async decryptField(encryptedData: string, fieldType: 'ssn' | 'passport' | 'payment' | 'general', clientId?: string): Promise<string> {
    try {
      const { data: result, error } = await supabase.functions.invoke('secure-data-encryption', {
        body: {
          action: 'decrypt',
          data: encryptedData,
          fieldType,
          clientId
        }
      });

      if (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt sensitive data');
      }

      if (!result.success) {
        throw new Error(result.error || 'Decryption failed');
      }

      return result.result;
    } catch (error) {
      console.error('Field decryption error:', error);
      throw new Error('Unable to access sensitive data');
    }
  }
}

// Export singleton instance
export const encryptionService = new SecureEncryptionService();

// Utility functions for specific data types
export const encryptSSN = (ssn: string, clientId?: string) => 
  encryptionService.encryptField(ssn, 'ssn', clientId);

export const decryptSSN = (encryptedSSN: string, clientId?: string) => 
  encryptionService.decryptField(encryptedSSN, 'ssn', clientId);

export const encryptPassport = (passport: string, clientId?: string) => 
  encryptionService.encryptField(passport, 'passport', clientId);

export const decryptPassport = (encryptedPassport: string, clientId?: string) => 
  encryptionService.decryptField(encryptedPassport, 'passport', clientId);

export const encryptPaymentInfo = (paymentInfo: string, clientId?: string) => 
  encryptionService.encryptField(paymentInfo, 'payment', clientId);

export const decryptPaymentInfo = (encryptedPaymentInfo: string, clientId?: string) => 
  encryptionService.decryptField(encryptedPaymentInfo, 'payment', clientId);

// Secure client data update function
export const updateClientEncryptedField = async (
  clientId: string, 
  fieldName: 'encrypted_ssn' | 'encrypted_passport_number' | 'encrypted_payment_info', 
  value: string
): Promise<boolean> => {
  try {
    // First encrypt the value
    const fieldType = fieldName.includes('ssn') ? 'ssn' : 
                     fieldName.includes('passport') ? 'passport' : 'payment';
    
    const encryptedValue = await encryptionService.encryptField(value, fieldType, clientId);
    
    // Then update using the secure database function
    const { data, error } = await supabase.rpc('update_client_encrypted_field', {
      p_client_id: clientId,
      p_field_name: fieldName,
      p_encrypted_value: encryptedValue
    });

    if (error) {
      console.error('Failed to update encrypted field:', error);
      throw new Error('Failed to update sensitive data');
    }

    return data === true;
  } catch (error) {
    console.error('Error updating encrypted client field:', error);
    throw new Error('Unable to update sensitive client data');
  }
};