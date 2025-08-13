-- Security hardening migration: restrict role modifications and prevent token storage in user_preferences

-- 1) Tighten user_roles RLS: only admins can INSERT/UPDATE roles
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can insert user roles'
  ) THEN
    DROP POLICY "Admins can insert user roles" ON public.user_roles;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can update user roles'
  ) THEN
    DROP POLICY "Admins can update user roles" ON public.user_roles;
  END IF;
END $$;

-- Recreate with stricter conditions (admin only)
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Ensure other view policies remain intact
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2) Prevent storing OAuth tokens in user_preferences
-- Create a SECURITY DEFINER trigger function to nullify gmail_access_token and gmail_refresh_token
CREATE OR REPLACE FUNCTION public.enforce_no_tokens_in_user_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If any token fields are being set, null them and log a security event
  IF NEW.gmail_access_token IS NOT NULL OR NEW.gmail_refresh_token IS NOT NULL THEN
    -- Best-effort logging; ignore failures to avoid blocking
    PERFORM public.log_security_event(
      'token_storage_blocked',
      'high',
      jsonb_build_object(
        'table', 'user_preferences',
        'fields_blocked', ARRAY[
          CASE WHEN NEW.gmail_access_token IS NOT NULL THEN 'gmail_access_token' ELSE NULL END,
          CASE WHEN NEW.gmail_refresh_token IS NOT NULL THEN 'gmail_refresh_token' ELSE NULL END
        ]
      )
    );

    NEW.gmail_access_token := NULL;
    NEW.gmail_refresh_token := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger (idempotent)
DROP TRIGGER IF EXISTS trg_enforce_no_tokens_in_user_preferences ON public.user_preferences;
CREATE TRIGGER trg_enforce_no_tokens_in_user_preferences
BEFORE INSERT OR UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.enforce_no_tokens_in_user_preferences();
