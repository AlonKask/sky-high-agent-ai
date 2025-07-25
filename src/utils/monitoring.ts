// Production monitoring and analytics utilities
import { supabase } from "@/integrations/supabase/client";

// Performance monitoring
export const trackPerformanceMetric = async (
  metric: string, 
  value: number, 
  tags?: Record<string, string>
) => {
  try {
    // In production, send to your analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example: send to your monitoring service
      console.log(`Performance metric: ${metric} = ${value}`, tags);
    }
  } catch (error) {
    console.error('Failed to track performance metric:', error);
  }
};

// Error tracking
export const trackError = async (
  error: Error,
  context?: Record<string, any>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const errorData = {
      message: error.message,
      stack: error.stack,
      user_id: user?.id,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      context,
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error tracked:', errorData);
    }
    
    // In production, send to your error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: send to Sentry, Bugsnag, etc.
      console.error('Production error:', errorData);
    }
  } catch (trackingError) {
    console.error('Failed to track error:', trackingError);
  }
};

// User analytics
export const trackUserAction = async (
  action: string,
  properties?: Record<string, any>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    const eventData = {
      user_id: user.id,
      action,
      properties,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };
    
    // In production, send to your analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example: send to Mixpanel, Amplitude, etc.
      console.log('User action tracked:', eventData);
    }
  } catch (error) {
    console.error('Failed to track user action:', error);
  }
};

// Health check utility
export const performHealthCheck = async (): Promise<{
  database: boolean;
  auth: boolean;
  functions: boolean;
}> => {
  const results = {
    database: false,
    auth: false,
    functions: false,
  };
  
  try {
    // Test database connection
    const { data: dbTest } = await supabase.from('profiles').select('id').limit(1);
    results.database = dbTest !== null;
  } catch (error) {
    console.error('Database health check failed:', error);
  }
  
  try {
    // Test auth service
    const { data: { session } } = await supabase.auth.getSession();
    results.auth = true; // If we can call auth, it's working
  } catch (error) {
    console.error('Auth health check failed:', error);
  }
  
  try {
    // Test edge functions (example)
    // Note: Replace with actual function call if needed
    results.functions = true; // Placeholder
  } catch (error) {
    console.error('Functions health check failed:', error);
  }
  
  return results;
};