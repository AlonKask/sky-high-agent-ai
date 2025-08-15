import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authSecurity } from "@/utils/authSecurity";
import { configSecurity } from "@/utils/configSecurity";
import { secureLogger } from "@/utils/secureLogger";
import { logSecurityEvent } from "@/utils/security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Plane, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import HCaptchaWrapper from "@/components/HCaptchaWrapper";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const initializeConfig = async () => {
      try {
        const secureConfig = await configSecurity.initializeSecureConfig();
        setConfig(secureConfig);
      } catch (error) {
        secureLogger.error('Failed to load configuration', { error });
      }
    };

    initializeConfig();

    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/", { replace: true });
      }
    };
    checkUser();
  }, [navigate]);

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      // Verify CAPTCHA token with backend only if captcha is available and token exists
      if (config?.hcaptchaSiteKey && captchaToken) {
        const { data: captchaResult } = await supabase.functions.invoke('verify-captcha', {
          body: { token: captchaToken, action: 'signin' }
        });

        if (!captchaResult?.success) {
          throw new Error('CAPTCHA verification failed');
        }
      } else if (config?.hcaptchaSiteKey && !captchaToken) {
        toast({
          variant: "destructive",
          title: "CAPTCHA Required",
          description: "Please complete the CAPTCHA verification.",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      await logSecurityEvent({ 
        event_type: 'login_success', 
        severity: 'low', 
        details: { email: email, method: 'email_password' }
      });

      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
      
      // Force a page refresh to ensure clean state
      window.location.href = '/';

    } catch (error: any) {
      setCaptchaToken(null); // Reset CAPTCHA on error
      
      await logSecurityEvent({ 
        event_type: 'login_failure', 
        severity: 'medium', 
        details: { email: email, error: error.message, method: 'email_password' }
      });
      
      // Provide more specific error messages
      let errorMessage = "Sign in failed";
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = "Please confirm your email address before signing in.";
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = "Too many sign in attempts. Please wait a moment before trying again.";
      } else if (error.message?.includes('CAPTCHA')) {
        errorMessage = "CAPTCHA verification failed. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Sign In Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      await logSecurityEvent({ 
        event_type: 'login_attempt', 
        severity: 'low', 
        details: { method: 'google_oauth', initiated: true }
      });
      
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        await logSecurityEvent({ 
          event_type: 'login_failure', 
          severity: 'medium', 
          details: { method: 'google_oauth', error: error.message }
        });
        
        // Provide more specific error messages for Google OAuth
        let errorMessage = "Google sign in failed";
        if (error.message?.includes('provider is not enabled')) {
          errorMessage = "Google authentication is not enabled. Please contact your administrator.";
        } else if (error.message?.includes('invalid_request')) {
          errorMessage = "Invalid authentication request. Please try again.";
        } else if (error.message?.includes('access_denied')) {
          errorMessage = "Access was denied. Please check your Google account permissions.";
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast({
          title: "Google Sign In Error",
          description: errorMessage,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // OAuth redirect will handle the rest - success logging happens in auth state change
    } catch (error: any) {
      await logSecurityEvent({ 
        event_type: 'login_failure', 
        severity: 'medium', 
        details: { method: 'google_oauth', error: error.message || 'Unknown OAuth error' }
      });
      
      let errorMessage = "Google sign in failed";
      if (error.message?.includes('provider is not enabled')) {
        errorMessage = "Google authentication is not enabled. Please contact your administrator.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Google Sign In Error",
        description: errorMessage,
        variant: "destructive",
      });
      setLoading(false);
    }
  };


  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaError = () => {
    setCaptchaToken(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary to-accent">
            <Plane className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">AviaSales</CardTitle>
          <CardDescription>
            Professional business travel management platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or sign in with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {config?.hcaptchaSiteKey && (
              <HCaptchaWrapper
                siteKey={config.hcaptchaSiteKey}
                onVerify={handleCaptchaVerify}
                onError={handleCaptchaError}
                onExpire={() => setCaptchaToken(null)}
                disabled={loading}
              />
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || (config?.hcaptchaSiteKey && !captchaToken)}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Sign In</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              )}
            </Button>

          </form>

          <div className="text-center text-sm text-muted-foreground">
            Need an account? Contact your administrator for access.
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;