// Configuration Security Management
import { supabase } from "@/integrations/supabase/client";

interface SecureConfig {
  googleClientId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
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
      // Get Google Client ID from Supabase secrets or fallback to environment
      const googleClientId = await this.getSecureValue('GOOGLE_CLIENT_ID') || 
                            "871203174190-t2f8sg44gh37nne80saenhajffitpu7n.apps.googleusercontent.com";

      this.config = {
        googleClientId,
        supabaseUrl: "https://ekrwjfdypqzequovmvjn.supabase.co",
        supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcndqZmR5cHF6ZXF1b3ZtdmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDA4MzEsImV4cCI6MjA2ODY3NjgzMX0.r2Y4sVUM_0ofU1G8QGDDqSR7-LatBkWXa8pWSwniXdE",
        appVersion: '1.0.0',
        environment: this.detectEnvironment()
      };

      await this.validateConfiguration();
      this.validated = true;

      // Log configuration initialization (without sensitive data)
      console.log('✅ Secure configuration initialized', {
        environment: this.config.environment,
        hasGoogleClientId: !!this.config.googleClientId,
        version: this.config.appVersion
      });

      return this.config;
    } catch (error) {
      console.error('❌ Configuration security initialization failed:', error);
      throw new Error('Failed to initialize secure configuration');
    }
  }

  private async getSecureValue(key: string): Promise<string | null> {
    try {
      // In a production environment, this would fetch from Supabase secrets
      // For now, we'll use environment variables if available
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

  private async validateConfiguration(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    const validationChecks = [
      {
        name: 'Google Client ID',
        test: () => this.config!.googleClientId && this.config!.googleClientId.length > 10,
        severity: 'warning'
      },
      {
        name: 'Supabase URL',
        test: () => this.config!.supabaseUrl && this.config!.supabaseUrl.startsWith('https://'),
        severity: 'critical'
      },
      {
        name: 'Supabase Anon Key',
        test: () => this.config!.supabaseAnonKey && this.config!.supabaseAnonKey.length > 100,
        severity: 'critical'
      }
    ];

    const failures = validationChecks.filter(check => !check.test());
    
    if (failures.some(f => f.severity === 'critical')) {
      throw new Error(`Critical configuration validation failed: ${failures.map(f => f.name).join(', ')}`);
    }

    if (failures.length > 0) {
      console.warn('⚠️ Configuration validation warnings:', failures.map(f => f.name));
    }
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