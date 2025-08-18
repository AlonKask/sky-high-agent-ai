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
        clientId: "871203174190-t2f8sg44gh37nne80saenhajffitpu7n.apps.googleusercontent.com"
      };
    }
    return { clientId: _config.googleClientId };
  },
  
  get supabase() {
    return {
      url: "https://ekrwjfdypqzequovmvjn.supabase.co",
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcndqZmR5cHF6ZXF1b3ZtdmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDA4MzEsImV4cCI6MjA2ODY3NjgzMX0.r2Y4sVUM_0ofU1G8QGDDqSR7-LatBkWXa8pWSwniXdE"
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