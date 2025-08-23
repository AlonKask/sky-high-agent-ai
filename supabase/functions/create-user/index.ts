import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers - permissive for development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
  // Handle CORS preflight requests first
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request received');
    return new Response(null, { headers: corsHeaders });
  }

  // Only validate origin for non-OPTIONS requests and in production
  const origin = req.headers.get('origin');
  const isValidOrigin = !origin || 
    origin.includes('sandbox.lovable.dev') || 
    origin.includes('lovableproject.com') ||
    origin === 'https://b7f1977e-e173-476b-99ff-3f86c3c87e08.sandbox.lovable.dev';
  
  if (!isValidOrigin) {
    console.log('Invalid origin:', origin);
    return new Response('Forbidden: Invalid origin', { 
      status: 403, 
      headers: corsHeaders 
    });
  }

  // Log the request for debugging
  console.log('Request received:', {
    method: req.method,
    origin: origin,
    userAgent: req.headers.get('user-agent')
  });

  try {
    console.log('=== CREATE USER FUNCTION START ===');
    console.log('Method:', req.method);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    
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

    console.log('Supabase admin client created');

    // Get the calling user's info and verify permissions
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    console.log('Auth header exists:', !!authHeader);
    console.log('Auth header preview:', authHeader ? authHeader.substring(0, 20) + '...' : 'none');
    
    if (!authHeader) {
      console.log('ERROR: Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Getting user from auth header...');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader);
    
    if (authError) {
      console.log('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${authError.message}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.log('No user found');
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

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

    console.log('Parsing request body...');
    const requestBody = await req.json();
    console.log('Raw request body:', JSON.stringify(requestBody, null, 2));
    
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

    console.log('Parsed and sanitized data:', {
      email,
      firstName,
      lastName,
      role,
      hasPassword: !!password,
      phone,
      company
    });

    // Validate required fields
    console.log('Validating required fields...');
    const missingFields = [];
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!firstName) missingFields.push('firstName');
    if (!lastName) missingFields.push('lastName');
    if (!role) missingFields.push('role');
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({ 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields
        }),
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

    // STEP 1: Check if email already exists in profiles
    console.log('Checking if email already exists...');
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" - which is what we want
      console.error('Error checking existing email:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate email availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingProfile) {
      console.log('Email already exists:', email);
      return new Response(
        JSON.stringify({ 
          error: `Email ${email} is already registered. Please use a different email address.`,
          code: 'EMAIL_EXISTS'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email is available, proceeding with user creation...');

    // STEP 2: Create the user in Supabase Auth
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
      
      // Handle specific Supabase Auth errors
      if (createError.message?.includes('email_address_already_exists')) {
        return new Response(
          JSON.stringify({ 
            error: `Email ${email} is already registered in the authentication system.`,
            code: 'EMAIL_EXISTS'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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

    // STEP 3: Create profile entry
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
      
      // If profile creation fails due to duplicate, clean up auth user
      if (profileError.code === '23505') {
        console.log('Profile already exists, cleaning up auth user...');
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        return new Response(
          JSON.stringify({ 
            error: `Email ${email} is already registered. Please use a different email.`,
            code: 'EMAIL_EXISTS'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // For other profile errors, clean up and report
      console.log('Profile creation failed, cleaning up auth user...');
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to create user profile: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile created successfully');

    // STEP 4: Assign role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role
      });

    if (roleInsertError) {
      console.error('Error assigning role:', roleInsertError);
      
      // Clean up both auth user and profile on role assignment failure
      console.log('Role assignment failed, cleaning up user and profile...');
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      await supabaseAdmin.from('profiles').delete().eq('id', newUser.user.id);
      
      if (roleInsertError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            error: `User role already exists. This shouldn't happen - please contact support.`,
            code: 'ROLE_EXISTS'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Failed to assign role: ${roleInsertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Role assigned successfully');

    // STEP 5: Create user preferences
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
});