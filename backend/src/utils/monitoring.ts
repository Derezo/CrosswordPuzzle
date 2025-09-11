import logger from './logger';

// Application metrics interface
export interface ApplicationMetrics {
  requests: {
    total: number;
    success: number;
    error: number;
    averageResponseTime: number;
  };
  authentication: {
    logins: number;
    registrations: number;
    failures: number;
  };
  puzzles: {
    generated: number;
    solved: number;
    validations: number;
  };
  achievements: {
    earned: number;
    users: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    critical: number;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    activeConnections: number;
  };
}

// In-memory metrics storage (in production, consider Redis or a proper metrics store)
class MetricsCollector {
  private metrics: ApplicationMetrics;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        averageResponseTime: 0
      },
      authentication: {
        logins: 0,
        registrations: 0,
        failures: 0
      },
      puzzles: {
        generated: 0,
        solved: 0,
        validations: 0
      },
      achievements: {
        earned: 0,
        users: 0
      },
      errors: {
        total: 0,
        byType: {},
        critical: 0
      },
      system: {
        uptime: 0,
        memoryUsage: 0,
        activeConnections: 0
      }
    };

    // Log metrics every 5 minutes in production, 1 minute in development
    const interval = process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 60 * 1000;
    setInterval(() => this.logMetrics(), interval);
  }

  // Record HTTP request metrics
  recordRequest(responseTime: number, statusCode: number, error?: boolean) {
    this.metrics.requests.total++;
    
    if (error || statusCode >= 400) {
      this.metrics.requests.error++;
    } else {
      this.metrics.requests.success++;
    }

    // Update average response time (simple moving average)
    const currentAvg = this.metrics.requests.averageResponseTime;
    const total = this.metrics.requests.total;
    this.metrics.requests.averageResponseTime = 
      ((currentAvg * (total - 1)) + responseTime) / total;
  }

  // Record authentication events
  recordAuthentication(event: 'login' | 'registration' | 'failure') {
    this.metrics.authentication[event === 'failure' ? 'failures' : event + 's']++;
  }

  // Record puzzle events
  recordPuzzle(event: 'generated' | 'solved' | 'validation') {
    if (event === 'validation') {
      this.metrics.puzzles.validations++;
    } else {
      this.metrics.puzzles[event]++;
    }
  }

  // Record achievement events
  recordAchievement(earned: boolean = true) {
    if (earned) {
      this.metrics.achievements.earned++;
    }
  }

  // Record error events
  recordError(errorType: string, critical: boolean = false) {
    this.metrics.errors.total++;
    
    if (!this.metrics.errors.byType[errorType]) {
      this.metrics.errors.byType[errorType] = 0;
    }
    this.metrics.errors.byType[errorType]++;

    if (critical) {
      this.metrics.errors.critical++;
    }
  }

  // Update system metrics
  updateSystemMetrics() {
    this.metrics.system.uptime = Math.round((Date.now() - this.startTime) / 1000);
    
    const memUsage = process.memoryUsage();
    this.metrics.system.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
  }

  // Get current metrics
  getMetrics(): ApplicationMetrics {
    this.updateSystemMetrics();
    return { ...this.metrics };
  }

  // Reset metrics (useful for testing or periodic resets)
  reset() {
    this.metrics = {
      requests: { total: 0, success: 0, error: 0, averageResponseTime: 0 },
      authentication: { logins: 0, registrations: 0, failures: 0 },
      puzzles: { generated: 0, solved: 0, validations: 0 },
      achievements: { earned: 0, users: 0 },
      errors: { total: 0, byType: {}, critical: 0 },
      system: { uptime: 0, memoryUsage: 0, activeConnections: 0 }
    };
  }

  // Log current metrics
  private logMetrics() {
    const metrics = this.getMetrics();
    
    logger.info('Application Metrics Report', {
      timestamp: new Date().toISOString(),
      metrics,
      summary: {
        totalRequests: metrics.requests.total,
        errorRate: metrics.requests.total > 0 ? 
          Math.round((metrics.requests.error / metrics.requests.total) * 100) : 0,
        avgResponseTime: Math.round(metrics.requests.averageResponseTime),
        uptime: `${Math.round(metrics.system.uptime / 60)} minutes`,
        memoryUsage: `${metrics.system.memoryUsage} MB`,
        criticalErrors: metrics.errors.critical
      }
    });

    // Alert on high error rates
    if (metrics.requests.total > 100) {
      const errorRate = (metrics.requests.error / metrics.requests.total) * 100;
      if (errorRate > 10) {
        logger.warn('High error rate detected', {
          errorRate: `${Math.round(errorRate)}%`,
          totalRequests: metrics.requests.total,
          totalErrors: metrics.requests.error
        });
      }
    }

    // Alert on high memory usage
    if (metrics.system.memoryUsage > 512) {
      logger.warn('High memory usage detected', {
        memoryUsage: `${metrics.system.memoryUsage} MB`,
        uptime: metrics.system.uptime
      });
    }

    // Alert on critical errors
    if (metrics.errors.critical > 0) {
      logger.error('Critical errors detected', {
        criticalErrors: metrics.errors.critical,
        totalErrors: metrics.errors.total,
        errorsByType: metrics.errors.byType
      });
    }
  }
}

// Create global metrics collector instance
const metricsCollector = new MetricsCollector();

// Export utility functions
export const recordRequest = (responseTime: number, statusCode: number, error?: boolean) => {
  metricsCollector.recordRequest(responseTime, statusCode, error);
};

export const recordAuthentication = (event: 'login' | 'registration' | 'failure') => {
  metricsCollector.recordAuthentication(event);
};

export const recordPuzzle = (event: 'generated' | 'solved' | 'validation') => {
  metricsCollector.recordPuzzle(event);
};

export const recordAchievement = (earned: boolean = true) => {
  metricsCollector.recordAchievement(earned);
};

export const recordError = (errorType: string, critical: boolean = false) => {
  metricsCollector.recordError(errorType, critical);
};

export const getMetrics = (): ApplicationMetrics => {
  return metricsCollector.getMetrics();
};

export const resetMetrics = () => {
  metricsCollector.reset();
};

// Express middleware to automatically record request metrics
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    recordRequest(responseTime, res.statusCode, isError);
    
    // Record specific event types
    if (req.path.includes('/auth/login') && res.statusCode === 200) {
      recordAuthentication('login');
    } else if (req.path.includes('/auth/register') && res.statusCode === 201) {
      recordAuthentication('registration');
    } else if (req.path.includes('/auth/') && res.statusCode >= 400) {
      recordAuthentication('failure');
    }
    
    if (req.path.includes('/puzzle/validate') && res.statusCode === 200) {
      recordPuzzle('validation');
    }
  });
  
  next();
};

export default metricsCollector;