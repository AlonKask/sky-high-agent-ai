import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EncryptionRequest {
  action: 'encrypt' | 'decrypt'
  data: string
  fieldType: 'ssn' | 'passport' | 'payment' | 'general'
  clientId?: string
}

serve(async (req) => {
  // Enhanced security: Origin validation
  const origin = req.headers.get('origin');
  if (origin && origin !== 'https://b7f1977e-e173-476b-99ff-3f86c3c87e08.lovableproject.com') {
    return new Response('Forbidden', { status: 403 });
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    const { action, data, fieldType, clientId }: EncryptionRequest = await req.json()

    // Log security event
    await supabase
      .from('security_events')
      .insert({
        user_id: user.id,
        event_type: `field_level_${action}`,
        severity: 'medium',
        details: {
          field_type: fieldType,
          client_id: clientId,
          timestamp: new Date().toISOString()
        }
      })

    const masterKey = Deno.env.get('ENCRYPTION_MASTER_KEY')
    if (!masterKey) {
      throw new Error('Encryption master key not configured')
    }

    let result: string

    if (action === 'encrypt') {
      // Use Web Crypto API for AES-GCM encryption
      const encoder = new TextEncoder()
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(masterKey.padEnd(32, '0').slice(0, 32)),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      )

      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        keyMaterial,
        encoder.encode(data)
      )

      // Combine IV and encrypted data, then base64 encode
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)
      result = btoa(String.fromCharCode(...combined))

    } else if (action === 'decrypt') {
      // Decode base64 and extract IV and encrypted data
      const combined = new Uint8Array(
        atob(data).split('').map(c => c.charCodeAt(0))
      )
      const iv = combined.slice(0, 12)
      const encryptedData = combined.slice(12)

      const encoder = new TextEncoder()
      const decoder = new TextDecoder()
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(masterKey.padEnd(32, '0').slice(0, 32)),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      )

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        keyMaterial,
        encryptedData
      )

      result = decoder.decode(decrypted)
    } else {
      throw new Error('Invalid action. Must be "encrypt" or "decrypt"')
    }

    console.log(`Successfully ${action}ed ${fieldType} field for user ${user.id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        field_type: fieldType
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Encryption service error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})