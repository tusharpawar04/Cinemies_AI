/**
 * Global Error Handling Middleware
 * Catches all errors and returns consistent error responses
 */

const config = require('../config');
const logger = require('../utils/logger');

/**
 * Custom Error Classes
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
  }
}

/**
 * Handle Sequelize errors
 */
const handleSequelizeError = (err) => {
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));
    return new ValidationError('Validation failed', errors);
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    return new ConflictError(`${field} already exists`);
  }
  
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return new ValidationError('Invalid reference');
  }
  
  return new InternalServerError(`Database error: ${err.message}`);
};

/**
 * Handle Mongoose errors
 */
const handleMongooseError = (err) => {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    return new ValidationError('Validation failed', errors);
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return new ConflictError(`${field} already exists`);
  }
  
  if (err.name === 'CastError') {
    return new ValidationError('Invalid ID format');
  }
  
  return new InternalServerError('Database error');
};

/**
 * Handle JWT errors
 */
const handleJWTError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return new UnauthorizedError('Invalid token');
  }
  
  if (err.name === 'TokenExpiredError') {
    return new UnauthorizedError('Token expired');
  }
  
  return new UnauthorizedError('Authentication failed');
};

/**
 * Not Found Handler (404)
 */
const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  let error = err;
  
  // Handle specific error types
  if (err.name?.includes('Sequelize')) {
    error = handleSequelizeError(err);
  } else if (err.name?.includes('Mongo')) {
    error = handleMongooseError(err);
  } else if (err.name?.includes('JsonWebToken') || err.name?.includes('TokenExpired')) {
    error = handleJWTError(err);
  }
  
  // Default to 500 if no status code
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  
  // Log error
  logger.error('Error occurred', {
    message: error.message,
    statusCode,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    body: req.body,
  });
  
  // Send error response
  const response = {
    success: false,
    error: message,
    statusCode,
  };
  
  // Add error details in development
  if (config.env === 'development') {
    response.stack = error.stack;
    response.details = error.details;
  }
  
  // Add error code if available
  if (error.code) {
    response.code = error.code;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper
 * Catches async errors and passes them to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  
  // Middleware
  notFound,
  errorHandler,
  asyncHandler,
};
