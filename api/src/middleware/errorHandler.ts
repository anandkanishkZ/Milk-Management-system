import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', error);
  
  // Default error response
  const response: ApiResponse = {
    success: false,
    message: 'Internal server error',
    error: process.env['NODE_ENV'] === 'development' ? error.message : 'Something went wrong'
  };
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    response.message = 'Validation failed';
    response.error = error.message;
    res.status(400).json(response);
    return;
  }
  
  if (error.name === 'UnauthorizedError') {
    response.message = 'Unauthorized access';
    response.error = 'Invalid or expired token';
    res.status(401).json(response);
    return;
  }
  
  if (error.name === 'ForbiddenError') {
    response.message = 'Forbidden';
    response.error = 'Insufficient permissions';
    res.status(403).json(response);
    return;
  }
  
  if (error.name === 'NotFoundError') {
    response.message = 'Resource not found';
    response.error = error.message;
    res.status(404).json(response);
    return;
  }
  
  // Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    if (prismaError.code === 'P2002') {
      response.message = 'Duplicate entry';
      response.error = 'A record with this information already exists';
      res.status(409).json(response);
      return;
    }
    
    if (prismaError.code === 'P2025') {
      response.message = 'Record not found';
      response.error = 'The requested record does not exist';
      res.status(404).json(response);
      return;
    }
  }
  
  // Default 500 error
  res.status(500).json(response);
};