import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const DebugInfo = () => {
  const { user, session, loading } = useAuth();
  const location = useLocation();
  const [connectionStatus, setConnectionStatus] = useState<string>("checking");

  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (error) {
          console.error('🔍 Supabase connection error:', error);
          setConnectionStatus(`error: ${error.message}`);
        } else {
          console.log('🔍 Supabase connection successful');
          setConnectionStatus("connected");
        }
      } catch (err) {
        console.error('🔍 Supabase connection failed:', err);
        setConnectionStatus(`failed: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    };

    testConnection();
  }, []);

  console.log('🔍 Debug Info - Current state:', {
    user: user?.id,
    session: !!session,
    loading,
    path: location.pathname,
    connectionStatus,
    href: window.location.href,
    origin: window.location.origin,
    userAgent: navigator.userAgent
  });

  // Only show debug info in development or if there's an issue
  if (process.env.NODE_ENV === 'production' && user) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-card border rounded-lg p-4 max-w-sm text-xs space-y-2 z-50">
      <h3 className="font-bold text-primary">Debug Info</h3>
      <div>Path: {location.pathname}</div>
      <div>User: {user?.id || 'none'}</div>
      <div>Session: {session ? 'yes' : 'no'}</div>
      <div>Loading: {loading ? 'yes' : 'no'}</div>
      <div>Supabase: {connectionStatus}</div>
      <div>URL: {window.location.href}</div>
      <div className="text-xs text-muted-foreground">
        Check console for detailed logs
      </div>
    </div>
  );
};