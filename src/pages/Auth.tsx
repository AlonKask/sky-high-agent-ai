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
import { Plane, Mail, Lock, ArrowRight, AlertCircle, Chrome } from "lucide-react";
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

    if (!captchaToken) {
      toast({
        variant: "destructive",
        title: "CAPTCHA Required",
        description: "Please complete the CAPTCHA verification.",
      });
      return;
    }

    setLoading(true);

    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      // Verify CAPTCHA token with backend
      const { data: captchaResult } = await supabase.functions.invoke('verify-captcha', {
        body: { token: captchaToken, action: 'signin' }
      });

      if (!captchaResult?.success) {
        throw new Error('CAPTCHA verification failed');
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
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        await logSecurityEvent({ 
          event_type: 'login_failure', 
          severity: 'medium', 
          details: { method: 'google_oauth', error: error.message }
        });
        throw error;
      }
      
      // OAuth redirect will handle the rest - success logging happens in auth state change
    } catch (error: any) {
      await logSecurityEvent({ 
        event_type: 'login_failure', 
        severity: 'medium', 
        details: { method: 'google_oauth', error: error.message || 'Unknown OAuth error' }
      });
      
      toast({
        title: "Google Sign In Error",
        description: error.message || "An error occurred during Google sign in",
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
            <Chrome className="w-4 h-4 mr-2" />
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
              disabled={loading || !captchaToken}
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