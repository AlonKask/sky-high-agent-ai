
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function base64Encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function normalizeKey(secret: string): Uint8Array {
  // Pad or truncate to 32 bytes for AES-256-GCM
  const raw = new TextEncoder().encode(secret || "");
  const out = new Uint8Array(32);
  out.set(raw.slice(0, 32));
  return out;
}

async function encrypt(secret: string, plaintext: string): Promise<string> {
  const keyMaterial = normalizeKey(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(plaintext)
  );

  return `v1:gcm:${base64Encode(iv)}:${base64Encode(ct)}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ENC_SECRET = Deno.env.get("GMAIL_CREDENTIALS_KEY") ?? "";

    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Missing Supabase environment config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ENC_SECRET) {
      return new Response(JSON.stringify({ error: "Missing GMAIL_CREDENTIALS_KEY secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticated client to identify caller
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const { data: authData, error: authErr } = await authClient.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = authData.user.id;

    // Service client for privileged updates
    const service = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller is privileged (admin/manager/supervisor)
    const { data: roleRow } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["admin", "manager", "supervisor"])
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { target_user_id }: { target_user_id?: string } = body;

    // Fetch records that still have plaintext present and encrypted missing (scoped to target_user_id if provided)
    let query = service
      .from("gmail_credentials")
      .select("id, user_id, gmail_user_email, access_token, refresh_token, access_token_encrypted, refresh_token_encrypted");

    if (target_user_id) {
      query = query.eq("user_id", target_user_id);
    }

    const { data: creds, error: fetchErr } = await query;
    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    const errors: Array<{ id: string; message: string }> = [];

    for (const row of creds || []) {
      const needsAccess = row.access_token && !row.access_token_encrypted;
      const needsRefresh = row.refresh_token && !row.refresh_token_encrypted;

      if (!needsAccess && !needsRefresh) continue;

      try {
        const updatePayload: Record<string, any> = {};
        if (needsAccess) {
          updatePayload.access_token_encrypted = await encrypt(ENC_SECRET, row.access_token as string);
        }
        if (needsRefresh) {
          updatePayload.refresh_token_encrypted = await encrypt(ENC_SECRET, row.refresh_token as string);
        }

        const { error: upErr } = await service
          .from("gmail_credentials")
          .update({ ...updatePayload, updated_at: new Date().toISOString() })
          .eq("id", row.id);

        if (upErr) {
          errors.push({ id: row.id, message: upErr.message });
          continue;
        }

        // Audit log
        await service.from("credential_access_audit").insert({
          user_id: row.user_id,
          accessor_id: callerId,
          action: "encrypt_tokens",
          details: {
            gmail_user_email: row.gmail_user_email,
            encrypted_access_token: !!updatePayload.access_token_encrypted,
            encrypted_refresh_token: !!updatePayload.refresh_token_encrypted,
          },
        });

        updated++;
      } catch (e: any) {
        errors.push({ id: row.id, message: e?.message || "Encryption error" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        scanned: (creds || []).length,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
