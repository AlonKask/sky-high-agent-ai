import { logger } from './logger';
import { trackError } from './monitoring';

export enum ErrorType {
  PARSING_ERROR = 'PARSING_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EMAIL_GENERATION_ERROR = 'EMAIL_GENERATION_ERROR'
}

export interface AppError extends Error {
  type: ErrorType;
  context?: Record<string, any>;
  userMessage?: string;
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
}