import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EncryptionRequest {
  data: string;
  dataType: 'ssn' | 'passport' | 'payment_info' | 'personal_data';
  clientId?: string;
}

interface DecryptionRequest {
  encryptedData: string;
  dataType: 'ssn' | 'passport' | 'payment_info' | 'personal_data';
  clientId?: string;
  accessReason: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    const user = userData.user;
    const { operation, ...requestData } = await req.json();

    // Log security event
    await supabaseClient.from('security_events').insert({
      user_id: user.id,
      event_type: 'admin_action',
      severity: 'medium',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      details: {
        operation: operation,
        data_type: requestData.dataType,
        client_id: requestData.clientId
      }
    });

    if (operation === 'encrypt') {
      const encryptRequest = requestData as EncryptionRequest;
      
      // Proper AES-256-GCM encryption
      const encoder = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Generate key from secure source (in production, use proper key management)
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(`${user.id}-${encryptRequest.dataType}-key`),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode(user.id),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(encryptRequest.data)
      );

      // Combine IV and encrypted data
      const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      result.set(iv);
      result.set(new Uint8Array(encryptedBuffer), iv.length);
      
      const encryptedData = btoa(String.fromCharCode(...result));
      
      // Log data access
      await supabaseClient.from('sensitive_data_access').insert({
        user_id: user.id,
        client_id: encryptRequest.clientId,
        data_type: encryptRequest.dataType,
        access_reason: 'Data encryption',
        ip_address: req.headers.get('x-forwarded-for') || null
      });

      return new Response(JSON.stringify({
        success: true,
        encryptedData: encryptedData,
        keyVersion: '1.0'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (operation === 'decrypt') {
      const decryptRequest = requestData as DecryptionRequest;
      
      // Proper AES-256-GCM decryption
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      try {
        const encryptedBuffer = Uint8Array.from(atob(decryptRequest.encryptedData), c => c.charCodeAt(0));
        const iv = encryptedBuffer.slice(0, 12);
        const encrypted = encryptedBuffer.slice(12);

        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode(`${user.id}-${decryptRequest.dataType}-key`),
          { name: 'PBKDF2' },
          false,
          ['deriveBits', 'deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: encoder.encode(user.id),
            iterations: 100000,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );

        const decryptedBuffer = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          encrypted
        );

        const decryptedData = decoder.decode(decryptedBuffer);
      } catch (decryptError) {
        await supabaseClient.from('security_events').insert({
          user_id: user.id,
          event_type: 'admin_action',
          severity: 'high',
          details: { operation: 'decryption_failed', error: 'Invalid encrypted data' }
        });
        throw new Error('Decryption failed');
      }
      
      // Log data access with reason
      await supabaseClient.from('sensitive_data_access').insert({
        user_id: user.id,
        client_id: decryptRequest.clientId,
        data_type: decryptRequest.dataType,
        access_reason: decryptRequest.accessReason,
        ip_address: req.headers.get('x-forwarded-for') || null
      });

      return new Response(JSON.stringify({
        success: true,
        decryptedData: decryptedData
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else {
      throw new Error("Invalid operation. Use 'encrypt' or 'decrypt'");
    }

  } catch (error) {
    console.error("Error in secure-data-encryption:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});