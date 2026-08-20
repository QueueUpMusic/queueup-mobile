/**
 * Minimal types for QueueUp API interaction.
 */

/**
 * QueueUp API response envelope for successful requests.
 */
export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
}

/**
 * QueueUp API response envelope for error requests.
 */
export interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * Union type for any QueueUp API response.
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Custom error type for API failures.
 */
export class ApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly isNetworkError: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Create an ApiError from a QueueUp error response.
   */
  static fromApiErrorResponse(error: ApiErrorResponse['error']): ApiError {
    return new ApiError(error.message, error.code);
  }

  /**
   * Create an ApiError for network/connection failures.
   */
  static networkError(message: string, originalError?: Error): ApiError {
    const err = new ApiError(
      message,
      'NETWORK_ERROR',
      undefined,
      true
    );
    err.stack = originalError?.stack;
    return err;
  }

  /**
   * Create an ApiError from an HTTP status code.
   */
  static fromHttpStatus(statusCode: number, message?: string): ApiError {
    const defaultMessage = `HTTP ${statusCode}`;
    return new ApiError(
      message || defaultMessage,
      `HTTP_${statusCode}`,
      statusCode
    );
  }
}

/**
 * Session response from GET /api/v1/session/
 * This is a minimal type for the connectivity probe.
 */
export interface SessionResponse {
  // The session endpoint returns different data based on auth state
  // We only need to know if it succeeded (200) or requires auth (401)
  // The actual data structure may vary, so we keep it generic for now
  [key: string]: unknown;
}

/**
 * Server connectivity status.
 */
export type ServerStatus = 
  | { state: 'checking' }
  | { state: 'reachable'; requiresAuth: boolean }
  | { state: 'unreachable'; error: string };
