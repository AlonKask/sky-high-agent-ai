// Production-safe logging utility
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: string;
  userId?: string;
}

class ProductionLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private addLog(level: LogEntry['level'], message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      data: this.sanitizeData(data),
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId()
    };

    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In development, still show in console
    if (import.meta.env.DEV) {
      console[level](message, data);
    }

    // In production, only log errors to external service
    if (!import.meta.env.DEV && level === 'error') {
      this.sendToMonitoring(entry);
    }
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        }
      }
      return sanitized;
    }
    
    return data;
  }

  private getCurrentUserId(): string | undefined {
    // Safe way to get user ID without importing Supabase
    try {
      const authData = localStorage.getItem('supabase.auth.token');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed?.user?.id;
      }
    } catch {
      // Ignore errors
    }
    return undefined;
  }

  private async sendToMonitoring(entry: LogEntry) {
    try {
      // In production, send to monitoring service
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch {
      // Silently fail - don't break the app
    }
  }

  debug(message: string, data?: any) {
    this.addLog('debug', message, data);
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
  }

  error(message: string, data?: any) {
    this.addLog('error', message, data);
  }

  getRecentLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new ProductionLogger();
export const { debug, info, warn, error } = logger;
