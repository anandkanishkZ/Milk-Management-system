import { Request, Response, NextFunction } from 'express';
import { AppError, formatErrorResponse, isOperationalError, ErrorCode } from '@/utils/errors';
import logger from '@/utils/logger';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Convert unknown errors to AppError
  let appError: AppError;
  
  if (error instanceof AppError) {
    appError = error;
  } else {
    // Handle known error types
    appError = convertToAppError(error);
  }

  // Log the error
  logError(appError, req);

  // Format and send response
  const errorResponse = formatErrorResponse(appError, req.path);
  res.status(appError.statusCode).json(errorResponse);
};

const convertToAppError = (error: any): AppError => {
  // Prisma errors
  if (error.code === 'P2002') {
    return new AppError(
      'Resource already exists',
      ErrorCode.RESOURCE_ALREADY_EXISTS,
      409,
      true,
      { field: error.meta?.target }
    );
  }
  
  if (error.code === 'P2025') {
    return new AppError(
      'Resource not found',
      ErrorCode.RESOURCE_NOT_FOUND,
      404,
      true
    );
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return new AppError(
      'Invalid token',
      ErrorCode.INVALID_TOKEN,
      401,
      true
    );
  }

  if (error.name === 'TokenExpiredError') {
    return new AppError(
      'Token expired',
      ErrorCode.TOKEN_EXPIRED,
      401,
      true
    );
  }

  // Validation errors (Zod)
  if (error.name === 'ZodError') {
    return new AppError(
      'Validation failed',
      ErrorCode.VALIDATION_ERROR,
      400,
      true,
      error.errors
    );
  }

  // Default to internal server error
  return new AppError(
    error.message || 'An unexpected error occurred',
    ErrorCode.INTERNAL_SERVER_ERROR,
    500,
    isOperationalError(error),
    process.env['NODE_ENV'] === 'development' ? error.stack : undefined
  );
};

const logError = (error: AppError, req: Request): void => {
  const errorInfo = {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
    ...(error.details && { details: error.details }),
    ...(process.env['NODE_ENV'] === 'development' && { stack: error.stack })
  };

  if (error.statusCode >= 500) {
    logger.error('Server Error:', errorInfo);
  } else if (error.statusCode >= 400) {
    logger.warn('Client Error:', errorInfo);
  } else {
    logger.info('Error:', errorInfo);
  }
};