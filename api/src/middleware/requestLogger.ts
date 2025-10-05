import { Request, Response, NextFunction } from 'express';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  
  // Log request
  console.log(`📡 ${req.method} ${req.path} - ${req.ip}`);
  
  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = function(this: any, chunk: any, encoding?: any) {
    const duration = Date.now() - start;
    console.log(`✅ ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    return originalEnd(chunk, encoding);
  };
  
  next();
};