import { toastHelpers } from '@/utils/toastHelpers';
import { logger } from '@/utils/logger';

export interface ErrorContext {
  operation?: string;
  component?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorDisplayOptions {
  showToast?: boolean;
  showDetails?: boolean;
  duration?: number;
  silent?: boolean;
}

/**
 * Global error handler that replaces console.error with user-friendly notifications
 * and proper logging for development/production environments
 */
export class GlobalErrorHandler {
  /**
   * Handle and display errors with user-friendly messages
   */
  static handleError(
    error: any, 
    context: ErrorContext = {}, 
    options: ErrorDisplayOptions = {}
  ): void {
    const {
      showToast = true,
      showDetails = false,
      duration,
      silent = false
    } = options;

    // Extract meaningful error message
    const errorMessage = this.extractErrorMessage(error);
    const userMessage = this.getUserFriendlyMessage(errorMessage, context.operation);
    
    // Log for developers (in development) or to monitoring service (in production)
    logger.error(`Error in ${context.component || 'Unknown Component'}`, {
      operation: context.operation,
      error: errorMessage,
      stack: error?.stack,
      metadata: context.metadata
    });

    // Show user-friendly toast notification
    if (showToast && !silent) {
      toastHelpers.error(userMessage, showDetails ? error : undefined, {
        duration: duration || 5000,
        showDetails
      });
    }
  }

  /**
   * Handle authentication errors specifically
   */
  static handleAuthError(error: any, operation: string = 'authentication'): void {
    const userMessage = this.getAuthErrorMessage(error);
    
    logger.error('Authentication error', {
      operation,
      error: this.extractErrorMessage(error)
    });

    toastHelpers.error(userMessage, undefined, {
      duration: 6000
    });
  }

  /**
   * Handle network/API errors
   */
  static handleNetworkError(error: any, operation: string = 'network request'): void {
    const userMessage = this.getNetworkErrorMessage(error);
    
    logger.error('Network error', {
      operation,
      error: this.extractErrorMessage(error)
    });

    toastHelpers.error(userMessage, undefined, {
      duration: 5000
    });
  }

  /**
   * Handle Supabase-specific errors
   */
  static handleSupabaseError(error: any, operation: string = 'database operation'): void {
    const userMessage = this.getSupabaseErrorMessage(error);
    
    logger.error('Supabase error', {
      operation,
      error: this.extractErrorMessage(error),
      code: error?.code,
      details: error?.details
    });

    toastHelpers.error(userMessage, undefined, {
      duration: 5000
    });
  }

  /**
   * Handle parsing/validation errors
   */
  static handleValidationError(error: any, operation: string = 'validation'): void {
    const userMessage = this.getValidationErrorMessage(error);
    
    logger.warn('Validation error', {
      operation,
      error: this.extractErrorMessage(error)
    });

    toastHelpers.warning(userMessage, {
      duration: 4000
    });
  }

  /**
   * Extract meaningful error message from various error formats
   */
  private static extractErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error?.message) return error.error.message;
    if (error?.details) return error.details;
    if (error?.description) return error.description;
    return 'An unexpected error occurred';
  }

  /**
   * Convert technical error messages to user-friendly ones
   */
  private static getUserFriendlyMessage(message: string, operation?: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    // Authentication errors
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('auth')) {
      return 'Authentication required. Please sign in and try again.';
    }
    
    // Permission errors
    if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden')) {
      return 'You don\'t have permission to perform this action.';
    }
    
    // Not found errors
    if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
      return 'The requested resource was not found.';
    }
    
    // Server errors
    if (lowerMessage.includes('server') || lowerMessage.includes('500')) {
      return 'Server error. Please try again in a few moments.';
    }
    
    // Validation errors
    if (lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
      return 'Please check your input and try again.';
    }
    
    // Operation-specific messages
    if (operation) {
      return `Failed to ${operation}. Please try again.`;
    }
    
    return 'Something went wrong. Please try again.';
  }

  /**
   * Get user-friendly authentication error messages
   */
  private static getAuthErrorMessage(error: any): string {
    const message = this.extractErrorMessage(error).toLowerCase();
    
    if (message.includes('invalid_credentials') || message.includes('wrong password')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    if (message.includes('user_not_found')) {
      return 'No account found with this email address.';
    }
    
    if (message.includes('too_many_requests')) {
      return 'Too many login attempts. Please wait a few minutes and try again.';
    }
    
    if (message.includes('email_not_verified')) {
      return 'Please verify your email address before signing in.';
    }
    
    return 'Authentication failed. Please try again.';
  }

  /**
   * Get user-friendly network error messages
   */
  private static getNetworkErrorMessage(error: any): string {
    const message = this.extractErrorMessage(error).toLowerCase();
    
    if (message.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }
    
    if (message.includes('offline') || message.includes('network')) {
      return 'You appear to be offline. Please check your internet connection.';
    }
    
    return 'Network error. Please check your connection and try again.';
  }

  /**
   * Get user-friendly Supabase error messages
   */
  private static getSupabaseErrorMessage(error: any): string {
    const message = this.extractErrorMessage(error).toLowerCase();
    
    if (message.includes('row level security')) {
      return 'Access denied. You don\'t have permission to access this data.';
    }
    
    if (message.includes('unique constraint')) {
      return 'This record already exists. Please use different values.';
    }
    
    if (message.includes('foreign key')) {
      return 'Cannot complete this action due to related data dependencies.';
    }
    
    if (message.includes('connection')) {
      return 'Database connection issue. Please try again in a moment.';
    }
    
    return 'Database error. Please try again.';
  }

  /**
   * Get user-friendly validation error messages
   */
  private static getValidationErrorMessage(error: any): string {
    const message = this.extractErrorMessage(error).toLowerCase();
    
    if (message.includes('required')) {
      return 'Please fill in all required fields.';
    }
    
    if (message.includes('email')) {
      return 'Please enter a valid email address.';
    }
    
    if (message.includes('password')) {
      return 'Password does not meet requirements.';
    }
    
    if (message.includes('format') || message.includes('invalid')) {
      return 'Please check the format of your input.';
    }
    
    return 'Please check your input and try again.';
  }
}

// Convenience functions for common error handling patterns
export const handleError = (error: any, context?: ErrorContext, options?: ErrorDisplayOptions) => 
  GlobalErrorHandler.handleError(error, context, options);

export const handleAuthError = (error: any, operation?: string) => 
  GlobalErrorHandler.handleAuthError(error, operation);

export const handleNetworkError = (error: any, operation?: string) => 
  GlobalErrorHandler.handleNetworkError(error, operation);

export const handleSupabaseError = (error: any, operation?: string) => 
  GlobalErrorHandler.handleSupabaseError(error, operation);

export const handleValidationError = (error: any, operation?: string) => 
  GlobalErrorHandler.handleValidationError(error, operation);