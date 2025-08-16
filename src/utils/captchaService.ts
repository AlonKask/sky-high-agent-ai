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
    try {
      console.log('🔍 Verifying CAPTCHA token:', { action, hasToken: !!token });

      if (!token) {
        return {
          success: false,
          error: 'CAPTCHA token is required'
        };
      }

      // Call Supabase edge function for verification
      const { data, error } = await supabase.functions.invoke('verify-captcha', {
        body: {
          token,
          action
        }
      });

      if (error) {
        console.error('❌ CAPTCHA verification error:', error);
        this.recordFailedAttempt(action);
        
        return {
          success: false,
          error: `CAPTCHA verification failed: ${error.message}`
        };
      }

      if (data?.success) {
        console.log('✅ CAPTCHA verification successful:', {
          action,
          timestamp: data.timestamp,
          hostname: data.hostname
        });

        this.clearFailedAttempts(action);
        
        return {
          success: true,
          timestamp: data.timestamp,
          hostname: data.hostname
        };
      } else {
        console.error('❌ CAPTCHA verification failed:', data);
        this.recordFailedAttempt(action);
        
        return {
          success: false,
          error: data?.error || 'CAPTCHA verification failed'
        };
      }
    } catch (error: any) {
      console.error('❌ CAPTCHA verification exception:', error);
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
    try {
      if (!this.config) {
        await this.initialize();
      }

      return {
        healthy: true,
        details: {
          configured: !!this.config,
          siteKeyPresent: !!this.config?.siteKey,
          enabled: this.config?.enabled,
          environment: this.config?.environment
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

export const captchaService = CaptchaService.getInstance();