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

// Utility functions for structured logging
export const logActivity = (userId: string, action: string, details?: any) => {
  logger.info('User Activity', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

export const logRequest = (method: string, url: string, userId?: string, duration?: number) => {
  logger.info('HTTP Request', {
    method,
    url,
    userId,
    duration,
    timestamp: new Date().toISOString()
  });
};

export const logAuth = (event: string, userId?: string, email?: string, success?: boolean) => {
  logger.info('Authentication Event', {
    event,
    userId,
    email,
    success,
    timestamp: new Date().toISOString()
  });
};

export const logDatabase = (operation: string, table: string, userId?: string, error?: string) => {
  const level = error ? 'error' : 'debug';
  logger.log(level, 'Database Operation', {
    operation,
    table,
    userId,
    error,
    timestamp: new Date().toISOString()
  });
};

export const logSocket = (event: string, userId?: string, data?: any) => {
  logger.debug('Socket Event', {
    event,
    userId,
    data: data ? JSON.stringify(data) : undefined,
    timestamp: new Date().toISOString()
  });
};

export default logger;