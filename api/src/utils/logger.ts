import winston from 'winston';
import path from 'path';
import fs from 'fs';
import config from '@/config';

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.file);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (stack) {
      msg += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  defaultMeta: { 
    service: config.app.name,
    version: config.app.version,
    environment: config.nodeEnv
  },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Error file transport
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    })
  ]
});

// Add console transport in development
if (config.nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );
}

// Enhanced utility functions for structured logging
export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  correlationId?: string;
}

export const logActivity = (userId: string, action: string, details?: any, context?: LogContext) => {
  logger.info('User Activity', {
    category: 'activity',
    userId,
    action,
    details,
    ...context,
    timestamp: new Date().toISOString()
  });
};

export const logError = (error: Error, context?: LogContext & { operation?: string }) => {
  logger.error('Application Error', {
    category: 'error',
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
    timestamp: new Date().toISOString()
  });
};

export const logRequest = (method: string, url: string, statusCode: number, duration?: number, context?: LogContext) => {
  const level = statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, 'HTTP Request', {
    category: 'http',
    method,
    url,
    statusCode,
    duration: duration ? `${duration}ms` : undefined,
    ...context,
    timestamp: new Date().toISOString()
  });
};

export const logAuth = (event: string, success: boolean, context?: LogContext & { email?: string; reason?: string }) => {
  const level = success ? 'info' : 'warn';
  logger.log(level, 'Authentication Event', {
    category: 'auth',
    event,
    success,
    ...context,
    timestamp: new Date().toISOString()
  });
};

export const logDatabase = (operation: string, table: string, success: boolean, context?: LogContext & { error?: string; duration?: number }) => {
  const level = success ? 'debug' : 'error';
  logger.log(level, 'Database Operation', {
    category: 'database',
    operation,
    table,
    success,
    duration: context?.duration ? `${context.duration}ms` : undefined,
    error: context?.error,
    userId: context?.userId,
    timestamp: new Date().toISOString()
  });
};

export const logSocket = (event: string, success: boolean, context?: LogContext & { data?: any; error?: string }) => {
  const level = success ? 'debug' : 'warn';
  logger.log(level, 'Socket Event', {
    category: 'socket',
    event,
    success,
    userId: context?.userId,
    data: context?.data ? JSON.stringify(context.data) : undefined,
    error: context?.error,
    timestamp: new Date().toISOString()
  });
};

export const logSecurity = (event: string, severity: 'low' | 'medium' | 'high', context?: LogContext & { details?: any }) => {
  const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
  logger.log(level, 'Security Event', {
    category: 'security',
    event,
    severity,
    ...context,
    timestamp: new Date().toISOString()
  });
};

export const logPerformance = (operation: string, duration: number, context?: LogContext & { details?: any }) => {
  const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
  logger.log(level, 'Performance Metric', {
    category: 'performance',
    operation,
    duration: `${duration}ms`,
    slow: duration > 1000,
    ...context,
    timestamp: new Date().toISOString()
  });
};

export const logBusiness = (event: string, context?: LogContext & { details?: any }) => {
  logger.info('Business Event', {
    category: 'business',
    event,
    ...context,
    timestamp: new Date().toISOString()
  });
};

export default logger;