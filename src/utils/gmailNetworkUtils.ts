// PHASE 1: Network resilience utilities for Gmail integration
import { supabase } from '@/integrations/supabase/client';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  timeout?: number;
}

export class NetworkError extends Error {
  constructor(message: string, public isRetryable: boolean = false) {
    super(message);
    this.name = 'NetworkError';
  }
}

// PHASE 1: Exponential backoff retry with timeout for network calls
export const retryWithExponentialBackoff = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    timeout = 30000
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🌐 Network operation attempt ${attempt}/${maxAttempts}`);
      
      // Add timeout wrapper
      const timeoutPromise = new Promise<T>((_, reject) => {
        setTimeout(() => reject(new NetworkError('Operation timeout', true)), timeout);
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      console.log(`✅ Network operation succeeded on attempt ${attempt}`);
      return result;
      
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Network operation failed on attempt ${attempt}:`, error);

      // Check if error is retryable
      const isRetryableError = 
        error.name === 'NetworkError' ||
        error.name === 'AbortError' ||
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('Failed to send a request') ||
        error.message?.includes('Connection refused') ||
        (error.status >= 500 && error.status < 600); // Server errors

      if (!isRetryableError || attempt === maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
      console.log(`⏱️ Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// PHASE 1: Enhanced Supabase function invoke with network resilience
export const invokeSupabaseFunction = async (
  functionName: string,
  options: any = {},
  retryOptions?: RetryOptions
) => {
  return retryWithExponentialBackoff(async () => {
    console.log(`🌐 Invoking edge function: ${functionName}`);
    
    // Pre-flight network test
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      throw new NetworkError('Network connectivity test failed - no internet connection', true);
    }
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new NetworkError('Edge function timeout', true)), retryOptions?.timeout || 30000);
    });

    const invokePromise = supabase.functions.invoke(functionName, options);

    const result: any = await Promise.race([invokePromise, timeoutPromise]);

    // Enhanced error checking
    if (result && result.error) {
      const errorMsg = result.error.message || 'Unknown edge function error';
      
      const isRetryableError = 
        errorMsg.includes('temporarily unavailable') ||
        errorMsg.includes('service unavailable') ||
        errorMsg.includes('rate limit') ||
        errorMsg.includes('timeout') ||
        errorMsg.includes('network') ||
        (result.error.status >= 500 && result.error.status < 600);

      throw new NetworkError(errorMsg, isRetryableError);
    }

    console.log(`✅ Edge function ${functionName} succeeded`);
    return result;
  }, retryOptions);
};

// PHASE 1: Network connectivity check
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    // Simple connectivity test using Supabase health check
    const { error } = await supabase.rpc('health_check');
    return !error;
  } catch (error) {
    console.error('❌ Network connectivity check failed:', error);
    return false;
  }
};

// PHASE 4: Enhanced error categorization for user-friendly messages
export const categorizeNetworkError = (error: any): {
  category: string;
  isRetryable: boolean;
  userMessage: string;
  suggestedAction: string;
} => {
  const message = error?.message || error?.toString() || 'Unknown error';

  if (message.includes('timeout') || message.includes('AbortError')) {
    return {
      category: 'timeout',
      isRetryable: true,
      userMessage: 'Connection timeout - the server is taking too long to respond',
      suggestedAction: 'Please check your internet connection and try again'
    };
  }

  if (message.includes('network') || message.includes('fetch')) {
    return {
      category: 'network',
      isRetryable: true,
      userMessage: 'Network connection issue detected',
      suggestedAction: 'Please check your internet connection and try again'
    };
  }

  if (message.includes('service unavailable') || message.includes('temporarily unavailable')) {
    return {
      category: 'service_unavailable',
      isRetryable: true,
      userMessage: 'Service is temporarily unavailable',
      suggestedAction: 'Please try again in a few minutes'
    };
  }

  if (message.includes('popup') || message.includes('blocked')) {
    return {
      category: 'popup_blocked',
      isRetryable: true,
      userMessage: 'Popup window was blocked by your browser',
      suggestedAction: 'Please allow popups for this site and try again'
    };
  }

  if (message.includes('not configured') || message.includes('administrator')) {
    return {
      category: 'configuration',
      isRetryable: false,
      userMessage: 'Gmail integration needs to be configured',
      suggestedAction: 'Please contact your system administrator'
    };
  }

  if (message.includes('session') || message.includes('authentication') || message.includes('expired')) {
    return {
      category: 'authentication',
      isRetryable: false,
      userMessage: 'Authentication session has expired',
      suggestedAction: 'Please refresh the page and sign in again'
    };
  }

  // Generic error
  return {
    category: 'generic',
    isRetryable: true,
    userMessage: 'An unexpected error occurred',
    suggestedAction: 'Please try again or contact support if the issue persists'
  };
};