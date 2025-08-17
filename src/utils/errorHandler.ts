import { logger } from './logger';
import { trackError } from './monitoring';
import { toast } from "sonner";

export enum ErrorType {
  PARSING_ERROR = 'PARSING_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EMAIL_GENERATION_ERROR = 'EMAIL_GENERATION_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR'
}

export interface AppError extends Error {
  type: ErrorType;
  context?: Record<string, any>;
  userMessage?: string;
}

export interface ErrorContext {
  operation: string;
  component?: string;
  userId?: string;
  additional?: Record<string, any>;
}

export class ErrorHandler {
  static createError(
    type: ErrorType,
    message: string,
    context?: Record<string, any>,
    userMessage?: string
  ): AppError {
    const error = new Error(message) as AppError;
    error.type = type;
    error.context = context;
    error.userMessage = userMessage || this.getDefaultUserMessage(type);
    return error;
  }
  
  static async handleError(error: Error | AppError, operation?: string): Promise<void> {
    const appError = error as AppError;
    const errorInfo = {
      type: appError.type || 'UNKNOWN_ERROR',
      message: error.message,
      operation: operation || 'unknown',
      context: appError.context || {},
      stack: error.stack
    };
    
    logger.error(`Error in ${operation || 'unknown operation'}:`, errorInfo);
    await trackError(error, errorInfo);
  }

  /**
   * Modern error handling with context and user feedback
   */
  static handle(error: any, context: ErrorContext): void {
    const errorMessage = this.extractErrorMessage(error);
    const logEntry = {
      ...context,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      stack: error?.stack
    };

    // Log to console with context
    console.error(`❌ ${context.operation} failed:`, logEntry);

    // Show user-friendly toast
    this.showUserError(errorMessage, context.operation);
  }

  /**
   * Handle Supabase errors specifically
   */
  static handleSupabase(error: any, operation: string): void {
    const context: ErrorContext = {
      operation,
      component: 'supabase'
    };

    if (error?.code) {
      context.additional = {
        code: error.code,
        details: error.details,
        hint: error.hint
      };
    }

    this.handle(error, context);
  }

  /**
   * Handle authentication errors
   */
  static handleAuth(error: any, operation: string): void {
    const context: ErrorContext = {
      operation,
      component: 'auth'
    };

    this.handle(error, context);
  }

  /**
   * Extract readable error message
   */
  private static extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.error?.message) {
      return error.error.message;
    }

    return 'An unexpected error occurred';
  }

  /**
   * Show user-friendly error toast
   */
  private static showUserError(message: string, operation: string): void {
    const userMessage = this.getUserFriendlyMessage(message, operation);
    toast.error(userMessage);
  }

  /**
   * Convert technical errors to user-friendly messages
   */
  private static getUserFriendlyMessage(message: string, operation: string): string {
    // Network errors
    if (message.includes('NetworkError') || message.includes('fetch')) {
      return 'Connection error. Please check your internet and try again.';
    }

    // Permission errors
    if (message.includes('permission denied') || message.includes('unauthorized')) {
      return 'You don\'t have permission to perform this action.';
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    // Authentication errors
    if (message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials.';
    }

    if (message.includes('Email not confirmed')) {
      return 'Please check your email and confirm your account.';
    }

    // Data validation errors
    if (message.includes('violates')) {
      return 'Invalid data provided. Please check your input.';
    }

    // Generic fallback with operation context
    return `Failed to ${operation.toLowerCase()}. Please try again.`;
  }
  
  static getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.PARSING_ERROR:
        return 'Unable to process the flight information. Please check the format and try again.';
      case ErrorType.DATABASE_ERROR:
        return 'Database connection issue. Please try again in a moment.';
      case ErrorType.NETWORK_ERROR:
        return 'Network connection problem. Please check your internet connection.';
      case ErrorType.VALIDATION_ERROR:
        return 'Invalid data provided. Please review your input and try again.';
      case ErrorType.EMAIL_GENERATION_ERROR:
        return 'Unable to generate email. Please try again or contact support.';
      case ErrorType.AUTH_ERROR:
        return 'Authentication error. Please sign in again.';
      case ErrorType.PERMISSION_ERROR:
        return 'You don\'t have permission to perform this action.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
  
  static isRecoverableError(error: AppError): boolean {
    return [
      ErrorType.NETWORK_ERROR,
      ErrorType.DATABASE_ERROR
    ].includes(error.type);
  }
  
  static getUserMessage(error: Error | AppError): string {
    const appError = error as AppError;
    return appError.userMessage || this.getDefaultUserMessage(appError.type || ErrorType.PARSING_ERROR);
  }

  /**
   * Async operation wrapper with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error, context);
      return null;
    }
  }
}

/**
 * Utility functions for quick error handling
 */
export const handleError = (error: any, operation: string, component?: string) => {
  ErrorHandler.handle(error, { operation, component });
};

export const handleSupabaseError = (error: any, operation: string) => {
  ErrorHandler.handleSupabase(error, operation);
};

export const handleAuthError = (error: any, operation: string) => {
  ErrorHandler.handleAuth(error, operation);
};