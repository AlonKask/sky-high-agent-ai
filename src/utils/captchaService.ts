/**
 * Professional CAPTCHA Service
 * Handles CAPTCHA verification with comprehensive error handling and monitoring
 */

import { supabase } from "@/integrations/supabase/client";
import { configSecurity } from "./configSecurity";

interface CaptchaVerificationResult {
  success: boolean;
  error?: string;
  timestamp?: string;
  hostname?: string;
}

interface CaptchaConfig {
  siteKey: string;
  enabled: boolean;
  environment: string;
  retryLimit: number;
}

export class CaptchaService {
  private static instance: CaptchaService;
  private config: CaptchaConfig | null = null;
  private verificationAttempts = new Map<string, number>();

  private constructor() {}

  static getInstance(): CaptchaService {
    if (!CaptchaService.instance) {
      CaptchaService.instance = new CaptchaService();
    }
    return CaptchaService.instance;
  }

  async initialize(): Promise<CaptchaConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const secureConfig = await configSecurity.initializeSecureConfig();
      
      this.config = {
        siteKey: secureConfig.turnstileSiteKey,
        enabled: secureConfig.environment === 'production' || secureConfig.environment === 'staging',
        environment: secureConfig.environment,
        retryLimit: 3
      };

      console.log('✅ CAPTCHA Service initialized:', {
        enabled: this.config.enabled,
        environment: this.config.environment,
        hasSiteKey: !!this.config.siteKey
      });

