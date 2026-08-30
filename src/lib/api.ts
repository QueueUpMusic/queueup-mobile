/**
 * QueueUp API client.
 * 
 * All API requests use the centralized server configuration.
 * Components should never manually prepend server URLs.
 */

import { getApiBaseUrl, getCurrentServer } from '@/config/server';
import { Platform } from 'react-native';
import {
  ApiError,
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
  CsrfResponse,
  LoginPayload,
  OnboardingResponse,
  SignupPayload,
  SessionResponse,
} from '@/types';

/**
 * Default fetch options for all API requests.
 * Uses credentials: 'include' to support cookie-based auth.
 */
const defaultFetchOptions: RequestInit = {
  credentials: 'include',
};

/**
 * Build a full URL for an API endpoint path.
 */
function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  // Remove leading slash from path to avoid double slashes
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${normalizedPath}`;
}

/**
 * Handle API response based on HTTP status and QueueUp envelope.
 */
async function handleResponse<T>(
  response: Response
): Promise<ApiSuccessResponse<T>> {
  const status = response.status;

  // Try to get the response body text first
  let bodyText: string | null = null;
  try {
    bodyText = await response.text();
  } catch {
    // Can't read body
  }

  // Network-level failures (non-2xx response)
  if (!response.ok) {
    // Try to parse as QueueUp error envelope first
    if (bodyText) {
      try {
        const errorEnvelope = JSON.parse(bodyText) as ApiErrorResponse;
        if (errorEnvelope.ok === false && errorEnvelope.error) {
          // Preserve backend error.code, error.message, and HTTP statusCode
          throw ApiError.fromApiErrorResponse(errorEnvelope.error, status, errorEnvelope.errors);
        }
      } catch (error) {
        if (error instanceof ApiError) throw error;
        // Not valid JSON or not a QueueUp error envelope
      }
    }

    // For 401, preserve the HTTP status distinction
    if (status === 401) {
      throw ApiError.fromHttpStatus(401, 'Authentication required');
    }

    // Generic HTTP error for other non-2xx responses
    throw ApiError.fromHttpStatus(status);
  }

  // Success response - parse and validate the QueueUp envelope
  if (!bodyText) {
    throw ApiError.networkError('Empty response body');
  }

  try {
    const body = JSON.parse(bodyText) as ApiResponse<T>;
    
    if (body.ok === true && 'data' in body) {
      return body;
    }
    
    if (body.ok === false && 'error' in body) {
      throw ApiError.fromApiErrorResponse(body.error, status, body.errors);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Not valid JSON or not a QueueUp envelope
  }

  // Unexpected response shape
  throw ApiError.networkError('Invalid API response format');
}

/**
 * Generic GET request to the QueueUp API.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const url = buildUrl(path);
  
  try {
    const response = await fetch(url, {
      ...defaultFetchOptions,
      method: 'GET',
    });
    
    const result = await handleResponse<T>(response);
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error) {
      throw ApiError.networkError(error.message, error);
    }
    throw ApiError.networkError('Unknown API error');
  }
}

/**
 * Check server connectivity using the session endpoint.
 * 
 * Returns:
 * - { state: 'reachable', requiresAuth: boolean } if server responds
 * - { state: 'unreachable', error: string } if network/DNS/TLS failure
 * 
 * Note: 401 means the server is reachable but requires authentication.
 */
export async function checkServerConnectivity(): Promise<{
  reachable: boolean;
  requiresAuth: boolean;
  error?: string;
}> {
  const url = buildUrl('session/');
  
  try {
    const response = await fetch(url, {
      ...defaultFetchOptions,
      method: 'GET',
    });
    
    // Server responded - it's reachable
    // 200 = authenticated or anonymous session exists
    // 401 = authentication required (but server is reachable)
    // Any other status = server error but still reachable
    return {
      reachable: true,
      requiresAuth: response.status === 401,
    };
  } catch (error) {
    // Network, DNS, TLS, or other fetch errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      reachable: false,
      requiresAuth: false,
      error: errorMessage,
    };
  }
}

/**
 * GET request to the session endpoint.
 * Used as the primary connectivity probe.
 * 
 * This will:
 * - Return session data on 200 (authenticated user)
 * - Throw ApiError with code 'HTTP_401' on 401 (requires auth)
 * - Throw ApiError with code 'NETWORK_ERROR' on network failures
 */
export async function getSession(): Promise<SessionResponse> {
  return apiGet<SessionResponse>('session/');
}

export async function getOnboarding(): Promise<OnboardingResponse> {
  return apiGet<OnboardingResponse>('onboarding/');
}

let csrfToken: string | null = null;

export function clearCsrfToken(): void {
  csrfToken = null;
}

export async function getCsrfToken(): Promise<string> {
  const result = await apiGet<CsrfResponse>('auth/csrf/');
  if (!result.csrf_token) throw ApiError.networkError('CSRF endpoint did not return a token');
  csrfToken = result.csrf_token;
  return csrfToken;
}

async function ensureCsrfToken(): Promise<string> {
  return csrfToken ?? getCsrfToken();
}

export async function apiMutation<T, U = unknown>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: U): Promise<T> {
  const token = await ensureCsrfToken();
  try {
    const response = await fetch(buildUrl(path), {
      ...defaultFetchOptions,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': token,
        // Django requires a same-origin check for HTTPS CSRF-protected requests.
        // Native fetch does not supply the browser Origin header automatically.
        ...(Platform.OS === 'web' ? {} : { Origin: getCurrentServer() }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return (await handleResponse<T>(response)).data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.networkError(error instanceof Error ? error.message : 'Unknown API error');
  }
}

export function login(payload: LoginPayload): Promise<SessionResponse> {
  return apiMutation<SessionResponse>('auth/login/', 'POST', payload);
}

export function signup(payload: SignupPayload): Promise<SessionResponse> {
  return apiMutation<SessionResponse>('auth/signup/', 'POST', payload);
}

export function logout(): Promise<unknown> {
  return apiMutation('auth/logout/', 'POST');
}
