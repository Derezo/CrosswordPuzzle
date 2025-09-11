import { Request, Response, NextFunction } from 'express';
import { logRequest, httpLogger, securityLogger } from '../utils/logger';

// Middleware to log HTTP requests with response time
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Add request ID if not present
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = generateRequestId();
  }

  // Log the incoming request
  httpLogger.http('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'],
    timestamp: new Date().toISOString()
  });

  // Capture the original res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = function(...args: any[]) {
    const responseTime = Date.now() - startTime;
    
    // Log the response
    logRequest(req, res, responseTime);
    
    // Call the original end method with all arguments
    return originalEnd(...args);
  };

  next();
};

// Middleware to log authentication events
export const authLogger = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data?: any) {
    // Log authentication events
    if (req.path.includes('/auth/')) {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (req.method === 'POST') {
        if (req.path.includes('/login')) {
          if (res.statusCode === 200) {
            securityLogger.info('User login successful', {
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              userId: parsedData?.user?.id,
              email: parsedData?.user?.email,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            });
          } else {
            securityLogger.warn('User login failed', {
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              email: req.body?.email,
              reason: parsedData?.error,
              statusCode: res.statusCode,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            });
          }
        } else if (req.path.includes('/register')) {
          if (res.statusCode === 201) {
            securityLogger.info('User registration successful', {
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              userId: parsedData?.user?.id,
              email: parsedData?.user?.email,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            });
          } else {
            securityLogger.warn('User registration failed', {
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              email: req.body?.email,
              reason: parsedData?.error,
              statusCode: res.statusCode,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            });
          }
        }
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Middleware to log security events
export const securityEventLogger = (req: Request, res: Response, next: NextFunction) => {
  // Log suspicious activity
  const suspiciousPatterns = [
    /\.\.\//,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /exec\(/i,  // Code injection
    /eval\(/i   // Eval injection
  ];

  const checkSuspiciousContent = (content: string) => {
    return suspiciousPatterns.some(pattern => pattern.test(content));
  };

  // Check URL for suspicious patterns
  if (checkSuspiciousContent(req.originalUrl)) {
    securityLogger.error('Suspicious URL detected', {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    });
  }

  // Check request body for suspicious patterns
  if (req.body && typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body);
    if (checkSuspiciousContent(bodyString)) {
      securityLogger.error('Suspicious request body detected', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    }
  }

  next();
};

// Middleware to log rate limit violations
export const rateLimitLogger = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data?: any) {
    // Log rate limit violations
    if (res.statusCode === 429) {
      securityLogger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Generate unique request ID
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Export all middleware
export {
  requestLogger as default
};