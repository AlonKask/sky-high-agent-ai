import { supabase } from '@/integrations/supabase/client';

interface SecurityHealthMetrics {
  authenticationHealth: boolean;
  databaseHealth: boolean;
  rlsPolicyHealth: boolean;
  encryptionHealth: boolean;
  sessionHealth: boolean;
  overallHealth: 'healthy' | 'warning' | 'critical';
  lastChecked: string;
  issues: string[];
}

export class SecurityHealthMonitor {
  private static instance: SecurityHealthMonitor;

  static getInstance(): SecurityHealthMonitor {
    if (!SecurityHealthMonitor.instance) {
      SecurityHealthMonitor.instance = new SecurityHealthMonitor();
    }
    return SecurityHealthMonitor.instance;
  }

  async performHealthCheck(): Promise<SecurityHealthMetrics> {
    const issues: string[] = [];
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

    console.log('🔍 Starting security health check...');

    // Check authentication system
    const authHealth = await this.checkAuthenticationHealth();
    if (!authHealth.isHealthy) {
      issues.push(...authHealth.issues);
      overallHealth = 'critical';
    }

    // Check database connectivity
    const dbHealth = await this.checkDatabaseHealth();
    if (!dbHealth.isHealthy) {
      issues.push(...dbHealth.issues);
      if (overallHealth !== 'critical') {
        overallHealth = 'warning';
      }
    }

    // Check RLS policies
    const rlsHealth = await this.checkRLSHealth();
    if (!rlsHealth.isHealthy) {
      issues.push(...rlsHealth.issues);
      overallHealth = 'critical';
    }

    // Check encryption systems
    const encryptionHealth = await this.checkEncryptionHealth();
    if (!encryptionHealth.isHealthy) {
      issues.push(...encryptionHealth.issues);
      if (overallHealth !== 'critical') {
        overallHealth = 'warning';
      }
    }

    // Check session management
    const sessionHealth = await this.checkSessionHealth();
    if (!sessionHealth.isHealthy) {
      issues.push(...sessionHealth.issues);
      if (overallHealth !== 'critical') {
        overallHealth = 'warning';
      }
    }

    const healthMetrics: SecurityHealthMetrics = {
      authenticationHealth: authHealth.isHealthy,
      databaseHealth: dbHealth.isHealthy,
      rlsPolicyHealth: rlsHealth.isHealthy,
      encryptionHealth: encryptionHealth.isHealthy,
      sessionHealth: sessionHealth.isHealthy,
      overallHealth,
      lastChecked: new Date().toISOString(),
      issues
    };

    console.log('✅ Security health check completed:', {
      overallHealth,
      issueCount: issues.length
    });

    return healthMetrics;
  }

  private async checkAuthenticationHealth(): Promise<{ isHealthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Test auth session retrieval
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        issues.push(`Authentication error: ${error.message}`);
      }

      // Check if auth is properly configured
      if (!session && !error) {
        // This is fine - just means no user is logged in
      }

      return { isHealthy: issues.length === 0, issues };
    } catch (error) {
      issues.push(`Authentication system failure: ${error}`);
      return { isHealthy: false, issues };
    }
  }

  private async checkDatabaseHealth(): Promise<{ isHealthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Test basic database connectivity
      const { data, error } = await supabase.rpc('health_check');
      
      if (error) {
        issues.push(`Database connectivity error: ${error.message}`);
      } else if (!data || (typeof data === 'object' && 'status' in data && data.status !== 'healthy')) {
        issues.push('Database health check failed');
      }

      return { isHealthy: issues.length === 0, issues };
    } catch (error) {
      issues.push(`Database health check failed: ${error}`);
      return { isHealthy: false, issues };
    }
  }

  private async checkRLSHealth(): Promise<{ isHealthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Test RLS by trying to access a protected table without auth
      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .limit(1);

      // We expect this to fail or return no data due to RLS
      if (!error && data && data.length > 0) {
        issues.push('RLS policies may not be properly enforced on clients table');
      }

      // Test profiles table specifically
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (!profileError && profileData && profileData.length > 0) {
        issues.push('RLS policies may not be properly enforced on profiles table');
      }

      // Test quotes table
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('id')
        .limit(1);

      if (!quoteError && quoteData && quoteData.length > 0) {
        issues.push('RLS policies may not be properly enforced on quotes table');
      }

      return { isHealthy: issues.length === 0, issues };
    } catch (error) {
      issues.push(`RLS health check failed: ${error}`);
      return { isHealthy: false, issues };
    }
  }

  private async checkEncryptionHealth(): Promise<{ isHealthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Test encryption service
      const { data, error } = await supabase.rpc('get_encryption_status');
      
      if (error) {
        issues.push(`Encryption service error: ${error.message}`);
      } else if (!data || (typeof data === 'object' && 'encryption_enabled' in data && !data.encryption_enabled)) {
        issues.push('Encryption service is not enabled');
      }

      return { isHealthy: issues.length === 0, issues };
    } catch (error) {
      issues.push(`Encryption health check failed: ${error}`);
      return { isHealthy: false, issues };
    }
  }

  private async checkSessionHealth(): Promise<{ isHealthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check session validation
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Test session security function
        const { data, error } = await supabase.rpc('validate_session_security');
        
        if (error) {
          issues.push(`Session validation error: ${error.message}`);
        } else if (!data) {
          issues.push('Session security validation failed');
        }
      }

      return { isHealthy: issues.length === 0, issues };
    } catch (error) {
      issues.push(`Session health check failed: ${error}`);
      return { isHealthy: false, issues };
    }
  }

  async getHealthStatus(): Promise<'healthy' | 'warning' | 'critical'> {
    const metrics = await this.performHealthCheck();
    return metrics.overallHealth;
  }

  async getHealthSummary(): Promise<string[]> {
    const metrics = await this.performHealthCheck();
    
    if (metrics.overallHealth === 'healthy') {
      return ['All security systems are operational'];
    }

    return metrics.issues;
  }
}

export const securityHealthMonitor = SecurityHealthMonitor.getInstance();