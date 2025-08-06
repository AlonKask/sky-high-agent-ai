import { logger } from './logger';

// Consolidated Performance Monitor with enhanced features
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();
  private static marks: Map<string, number> = new Map();
  
  // Timer-based monitoring (from original performanceMonitor.ts)
  static startTimer(operation: string): void {
    this.timers.set(operation, performance.now());
    logger.debug(`Performance timer started: ${operation}`);
  }
  
  static endTimer(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      logger.warn(`No timer found for operation: ${operation}`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    this.timers.delete(operation);
    
    logger.info(`Performance metric: ${operation} completed in ${duration.toFixed(2)}ms`);
    
    // Log slow operations in development
    if (import.meta.env.DEV && duration > 100) {
      console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  // Mark-based monitoring (from performance.ts)
  static mark(name: string): void {
    this.marks.set(name, performance.now());
  }
  
  static measureFromMark(name: string, startMark: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) {
      console.warn(`Start mark "${startMark}" not found`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    
    // Log slow operations in development
    if (import.meta.env.DEV && duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  // Async function monitoring
  static async measureAsync<T>(operation: string, asyncFn: () => Promise<T>): Promise<T> {
    this.startTimer(operation);
    try {
      const result = await asyncFn();
      this.endTimer(operation);
      return result;
    } catch (error) {
      this.endTimer(operation);
      logger.error(`Performance monitoring error in ${operation}:`, error);
      throw error;
    }
  }
  
  // Sync function monitoring
  static measureFunction<T>(operation: string, fn: () => T): T {
    this.startTimer(operation);
    try {
      const result = fn();
      this.endTimer(operation);
      return result;
    } catch (error) {
      this.endTimer(operation);
      logger.error(`Performance monitoring error in ${operation}:`, error);
      throw error;
    }
  }
  
  static clear(): void {
    this.timers.clear();
    this.marks.clear();
  }
}

// Image optimization utility
export function optimizeImageSrc(src: string, width?: number, quality = 85): string {
  if (!src) return '';
  
  // For external images, return as is
  if (src.startsWith('http')) {
    return src;
  }
  
  // For local images, add optimization parameters
  const url = new URL(src, window.location.origin);
  if (width) {
    url.searchParams.set('w', width.toString());
  }
  url.searchParams.set('q', quality.toString());
  
  return url.toString();
}

// Debounce utility for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

// Throttle utility for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}