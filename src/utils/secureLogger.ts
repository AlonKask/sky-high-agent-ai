/**
 * Production-safe logging utility
 * Prevents sensitive data exposure while maintaining debugging capabilities
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

class SecureLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveFields = [
      'password', 'token', 'key', 'secret', 'credential',
      'access_token', 'refresh_token', 'auth', 'authorization',
      'ssn', 'passport', 'payment', 'card', 'cvv', 'pin'
    ];

    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private createLogEntry(level: LogLevel, message: string, metadata?: any): LogEntry {
    return {
      level,
      message,
      timestamp: Date.now(),
      metadata: metadata ? this.sanitizeData(metadata) : undefined
    };
  }

  private addToBuffer(entry: LogEntry) {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  debug(message: string, metadata?: any) {
    const entry = this.createLogEntry('debug', message, metadata);
    this.addToBuffer(entry);
    
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, metadata || '');
    }
  }

  info(message: string, metadata?: any) {
    const entry = this.createLogEntry('info', message, metadata);
    this.addToBuffer(entry);
    
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, metadata || '');
    }
  }

  warn(message: string, metadata?: any) {
    const entry = this.createLogEntry('warn', message, metadata);
    this.addToBuffer(entry);
    
    console.warn(`[WARN] ${message}`, this.sanitizeData(metadata) || '');
  }

  error(message: string, metadata?: any) {
    const entry = this.createLogEntry('error', message, metadata);
    this.addToBuffer(entry);
    
    console.error(`[ERROR] ${message}`, this.sanitizeData(metadata) || '');
    
    // In production, also send to monitoring service
    if (!this.isDevelopment) {
      this.sendToMonitoring(entry);
    }
  }

  private async sendToMonitoring(entry: LogEntry) {
    try {
      // Send to Supabase security monitoring
      await fetch('/api/monitoring/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch (err) {
      // Silently fail to avoid logging loops
    }
  }

  getRecentLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  clearLogs() {
    this.logBuffer = [];
  }
}

export const secureLogger = new SecureLogger();
export const { debug, info, warn, error } = secureLogger;