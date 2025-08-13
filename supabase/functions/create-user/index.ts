import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withRateLimit } from '../_shared/rate-limiter.ts'

// Phase 2: Tighten CORS security - specific origin instead of wildcard
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://b7f1977e-e173-476b-99ff-3f86c3c87e08.lovableproject.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 hours
}

interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'supervisor' | 'gds_expert' | 'agent' | 'user';
  phone?: string;
  company?: string;
}

// Define permission hierarchy
const roleHierarchy = {
  'admin': ['manager', 'supervisor', 'gds_expert', 'agent', 'user'],
  'manager': ['supervisor', 'gds_expert', 'agent', 'user'],
  'supervisor': ['gds_expert', 'agent', 'user']
};

serve(async (req) => {
  // Enhanced security: Origin validation
  const origin = req.headers.get('origin');
  if (origin && origin !== 'https://b7f1977e-e173-476b-99ff-3f86c3c87e08.lovableproject.com') {
    return new Response('Forbidden', { status: 403 });
  }

  // SECURITY: Apply strict rate limiting to user creation
  return await withRateLimit(req, {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 user creations per hour per IP
  }, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the calling user's info and verify permissions
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check caller's role and permissions
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'Unable to determine user role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerRole = userRole.role;
    
    // Check if caller has permission to create users
    if (!['admin', 'manager', 'supervisor'].includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    
    // Enhanced input validation and sanitization
    const sanitizeInput = (input: string) => {
      return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                  .replace(/[<>]/g, '')
                  .trim();
    };

    const { email, password, firstName, lastName, role, phone, company }: CreateUserRequest = {
      email: sanitizeInput(requestBody.email || ''),
      password: requestBody.password || '', // Don't sanitize password
      firstName: sanitizeInput(requestBody.firstName || ''),
      lastName: sanitizeInput(requestBody.lastName || ''),
      role: requestBody.role || '',
      phone: requestBody.phone ? sanitizeInput(requestBody.phone) : undefined,
      company: requestBody.company ? sanitizeInput(requestBody.company) : undefined
    };

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller can create this role
    const allowedRoles = roleHierarchy[callerRole as keyof typeof roleHierarchy] || [];
    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient permissions to create role '${role}'. You can only create: ${allowedRoles.join(', ')}` 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating user with email: ${email}, role: ${role}, by: ${callerRole}`);

    // Create the user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
      email_confirm: true
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'User creation failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User created with ID: ${newUser.user.id}`);

    // Create profile entry
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        company
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't fail completely if profile creation fails
    }

    // Assign role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role
      });

    if (roleInsertError) {
      console.error('Error assigning role:', roleInsertError);
      // Try to cleanup the user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to assign role: ${roleInsertError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user preferences
    const { error: prefsError } = await supabaseAdmin
      .from('user_preferences')
      .insert({
        user_id: newUser.user.id
      });

    if (prefsError) {
      console.error('Error creating preferences:', prefsError);
      // Don't fail if preferences creation fails
    }

    console.log(`Successfully created user: ${email} with role: ${role}`);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          role
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  }); // Close withRateLimit
});