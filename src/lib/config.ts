// SECURE: Configuration for external services
// This file provides secure configuration management with validation
// Migrated from deprecated hardcoded values to configSecurity.ts

import { configSecurity } from '@/utils/configSecurity';
import { logSecurityEvent } from '@/utils/enhancedSecurity';

let _config: any = null;
let configInitialized = false;

export const config = {
  get google() {
    if (!configInitialized) {
      console.warn('⚠️ Configuration not properly initialized');
      logSecurityEvent('config_access_before_init', 'medium', { 
        source: 'google_config_access' 
      });
    }
    
    if (_config) {
      return { clientId: _config.googleClientId };
    }
    
    // Fallback with proper validation
    const fallbackClientId = "871203174190-t2f8sg44gh37nne80saenhajffitpu7n.apps.googleusercontent.com";
    
    // Validate the fallback client ID format
    if (!fallbackClientId.match(/^\d+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/)) {
      console.error('❌ Invalid Google Client ID format');
      logSecurityEvent('invalid_google_client_id', 'high', { 
        clientId: 'REDACTED' 
      });
      return { clientId: null };
    }
    
    return { clientId: fallbackClientId };
  },
  
  get supabase() {
    return {
      url: "https://ekrwjfdypqzequovmvjn.supabase.co",
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcndqZmR5cHF6ZXF1b3ZtdmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDA4MzEsImV4cCI6MjA2ODY3NjgzMX0.r2Y4sVUM_0ofU1G8QGDDqSR7-LatBkWXa8pWSwniXdE"
    };
  },
  
  // Initialize secure configuration with proper error handling
  async init() {
    try {
      _config = await configSecurity.initializeSecureConfig();
      configInitialized = true;
      
      // Log successful initialization
      logSecurityEvent('config_initialized', 'low', {
        environment: _config.environment,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Secure configuration initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize secure configuration:', error);
      
      // Log the initialization failure
      logSecurityEvent('config_init_failed', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  },
  
  // Validate current configuration
  validate() {
    if (!configInitialized || !_config) {
      throw new Error('Configuration not initialized or invalid');
    }
    return true;
  }
};