// Production-safe logging utility
// Replaces console.log statements to prevent sensitive data exposure

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  userId?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  private createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      data: this.sanitizeData(data),
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId()
    };
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    // Remove sensitive data patterns
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'ssn', 'passport'];
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      
      Object.keys(sanitized).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        }
      });
      
      return sanitized;
    }
    
    return data;
  }

  private getCurrentUserId(): string | undefined {
    // In production, get from auth context
    return undefined;
  }

  private logToBuffer(entry: LogEntry) {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  debug(message: string, data?: any) {
    const entry = this.createLogEntry('debug', message, data);
    this.logToBuffer(entry);
    
    if (this.isDevelopment) {
      console.log(`🐛 ${entry.message}`, entry.data ? entry.data : '');
    }
  }

  info(message: string, data?: any) {
    const entry = this.createLogEntry('info', message, data);
    this.logToBuffer(entry);
    
    if (this.isDevelopment) {
      console.info(`ℹ️ ${entry.message}`, entry.data ? entry.data : '');
    }
  }

  warn(message: string, data?: any) {
    const entry = this.createLogEntry('warn', message, data);
    this.logToBuffer(entry);
    
    console.warn(`⚠️ ${entry.message}`, entry.data ? entry.data : '');
  }

  error(message: string, data?: any) {
    const entry = this.createLogEntry('error', message, data);
    this.logToBuffer(entry);
    
    console.error(`❌ ${entry.message}`, entry.data ? entry.data : '');
    
    // In production, send to monitoring service
    if (!this.isDevelopment) {
      this.sendToMonitoring(entry);
    }
  }

  private async sendToMonitoring(entry: LogEntry) {
    // Send to external monitoring service in production
    // For now, we'll just store critical errors
    try {
      if (entry.level === 'error') {
        // Store in Supabase for monitoring
        // Implementation would go here
      }
    } catch (err) {
      // Fail silently to prevent logging loops
    }
  }

  getRecentLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  clearLogs() {
    this.logBuffer = [];
  }
}

export const logger = new Logger();

// Convenience exports
export const { debug, info, warn, error } = logger;