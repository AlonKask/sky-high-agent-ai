// Production configuration and feature flags
export const PRODUCTION_CONFIG = {
  // Feature flags
  features: {
    enableAnalytics: true,
    enableErrorTracking: true,
    enablePerformanceMonitoring: true,
    enableSecurityMonitoring: true,
    enableDataEncryption: true,
    enableAuditLogging: true,
  },
  
  // Security settings
  security: {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    enableCSP: true,
    enableHSTS: true,
    enforceHTTPS: true,
  },
  
  // Performance settings
  performance: {
    enableServiceWorker: true,
    enableCodeSplitting: true,
    enableLazyLoading: true,
    enableCaching: true,
    cacheStrategy: 'stale-while-revalidate' as const,
  },
  
  // Monitoring settings
  monitoring: {
    errorReportingThreshold: 'high' as const,
    performanceThreshold: 3000, // ms
    memoryUsageThreshold: 100 * 1024 * 1024, // 100MB
    enableRealUserMonitoring: true,
  },
  
  // Rate limiting
  rateLimiting: {
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
    },
  },
  
  // Data retention policies
  dataRetention: {
    logs: 90, // days
    analytics: 365, // days
    auditTrail: 2555, // 7 years in days
    tempFiles: 7, // days
  },
  
  // Backup settings
  backup: {
    frequency: 'daily' as const,
    retention: 30, // days
    enableEncryption: true,
    enableCompression: true,
  },
};

// Environment-specific overrides
export const getConfig = () => {
  if (typeof window === 'undefined') return PRODUCTION_CONFIG;
  
  const isDevelopment = window.location.hostname === 'localhost';
  const isStaging = window.location.hostname.includes('staging');
  
  if (isDevelopment) {
    return {
      ...PRODUCTION_CONFIG,
      security: {
        ...PRODUCTION_CONFIG.security,
        sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours for development
        enforceHTTPS: false,
      },
      monitoring: {
        ...PRODUCTION_CONFIG.monitoring,
        enableRealUserMonitoring: false,
      },
    };
  }
  
  if (isStaging) {
    return {
      ...PRODUCTION_CONFIG,
      features: {
        ...PRODUCTION_CONFIG.features,
        enableAnalytics: false, // Disable analytics in staging
      },
    };
  }
  
  return PRODUCTION_CONFIG;
};