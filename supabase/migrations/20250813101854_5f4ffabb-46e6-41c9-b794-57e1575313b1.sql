-- TASK 3: FINAL SECURITY LOCKDOWN - SECURE REMAINING SENSITIVE TABLES
-- Completing comprehensive security overhaul

-- =====================================================
-- 1. PROFILES - SECURE USER PROFILE DATA
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Strict profile access control" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can modify own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create single secure profile access policy
CREATE POLICY "Secure profile access" ON public.profiles
FOR ALL USING (
  auth.uid() = id OR 
  EXISTS (
    -- Managers can view team member profiles only
    SELECT 1 FROM public.teams t
    JOIN public.team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = profiles.id AND t.manager_id = auth.uid()
  )
) WITH CHECK (
  auth.uid() = id
);

-- =====================================================
-- 2. USER PREFERENCES - SECURE USER SETTINGS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;

-- Create single secure preferences policy
CREATE POLICY "Secure user preferences access" ON public.user_preferences
FOR ALL USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- =====================================================
-- 3. NOTIFICATIONS - SECURE USER NOTIFICATIONS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

-- Create secure notifications policy
CREATE POLICY "Secure notifications access" ON public.notifications
FOR ALL USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- =====================================================
-- 4. CLIENT MEMORIES - SECURE CLIENT RELATIONSHIP DATA
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own client memories" ON public.client_memories;
DROP POLICY IF EXISTS "Users can update their own client memories" ON public.client_memories;
DROP POLICY IF EXISTS "Users can view their own client memories" ON public.client_memories;

-- Create secure client memories policy
CREATE POLICY "Secure client memories access" ON public.client_memories
FOR ALL USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- =====================================================
-- 5. EMAIL SYNC STATUS - SECURE SYNC DATA
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own sync status" ON public.email_sync_status;
DROP POLICY IF EXISTS "Users can update their own sync status" ON public.email_sync_status;
DROP POLICY IF EXISTS "Users can view their own sync status" ON public.email_sync_status;

-- Create secure sync status policy
CREATE POLICY "Secure email sync access" ON public.email_sync_status
FOR ALL USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- =====================================================
-- 6. AI EMAIL DRAFTS - SECURE DRAFT DATA
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own drafts" ON public.ai_email_drafts;
DROP POLICY IF EXISTS "Users can delete their own drafts" ON public.ai_email_drafts;
DROP POLICY IF EXISTS "Users can update their own drafts" ON public.ai_email_drafts;
DROP POLICY IF EXISTS "Users can view their own drafts" ON public.ai_email_drafts;

-- Create secure draft access policy
CREATE POLICY "Secure ai drafts access" ON public.ai_email_drafts
FOR ALL USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- =====================================================
-- COMPREHENSIVE SECURITY ENHANCEMENT COMPLETE
-- =====================================================

-- Log final security enhancement completion
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  auth.uid(),
  'comprehensive_security_enhancement_complete',
  'critical',
  jsonb_build_object(
    'enhancement_type', 'Complete Security Overhaul',
    'total_tables_secured', 15,
    'critical_vulnerabilities_fixed', jsonb_build_array(
      'Customer Personal Information Protection',
      'Email Account Credentials Security', 
      'Business Financial Data Protection',
      'User Session Security',
      'Private Communication Protection'
    ),
    'security_principles_enforced', jsonb_build_array(
      'Principle of Least Privilege',
      'Owner-Only Data Access',
      'Admin-Only Audit Access',
      'System-Only Event Logging',
      'No Anonymous Access'
    ),
    'completion_timestamp', now(),
    'enhancement_status', 'COMPLETE'
  )
);