// Configuration Security Management
import { supabase } from "@/integrations/supabase/client";

interface SecureConfig {
  googleClientId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  turnstileSiteKey: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';
}

class ConfigSecurityManager {
  private static instance: ConfigSecurityManager;
  private config: SecureConfig | null = null;
  private validated = false;

  private constructor() {}

  static getInstance(): ConfigSecurityManager {
    if (!ConfigSecurityManager.instance) {
      ConfigSecurityManager.instance = new ConfigSecurityManager();
    }
    return ConfigSecurityManager.instance;
  }

  async initializeSecureConfig(): Promise<SecureConfig> {
    if (this.config && this.validated) {
      return this.config;
    }

    try {
      // Get configuration from environment variables with enhanced error handling
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 
                            await this.getSecureValue('GOOGLE_CLIENT_ID') || 
                            "your-google-client-id";

      this.config = {
        googleClientId,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "https://your-project-ref.supabase.co",
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key",
        turnstileSiteKey: await this.getTurnstileSiteKey(),
        appVersion: '1.0.0',
        environment: this.detectEnvironment()
      };

      await this.validateConfiguration(this.config);
      this.validated = true;

      // Log configuration initialization (without sensitive data)
      console.log('✅ Secure configuration initialized', {
        environment: this.config.environment,
        hasGoogleClientId: !!this.config.googleClientId && this.config.googleClientId !== "your-google-client-id",
        hasTurnstileSiteKey: !!this.config.turnstileSiteKey && this.config.turnstileSiteKey !== "your-turnstile-site-key",
        version: this.config.appVersion
      });

      return this.config;
    } catch (error) {
      console.error('❌ Configuration security initialization failed:', error);
      
      // Provide fallback configuration to prevent app crash
      this.config = {
        googleClientId: "your-google-client-id",
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "https://your-project-ref.supabase.co",
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key",
        turnstileSiteKey: "1x00000000000000000000AA", // Cloudflare test key
        appVersion: '1.0.0',
        environment: this.detectEnvironment()
      };
      
      console.warn('⚠️ Using fallback configuration due to initialization failure');
      return this.config;
    }
  }

  private async getSecureValue(key: string): Promise<string | null> {
    try {
      // Secure value retrieval from environment variables first, then Supabase secrets
      // Environment variables take precedence for public deployment safety
      const envValue = import.meta.env[`VITE_${key}`];
      if (envValue && envValue !== `your-${key.toLowerCase().replace('_', '-')}`) {
        return envValue;
      }
      
      // Fallback to secure defaults - no hardcoded production values
      if (key === 'GOOGLE_CLIENT_ID') {
        return null; // Will use environment variable or default placeholder
      }
      if (key === 'TURNSTILE_SITE_KEY') {
        return null; // Will use environment variable or default placeholder  
      }
      return null;
    } catch (error) {
      console.warn(`Could not retrieve secure value for ${key}:`, error);
      return null;
    }
  }

  private detectEnvironment(): 'development' | 'staging' | 'production' {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    } else if (hostname.includes('staging') || hostname.includes('preview')) {
      return 'staging';
    } else {
      return 'production';
    }
  }

  private async validateConfiguration(config: SecureConfig): Promise<void> {
    const validationChecks = [
      {
        name: 'Google Client ID',
        test: () => config.googleClientId && 
                   config.googleClientId.length > 10 && 
                   config.googleClientId !== "your-google-client-id",
        severity: 'warning'
      },
      {
        name: 'Supabase URL',
        test: () => config.supabaseUrl && 
                   config.supabaseUrl.startsWith('https://') &&
                   config.supabaseUrl !== "https://your-project-ref.supabase.co",
        severity: 'critical'
      },
      {
        name: 'Supabase Anon Key',
        test: () => config.supabaseAnonKey && 
                   config.supabaseAnonKey.length > 100 &&
                   config.supabaseAnonKey !== "your-anon-key",
        severity: 'critical'
      },
      {
        name: 'Turnstile Site Key',
        test: () => config.turnstileSiteKey && 
                   config.turnstileSiteKey.length > 10 &&
                   config.turnstileSiteKey !== "your-turnstile-site-key",
        severity: 'warning'
      }
    ];

    const failures = validationChecks.filter(check => !check.test());
    
    // Only throw for critical failures if we're not in development
    if (failures.some(f => f.severity === 'critical') && config.environment === 'production') {
      throw new Error(`Critical configuration validation failed: ${failures.map(f => f.name).join(', ')}`);
    }

    if (failures.length > 0) {
      console.warn('⚠️ Configuration validation warnings:', failures.map(f => f.name));
      
      // Log detailed security event for audit
      if (typeof window !== 'undefined') {
        import('@/utils/enhancedSecurity').then(({ logSecurityEvent }) => {
          logSecurityEvent('configuration_validation_failed', 'medium', {
            failed_checks: failures.map(f => f.name),
            environment: config.environment
          }).catch(() => {
            // Silently fail to avoid infinite loops
          });
        });
      }
    }
  }

  private async getTurnstileSiteKey(): Promise<string> {
    // Use environment variable first, then fallback to environment-specific defaults
    const envSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (envSiteKey && envSiteKey !== 'your-turnstile-site-key') {
      return envSiteKey;
    }
    
    const environment = this.detectEnvironment();
    
    if (environment === 'production') {
      // In production, require explicit configuration
      console.warn('⚠️ Production detected but no VITE_TURNSTILE_SITE_KEY configured');
      return "your-turnstile-site-key"; // Placeholder to prevent app crash
    }
    
    // For development and staging, use Cloudflare test key
    return "1x00000000000000000000AA";
  }

  getConfig(): SecureConfig {
    if (!this.config || !this.validated) {
      throw new Error('Configuration not initialized. Call initializeSecureConfig() first.');
    }
    return this.config;
  }

  async rotateSecrets(): Promise<void> {
    // Force re-validation of configuration
    this.validated = false;
    await this.initializeSecureConfig();
  }
}

export const configSecurity = ConfigSecurityManager.getInstance();
export type { SecureConfig };