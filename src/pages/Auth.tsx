import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Plane, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TurnstileWrapper } from "@/components/TurnstileWrapper";
import { signInWithEmailPassword, signInWithGoogle } from "@/utils/authHelpers";
import { configSecurity } from "@/utils/configSecurity";
import { toastHelpers } from '@/utils/toastHelpers';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
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
        console.error('Failed to load configuration', { error });
      }
    };

    initializeConfig();

    // Redirect if already logged in
    if (user) {
      const returnUrl = location.state?.returnUrl || '/';
      navigate(returnUrl, { replace: true });
    }
  }, [navigate, location.state, user]);

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toastHelpers.error("Please fill in all fields");
      return;
    }

    // Validate CAPTCHA token if required
    if (config?.turnstileSiteKey && !captchaToken) {
      toastHelpers.error("CAPTCHA Required", "Please complete the CAPTCHA verification before signing in.");
      return;
    }

    setLoading(true);

    try {
      const { user } = await signInWithEmailPassword(email, password, captchaToken);
      
      if (user) {
        toastHelpers.success("Welcome back!", { description: "You have been signed in successfully." });
        
        // Redirect to the intended page or dashboard
        const returnUrl = location.state?.returnUrl || '/';
        window.location.href = returnUrl;
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      toastHelpers.error("Sign In Error", error.message);
      setCaptchaToken(null); // Reset CAPTCHA on error
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      const data = await signInWithGoogle();
      // OAuth redirect will handle the rest
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      toastHelpers.error("Google Sign In Error", error.message);
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

            {config?.turnstileSiteKey && (
              <TurnstileWrapper
                siteKey={config.turnstileSiteKey}
                onVerify={handleCaptchaVerify}
                onError={handleCaptchaError}
                onExpire={() => setCaptchaToken(null)}
                disabled={loading}
              />
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || (config?.turnstileSiteKey && !captchaToken)}
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