import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { logError, securityLogger } from '../utils/logger';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, isOperational = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, true, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, true, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

// Error response formatter
const formatErrorResponse = (error: Error, req: Request) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // For auth routes, maintain compatibility with frontend
  if (req.originalUrl.includes('/api/auth/')) {
    const baseResponse = {
      error: error.message
    };
    
    // Add stack trace in development
    if (isDevelopment && error.stack) {
      (baseResponse as any).stack = error.stack;
    }
    
    return baseResponse;
  }
  
  // For other routes, use new structured format
  const baseResponse = {
    success: false,
    error: {
      message: error.message,
      code: (error as AppError).code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      requestId: req.headers['x-request-id']
    }
  };

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    (baseResponse.error as any).stack = error.stack;
  }

  return baseResponse;
};

// Handle Prisma errors
const handlePrismaError = (error: any): AppError => {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new ConflictError('A record with this data already exists');
      case 'P2025':
        return new NotFoundError('Record not found');
      case 'P2003':
        return new ValidationError('Foreign key constraint failed');
      case 'P2016':
        return new ValidationError('Query interpretation error');
      default:
        return new DatabaseError(`Database error: ${error.message}`);
    }
  }

  if (error instanceof PrismaClientValidationError) {
    return new ValidationError('Invalid data provided');
  }

  return new DatabaseError('Database operation failed');
};

// Handle JWT errors
const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }
  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('Token not active');
  }
  
  return new AuthenticationError('Token verification failed');
};

// Handle Validation errors (express-validator, Joi)
const handleValidationError = (error: any): AppError => {
  if (error.name === 'ValidationError' || error.details) {
    return new ValidationError(error.message);
  }
  
  return error;
};

// Main error handling middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  try {
    let handledError: AppError;

    // Handle specific error types
    if (error.name?.includes('Prisma')) {
      handledError = handlePrismaError(error);
    } else if (error.name?.includes('JsonWebToken') || error.name?.includes('Token')) {
      handledError = handleJWTError(error);
    } else if (error instanceof AppError) {
      handledError = error;
    } else {
      handledError = handleValidationError(error);
      
      // If still not handled, treat as internal server error
      if (!(handledError instanceof AppError)) {
        handledError = new AppError('Internal server error', 500, false);
      }
    }

    // Log the error with basic console.error to avoid circular issues
    console.error(`[${req.method} ${req.originalUrl}] ${handledError.message}`, {
      statusCode: handledError.statusCode,
      userId: (req as any).user?.id,
      ip: req.ip
    });

    // Send error response
    const response = formatErrorResponse(handledError, req);
    res.status(handledError.statusCode).json(response);
  } catch (err) {
    // Fallback error handling to prevent infinite loops
    console.error('Error in error handler:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Unhandled promise rejection handler
export const setupGlobalErrorHandlers = () => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logError(
      new Error(`Unhandled Promise Rejection: ${reason}`),
      'Global Handler',
      { reason, promise: promise.toString() }
    );
    
    // Don't exit the process in production, just log
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    logError(error, 'Global Handler', { 
      fatal: true,
      processExit: true 
    });
    
    // Exit the process for uncaught exceptions
    process.exit(1);
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};

// Health check error monitoring
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: {
    database: boolean;
    memory: {
      used: number;
      free: number;
      percentage: number;
    };
    disk?: {
      used: number;
      free: number;
      percentage: number;
    };
  };
  errors?: string[];
}

export const performHealthCheck = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  const checks: HealthCheckResult['checks'] = {
    database: false,
    memory: {
      used: 0,
      free: 0,
      percentage: 0
    }
  };
  const errors: string[] = [];

  // Database health check
  try {
    const { prisma } = require('../lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    errors.push(`Database: ${(error as Error).message}`);
  }

  // Memory health check
  try {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const freeMemory = totalMemory - usedMemory;
    const percentage = Math.round((usedMemory / totalMemory) * 100);

    checks.memory = {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      free: Math.round(freeMemory / 1024 / 1024), // MB
      percentage
    };

    if (percentage > 90) {
      errors.push(`Memory usage critical: ${percentage}%`);
    }
  } catch (error) {
    errors.push(`Memory check: ${(error as Error).message}`);
  }

  // Determine overall status
  let status: HealthCheckResult['status'] = 'healthy';
  if (errors.length > 0) {
    status = checks.database ? 'degraded' : 'unhealthy';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks,
    errors: errors.length > 0 ? errors : undefined
  };
};