      return this.config;
    } catch (error) {
      console.error('❌ CAPTCHA Service initialization failed:', error);
      throw error;
    }
  }

  async verifyCaptcha(token: string, action: string = 'login'): Promise<CaptchaVerificationResult> {
    const verificationId = Math.random().toString(36).substring(2, 8);
    
    try {
      console.log(`🔍 [${verificationId}] Starting CAPTCHA verification:`, { 
        action, 
        hasToken: !!token,
        tokenLength: token?.length || 0,
        environment: this.config?.environment,
        captchaEnabled: this.config?.enabled
      });

      if (!token) {
        console.warn(`⚠️ [${verificationId}] CAPTCHA token missing`);
        return {
          success: false,
          error: 'CAPTCHA token is required'
        };
      }

      // Development bypass option
      if (this.config?.environment === 'development' && token === 'DEV_BYPASS') {
        console.log(`🚀 [${verificationId}] Development bypass used`);
        return {
          success: true,
          timestamp: new Date().toISOString(),
          hostname: 'localhost'
        };
      }

      console.log(`📡 [${verificationId}] Calling verify-captcha Edge Function`);

      // Call Supabase edge function for verification with enhanced error handling
      const { data, error } = await supabase.functions.invoke('verify-captcha', {
        body: {
          token,
          action
        }
      });

      console.log(`📨 [${verificationId}] Edge Function response:`, {
        hasData: !!data,
        hasError: !!error,
        errorMessage: error?.message,
        dataKeys: data ? Object.keys(data) : []
      });

      if (error) {
        console.error(`❌ [${verificationId}] CAPTCHA verification error:`, {
          message: error.message,
          details: error.details,
          context: error.context
        });
        
        this.recordFailedAttempt(action);
        
        // Enhanced error message for "Failed to send request" errors
        if (error.message?.includes('Failed to send a request')) {
          return {
            success: false,
            error: 'CAPTCHA service temporarily unavailable. Please try again.'
          };
        }
        
        return {
          success: false,
          error: `CAPTCHA verification failed: ${error.message}`
        };
      }

      if (data?.success) {
        console.log(`✅ [${verificationId}] CAPTCHA verification successful:`, {
          action,
          timestamp: data.timestamp,
          hostname: data.hostname,
          requestId: data.requestId
        });

        this.clearFailedAttempts(action);
        
        return {
          success: true,
          timestamp: data.timestamp,
          hostname: data.hostname
        };
      } else {
        console.error(`❌ [${verificationId}] CAPTCHA verification failed:`, {
          error: data?.error,
          codes: data?.codes,
          requestId: data?.requestId,
          timestamp: data?.timestamp
        });
        
        this.recordFailedAttempt(action);
        
        return {
          success: false,
          error: data?.error || 'CAPTCHA verification failed'
        };
      }
    } catch (error: any) {
      console.error(`💥 [${verificationId}] CAPTCHA verification exception:`, {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      
      this.recordFailedAttempt(action);
      
      return {
        success: false,
        error: error.message || 'CAPTCHA verification service error'
      };
    }
  }

  isCaptchaRequired(action: string = 'login'): boolean {
    if (!this.config) {
      return true; // Fail secure - require CAPTCHA if not initialized
    }

    // Always require in production
    if (this.config.environment === 'production') {
      return true;
    }

    // Require after failed attempts
    const attempts = this.verificationAttempts.get(action) || 0;
    return attempts >= 2;
  }

  private recordFailedAttempt(action: string): void {
    const current = this.verificationAttempts.get(action) || 0;
    this.verificationAttempts.set(action, current + 1);
    
    console.warn(`⚠️ CAPTCHA failed attempt #${current + 1} for action: ${action}`);
  }

  private clearFailedAttempts(action: string): void {
    this.verificationAttempts.delete(action);
  }

  getFailedAttempts(action: string = 'login'): number {
    return this.verificationAttempts.get(action) || 0;
  }

  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    const healthCheckId = Math.random().toString(36).substring(2, 6);
    
    try {
      console.log(`🏥 [${healthCheckId}] Starting CAPTCHA health check`);
      
      if (!this.config) {
        console.log(`🏥 [${healthCheckId}] Initializing config for health check`);
        await this.initialize();
      }

      // Test Edge Function availability
      let edgeFunctionHealthy = false;
      let edgeFunctionError = null;
      
      try {
        console.log(`🏥 [${healthCheckId}] Testing Edge Function connectivity`);
        
        // Use a test token to verify Edge Function is responsive
        const testResult = await supabase.functions.invoke('verify-captcha', {
          body: {
            token: 'health-check-test-token',
            action: 'health-check'
          }
        });
        
        // We expect this to fail verification but succeed in calling the function
        edgeFunctionHealthy = !testResult.error || testResult.data !== undefined;
        
        console.log(`🏥 [${healthCheckId}] Edge Function test result:`, {
          healthy: edgeFunctionHealthy,
          hasData: !!testResult.data,
          hasError: !!testResult.error
        });
        
      } catch (error: any) {
        edgeFunctionError = error.message;
        console.error(`🏥 [${healthCheckId}] Edge Function test failed:`, error.message);
      }

      const healthDetails = {
        configured: !!this.config,
        siteKeyPresent: !!this.config?.siteKey,
        enabled: this.config?.enabled,
        environment: this.config?.environment,
        edgeFunctionHealthy,
        edgeFunctionError,
        failedAttempts: this.verificationAttempts.size,
        timestamp: new Date().toISOString()
      };

      const isHealthy = !!this.config && !!this.config.siteKey && edgeFunctionHealthy;

      console.log(`🏥 [${healthCheckId}] Health check complete:`, {
        healthy: isHealthy,
        ...healthDetails
      });

      return {
        healthy: isHealthy,
        details: healthDetails
      };
    } catch (error) {
      console.error(`🏥 [${healthCheckId}] Health check failed:`, error);
      
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const health = await this.healthCheck();
      
      if (health.healthy) {
        return {
          success: true,
          message: 'CAPTCHA service is operational',
          details: health.details
        };
      } else {
        return {
          success: false,
          message: 'CAPTCHA service has issues',
          details: health.details
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `CAPTCHA service test failed: ${error.message}`
      };
    }
  }
}

export const captchaService = CaptchaService.getInstance();