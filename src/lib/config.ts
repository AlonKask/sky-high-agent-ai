// DEPRECATED: Configuration for external services
// This file is kept for backward compatibility only
// Use configSecurity.ts for secure configuration management

import { configSecurity } from '@/utils/configSecurity';

let _config: any = null;

export const config = {
  get google() {
    if (!_config) {
      console.warn('⚠️ Using deprecated config.ts - migrate to configSecurity.ts');
      return {
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "your-google-client-id"
      };
    }
    return { clientId: _config.googleClientId };
  },
  
  get supabase() {
    return {
      url: import.meta.env.VITE_SUPABASE_URL || "https://your-project-ref.supabase.co",
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key"
    };
  },
  
  // Initialize secure configuration
  async init() {
    try {
      _config = await configSecurity.initializeSecureConfig();
    } catch (error) {
      console.error('Failed to initialize secure configuration:', error);
    }
  }
};