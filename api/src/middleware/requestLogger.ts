import { Request, Response, NextFunction } from 'express';
import { logRequest, logPerformance } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithContext extends Request {
  requestId?: string;
  startTime?: number;
}

export const requestLogger = (
  req: RequestWithContext,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  const requestId = uuidv4();
  
  // Add request context
  req.requestId = requestId;
  req.startTime = start;
  
  // Create log context
  const context: any = {
    requestId,
    ...(req.ip && { ip: req.ip }),
    ...(req.get('User-Agent') && { userAgent: req.get('User-Agent') }),
    ...(req.user?.id && { userId: req.user.id })
  };
  
  // Log incoming request (only in development for debugging)
  if (process.env['NODE_ENV'] === 'development') {
    console.log(`📡 ${req.method} ${req.path} - ${req.ip} [${requestId}]`);
  }
  
  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = function(this: any, chunk: any, encoding?: any) {
    const duration = Date.now() - start;
    
    // Log the completed request
    logRequest(req.method, req.path, res.statusCode, duration, context);
    
    // Log performance if slow
    if (duration > 1000) {
      logPerformance(`${req.method} ${req.path}`, duration, context);
    }
    
    // Console log in development
    if (process.env['NODE_ENV'] === 'development') {
      const statusEmoji = res.statusCode >= 400 ? '❌' : '✅';
      console.log(`${statusEmoji} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms [${requestId}]`);
    }
    
    return originalEnd(chunk, encoding);
  };
  
  next();
};