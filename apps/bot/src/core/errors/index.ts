/**
 * Custom Error Classes
 * Centralized error handling với error codes và status codes
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class ToolExecutionError extends AppError {
  constructor(
    message: string,
    public toolName: string,
  ) {
    super(message, 'TOOL_EXECUTION_ERROR', 500);
    this.name = 'ToolExecutionError';
  }
}

export class AIProviderError extends AppError {
  constructor(
    message: string,
    public provider: string,
    public originalError?: Error,
  ) {
    super(message, 'AI_PROVIDER_ERROR', 502);
    this.name = 'AIProviderError';
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfterMs?: number,
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string,
    public resource?: string,
  ) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', 500);
    this.name = 'ConfigurationError';
  }
}

/**
 * Type guard để check AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Wrap unknown error thành AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR');
  }
  return new AppError(String(error), 'UNKNOWN_ERROR');
}
