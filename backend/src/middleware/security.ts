import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Enhanced rate limiting configurations
export const rateLimiters = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Much higher limit in dev
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later',
      retryAfter: Math.ceil((15 * 60 * 1000) / 1000) // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting in development environment entirely
    skip: (req) => {
      return process.env.NODE_ENV === 'development';
    }
  }),

  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 1000 : 5, // Much higher limit in dev
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later',
      retryAfter: Math.ceil((15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    // Skip rate limiting in development environment entirely
    skip: (req) => {
      return process.env.NODE_ENV === 'development';
    }
  }),

  // Puzzle generation rate limiting
  puzzleGeneration: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 10, // Much higher limit in dev
    message: {
      success: false,
      message: 'Too many puzzle generation requests, please try again later',
      retryAfter: Math.ceil((60 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting in development environment entirely
    skip: (req) => {
      return process.env.NODE_ENV === 'development';
    }
  }),

  // Suggestion submission rate limiting
  suggestions: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 20, // Much higher limit in dev
    message: {
      success: false,
      message: 'Too many suggestions submitted, please try again later',
      retryAfter: Math.ceil((60 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting in development environment entirely
    skip: (req) => {
      return process.env.NODE_ENV === 'development';
    }
  })
};

// Enhanced helmet configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // Needed for some frontend frameworks
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
});

// Request sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Recursively sanitize all string inputs
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .substring(0, 10000); // Limit string length
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitize request body, query, and params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // For query and params, we need to modify properties individually since they're read-only
  if (req.query && typeof req.query === 'object') {
    try {
      const sanitizedQuery = sanitizeObject(req.query);
      // Clear existing properties safely
      for (const key in req.query) {
        if (req.query.hasOwnProperty(key)) {
          delete req.query[key];
        }
      }
      // Assign sanitized values
      for (const key in sanitizedQuery) {
        if (sanitizedQuery.hasOwnProperty(key)) {
          req.query[key] = sanitizedQuery[key];
        }
      }
    } catch (error) {
      console.error('Error sanitizing query:', error);
      // Don't throw error, just log it and continue
    }
  }
  
  if (req.params && typeof req.params === 'object') {
    const sanitizedParams = sanitizeObject(req.params);
    Object.keys(req.params).forEach(key => {
      delete req.params![key];
    });
    Object.assign(req.params, sanitizedParams);
  }

  next();
};

// Request size validation middleware
export const validateRequestSize = (maxSize: string = '1mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          success: false,
          message: `Request entity too large. Maximum size allowed: ${maxSize}`,
          received: `${Math.round(sizeInBytes / 1024)}KB`,
          limit: maxSize
        });
      }
    }
    
    next();
  };
};

// Helper function to parse size strings like '1mb', '500kb'
const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) return 1024 * 1024; // Default to 1MB
  
  const [, number, unit] = match;
  return Math.floor(parseFloat(number) * units[unit]);
};

// IP whitelist middleware (for development/admin access)
export const ipWhitelist = (allowedIPs: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
      return next(); // Skip in development
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP || '')) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden from this IP address'
      });
    }
    
    next();
  };
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // Add custom security headers
  res.set({
    'X-Request-ID': req.headers['x-request-id'] || generateRequestId(),
    'X-Response-Time': Date.now().toString()
  });
  
  next();
};

// Generate unique request ID
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// CORS configuration for enhanced security
export const corsConfig = {
  origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests) in development
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (origin && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS policy'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
};