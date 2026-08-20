/**
 * QueueUp API client.
 * 
 * All API requests use the centralized server configuration.
 * Components should never manually prepend server URLs.
 */

import { getApiBaseUrl } from '@/config/server';
import {
  ApiError,
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
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
          throw ApiError.fromApiErrorResponse(errorEnvelope.error, status);
        }
      } catch {
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
      throw ApiError.fromApiErrorResponse(body.error, status);
    }
  } catch {
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
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
