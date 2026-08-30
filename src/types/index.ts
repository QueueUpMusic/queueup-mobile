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
  errors?: Record<string, string[] | { message: string; code?: string }[] | string>;
}

export interface CsrfResponse {
  csrf_token: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface SignupPayload {
  display_name: string;
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  agree_to_terms: boolean;
}

export interface OnboardingResponse {
  season_welcome: { season_id: number; name: string; acknowledged: boolean } | null;
  voting_guide_seen: boolean;
  submission_rules_accepted: boolean;
}

/** User data returned by the session endpoint. Extra backend fields are preserved. */
export interface SessionUser {
  id: number;
  username: string;
  display_name: string;
  email: string;
  approved: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  [key: string]: unknown;
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
    public readonly isNetworkError: boolean = false,
    public readonly fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Create an ApiError from a QueueUp error response.
   * Optionally includes the HTTP status code for context.
   */
  static fromApiErrorResponse(
    error: ApiErrorResponse['error'],
    statusCode?: number,
    fieldErrors?: ApiErrorResponse['errors']
  ): ApiError {
    const normalizedErrors = fieldErrors
      ? Object.fromEntries(Object.entries(fieldErrors).map(([field, messages]) => [field, (Array.isArray(messages) ? messages : [messages]).map((message) => typeof message === 'string' ? message : message.message)]))
      : undefined;
    return new ApiError(error.message, error.code, statusCode, false, normalizedErrors);
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
  authenticated: true;
  user: SessionUser;
}

export type AuthStatus = 'booting' | 'logged_out' | 'pending' | 'approved' | 'network_error';

/**
 * Server connectivity status.
 */
export type ServerStatus = 
  | { state: 'checking' }
  | { state: 'reachable'; requiresAuth: boolean }
  | { state: 'unreachable'; error: string };
