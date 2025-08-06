import { ErrorHandler, ErrorType } from './errorHandler';
import { logger } from './logger';

export class ValidationUtils {
  static validateSabreInput(input: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!input || typeof input !== 'string') {
      errors.push('Input must be a non-empty string');
      return { isValid: false, errors };
    }
    
    const trimmed = input.trim();
    if (trimmed.length < 10) {
      errors.push('Input appears too short to be valid Sabre data');
    }
    
    // Check for basic Sabre patterns
    // Allow optional spacing between segment number, airline code, and flight number
    // to handle VI format lines like "1 BA  952" in addition to "1BA952"
    const hasFlightPattern = /\d+\s*[A-Z]{2}\s*\d+/.test(trimmed);
    const hasTimePattern = /\d+[AP]/.test(trimmed);
    const hasAirportPattern = /[A-Z]{3}/.test(trimmed);
    
    if (!hasFlightPattern) {
      errors.push('No valid flight pattern found (e.g., "1 AA 123")');
    }
    
    if (!hasTimePattern) {
      errors.push('No valid time pattern found (e.g., "930A", "530P")');
    }
    
    if (!hasAirportPattern) {
      errors.push('No valid airport codes found (3-letter codes)');
    }
    
    // Check for common invalid patterns
    if (trimmed.includes('ERROR') || trimmed.includes('INVALID')) {
      errors.push('Input contains error indicators');
    }
    
    const isValid = errors.length === 0;
    
    if (!isValid) {
      logger.warn('Sabre input validation failed:', { input: trimmed.substring(0, 100), errors });
    }
    
    return { isValid, errors };
  }
  
  static validateEmailData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.clientId || typeof data.clientId !== 'string') {
      errors.push('Valid client ID is required');
    }
    
    if (!data.requestId || typeof data.requestId !== 'string') {
      errors.push('Valid request ID is required');
    }
    
    if (!data.selectedQuotes || !Array.isArray(data.selectedQuotes) || data.selectedQuotes.length === 0) {
      errors.push('At least one quote must be selected');
    }
    
    if (!data.emailSubject || typeof data.emailSubject !== 'string' || data.emailSubject.trim().length === 0) {
      errors.push('Email subject is required');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  static validateQuoteData(quote: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!quote.id) {
      errors.push('Quote ID is required');
    }
    
    if (!quote.route || typeof quote.route !== 'string') {
      errors.push('Quote route is required');
    }
    
    if (typeof quote.total_price !== 'number' || quote.total_price <= 0) {
      errors.push('Valid total price is required');
    }
    
    if (!quote.fare_type || typeof quote.fare_type !== 'string') {
      errors.push('Fare type is required');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/\0/g, '') // Remove null bytes
      .substring(0, 10000); // Limit length
  }
}