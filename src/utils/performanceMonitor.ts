import { logger } from './logger';
import { trackPerformanceMetric } from './monitoring';

export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();
  
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
    trackPerformanceMetric(operation, duration);
    
    return duration;
  }
  
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
  
  static measure<T>(operation: string, fn: () => T): T {
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
}