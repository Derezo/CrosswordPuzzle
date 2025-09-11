import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Define log levels with priorities
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Tell winston to use these colors
winston.addColors(logColors);

// Define the custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      log += `\nStack: ${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// File transports disabled for development due to permission issues
// const fileRotateTransport = new DailyRotateFile({
//   filename: 'logs/galactic-crossword-%DATE%.log',
//   datePattern: 'YYYY-MM-DD',
//   maxSize: '20m',
//   maxFiles: '14d',
//   format: logFormat,
//   level: 'info'
// });

// const errorFileRotateTransport = new DailyRotateFile({
//   filename: 'logs/galactic-crossword-error-%DATE%.log',
//   datePattern: 'YYYY-MM-DD',
//   maxSize: '20m',
//   maxFiles: '30d',
//   format: logFormat,
//   level: 'error'
// });

// const httpFileRotateTransport = new DailyRotateFile({
//   filename: 'logs/galactic-crossword-http-%DATE%.log',
//   datePattern: 'YYYY-MM-DD',
//   maxSize: '20m',
//   maxFiles: '7d',
//   format: winston.format.combine(
//     winston.format.timestamp(),
//     winston.format.json()
//   ),
//   level: 'http'
// });

// Create the logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  transports: [],
  exitOnError: false,
  silent: false
});

// Add console transport for development
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
} else {
  // In production, only log warnings and errors to console
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'warn'
  }));
}

// Create specialized loggers for different components
export const authLogger = logger.child({ component: 'auth' });
export const puzzleLogger = logger.child({ component: 'puzzle' });
export const achievementLogger = logger.child({ component: 'achievement' });
export const dbLogger = logger.child({ component: 'database' });
export const httpLogger = logger.child({ component: 'http' });
export const securityLogger = logger.child({ component: 'security' });

// Utility functions for common logging patterns
export const logRequest = (req: any, res: any, responseTime?: number) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    statusCode: res.statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    requestId: req.headers['x-request-id']
  };

  if (res.statusCode >= 400) {
    httpLogger.warn('HTTP Request', logData);
  } else {
    httpLogger.http('HTTP Request', logData);
  }
};

export const logError = (error: Error, context?: string, metadata?: any) => {
  logger.error(`${context ? `[${context}] ` : ''}${error.message}`, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    ...metadata
  });
};

export const logSecurityEvent = (event: string, details: any, severity: 'warn' | 'error' = 'warn') => {
  securityLogger[severity](`Security Event: ${event}`, {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

export const logDatabaseOperation = (operation: string, table: string, duration?: number, error?: Error) => {
  if (error) {
    dbLogger.error(`Database operation failed: ${operation} on ${table}`, {
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      error: {
        name: error.name,
        message: error.message
      }
    });
  } else {
    dbLogger.debug(`Database operation: ${operation} on ${table}`, {
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined
    });
  }
};

export const logAchievementEarned = (userId: string, achievementId: string, achievementName: string, metadata?: any) => {
  achievementLogger.info('Achievement earned', {
    userId,
    achievementId,
    achievementName,
    timestamp: new Date().toISOString(),
    ...metadata
  });
};

export const logPuzzleGeneration = (puzzleDate: string, duration: number, success: boolean, metadata?: any) => {
  const logData = {
    puzzleDate,
    duration: `${duration}ms`,
    success,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  if (success) {
    puzzleLogger.info('Puzzle generated successfully', logData);
  } else {
    puzzleLogger.error('Puzzle generation failed', logData);
  }
};

// Export the main logger as default
export default logger;