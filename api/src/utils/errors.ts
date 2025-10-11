// Standard error codes for the application
export enum ErrorCode {
  // Authentication errors
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  
  // Authorization errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED = 'ACCESS_DENIED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Business logic errors
  CUSTOMER_HAS_DEPENDENCIES = 'CUSTOMER_HAS_DEPENDENCIES',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  
  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Socket errors
  SOCKET_CONNECTION_ERROR = 'SOCKET_CONNECTION_ERROR',
  SOCKET_AUTHENTICATION_ERROR = 'SOCKET_AUTHENTICATION_ERROR',
  DELIVERY_UPDATE_ERROR = 'DELIVERY_UPDATE_ERROR',
  PAYMENT_ADD_ERROR = 'PAYMENT_ADD_ERROR',
}

// Standard error class
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      ...(process.env['NODE_ENV'] === 'development' && { stack: this.stack })
    };
  }
}

// Predefined error creators
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, ErrorCode.AUTHENTICATION_REQUIRED, 401, true, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: any) {
    super(`${resource} not found`, ErrorCode.RESOURCE_NOT_FOUND, 404, true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(message, ErrorCode.RESOURCE_CONFLICT, 409, true, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, ErrorCode.DATABASE_ERROR, 500, true, details);
  }
}

export class SocketError extends AppError {
  constructor(message: string, code: ErrorCode, details?: any) {
    super(message, code, 400, true, details);
  }
}

// Error response formatter
export interface ErrorResponse {
  success: false;
  message: string;
  code: ErrorCode;
  statusCode?: number;
  details?: any;
  timestamp: string;
  path?: string;
  stack?: string;
}

export const formatErrorResponse = (error: AppError, path?: string): ErrorResponse => {
  const response: ErrorResponse = {
    success: false,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    details: error.details,
    timestamp: new Date().toISOString()
  };

  if (path) {
    response.path = path;
  }

  if (process.env['NODE_ENV'] === 'development' && error.stack) {
    response.stack = error.stack;
  }

  return response;
};

// Helper to check if error is operational
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};