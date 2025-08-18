import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create regular client to verify the requesting user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the requesting user is authenticated and has admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized: Invalid token');
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || userRole.role !== 'admin') {
      console.log('Access denied: User role check failed', { userId: user.id, role: userRole?.role });
      throw new Error('Access denied: Admin role required');
    }

    // Parse request body
    const { email, newPassword } = await req.json();
    
    if (!email || !newPassword) {
      throw new Error('Email and newPassword are required');
    }

    // Validate password strength
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(newPassword)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new Error('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      throw new Error('Password must contain at least one special character');
    }

    // Create admin client with service role
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      throw new Error('Service role key not configured');
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the target user by email
    const { data: users, error: getUserError } = await adminClient.auth.admin.listUsers();
    if (getUserError) {
      throw new Error(`Failed to list users: ${getUserError.message}`);
    }

    const targetUser = users.users.find(u => u.email === email);
    if (!targetUser) {
      throw new Error(`User with email ${email} not found`);
    }

    // Update the user's password
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    // Log the security event
    await supabase
      .from('security_events')
      .insert({
        user_id: user.id,
        event_type: 'admin_password_update',
        severity: 'high',
        details: {
          target_user_email: email,
          target_user_id: targetUser.id,
          admin_id: user.id,
          timestamp: new Date().toISOString()
        }
      });

    console.log('Password updated successfully', { 
      targetEmail: email, 
      adminId: user.id,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password updated successfully for ${email}` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error updating password:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});