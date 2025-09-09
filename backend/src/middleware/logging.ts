import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

class Logger {
  private logLevel: LogLevel;
  private logDir: string;

  constructor() {
    this.logLevel = this.getLogLevel();
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase() || 'info';
    switch (level) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatLogEntry(level: string, message: string, meta?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta
    };
  }

  private writeToFile(filename: string, entry: LogEntry): void {
    const logFile = path.join(this.logDir, filename);
    const logLine = JSON.stringify(entry) + '\n';
    
    fs.appendFile(logFile, logLine, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: any): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatLogEntry(levelName, message, meta);
    
    // Write to console
    console.log(JSON.stringify(entry));
    
    // Write to files
    const today = new Date().toISOString().split('T')[0];
    this.writeToFile(`app-${today}.log`, entry);
    
    // Write errors to separate file
    if (level === LogLevel.ERROR) {
      this.writeToFile(`error-${today}.log`, entry);
    }
  }

  error(message: string, meta?: any): void {
    this.log(LogLevel.ERROR, 'ERROR', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  // Security-specific logging
  security(event: string, details: any, req?: Request): void {
    const entry = {
      ...this.formatLogEntry('SECURITY', event, details),
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      userId: (req as any)?.user?.id
    };

    // Write to security log
    const today = new Date().toISOString().split('T')[0];
    this.writeToFile(`security-${today}.log`, entry);
    
    // Also log as error
    this.error(`SECURITY: ${event}`, details);
  }

  // Performance logging
  performance(operation: string, duration: number, details?: any): void {
    const entry = {
      ...this.formatLogEntry('PERFORMANCE', operation, {
        duration,
        ...details
      })
    };

    const today = new Date().toISOString().split('T')[0];
    this.writeToFile(`performance-${today}.log`, entry);
  }
}

// Global logger instance
export const logger = new Logger();

// Request ID generator
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  // Add request ID to request object
  (req as any).requestId = requestId;
  
  // Log incoming request
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id
  });

  // Override res.json to capture response
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    
    // Log response
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      responseSize: JSON.stringify(body).length
    });

    // Log performance if slow
    if (duration > 1000) {
      logger.performance('Slow request', duration, {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode
      });
    }

    return originalJson.call(this, body);
  };

  // Handle errors
  res.on('error', (error) => {
    logger.error('Response error', {
      requestId,
      error: error.message,
      stack: error.stack
    });
  });

  next();
}

// Error logging middleware
export function errorLogger(error: any, req: Request, res: Response, next: NextFunction): void {
  const requestId = (req as any).requestId;
  
  logger.error('Request error', {
    requestId,
    method: req.method,
    url: req.url,
    error: error.message,
    stack: error.stack,
    userId: (req as any).user?.id
  });

  next(error);
}

// Security event logger
export function logSecurityEvent(event: string, req: Request, details?: any): void {
  logger.security(event, {
    ...details,
    method: req.method,
    url: req.url,
    requestId: (req as any).requestId
  }, req);
}

// Database operation logger
export function logDatabaseOperation(operation: string, duration: number, details?: any): void {
  logger.performance(`Database: ${operation}`, duration, details);
  
  if (duration > 2000) {
    logger.warn('Slow database operation', {
      operation,
      duration,
      ...details
    });
  }
}

// Puzzle generation logger
export function logPuzzleGeneration(date: string, duration: number, success: boolean, details?: any): void {
  const message = success ? 'Puzzle generated successfully' : 'Puzzle generation failed';
  
  const logData = {
    date,
    duration,
    success,
    ...details
  };

  if (success) {
    logger.info(message, logData);
    logger.performance('Puzzle generation', duration, logData);
  } else {
    logger.error(message, logData);
  }
}