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
      
      // Simple encryption (in production, use proper encryption like AES-256-GCM)
      const encryptedData = btoa(encryptRequest.data); // Base64 encoding as placeholder
      
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
      
      // Simple decryption (in production, use proper decryption)
      const decryptedData = atob(decryptRequest.encryptedData); // Base64 decoding as placeholder
      
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