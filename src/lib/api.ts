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
 * Parse JSON response, handling potential parse errors.
 */
async function parseJson<T>(response: Response): Promise<T> {
  try {
    return await response.json();
  } catch {
    throw ApiError.networkError('Invalid JSON response');
  }
}

/**
 * Handle API response based on HTTP status and QueueUp envelope.
 */
async function handleResponse<T>(
  response: Response
): Promise<ApiSuccessResponse<T>> {
  const status = response.status;

  // Network-level failures (no response body or can't parse)
  if (!response.ok) {
    // 401 is an auth failure, but the server is reachable
    // 404, 500, etc. are server errors
    
    // Try to parse the error envelope
    try {
      const body = await response.text();
      if (body) {
        try {
          const errorEnvelope = JSON.parse(body) as ApiErrorResponse;
          if (errorEnvelope.ok === false && errorEnvelope.error) {
            throw ApiError.fromApiErrorResponse(errorEnvelope.error);
          }
        } catch {
          // Not a QueueUp error envelope, use HTTP status
        }
      }
    } catch {
      // Can't read body, use HTTP status
    }
    
    // For 401, we want to distinguish it from other errors
    // but it still means the server is reachable
    if (status === 401) {
      throw ApiError.fromHttpStatus(401, 'Authentication required');
    }
    
    throw ApiError.fromHttpStatus(status);
  }

  // Parse and validate the QueueUp success envelope
  const body = await parseJson<ApiResponse<T>>(response);
  
  if (body.ok === true && 'data' in body) {
    return body;
  }
  
  if (body.ok === false && 'error' in body) {
    throw ApiError.fromApiErrorResponse(body.error);
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

/**
 * POST request to the QueueUp API.
 * Structured for future use - not implemented yet.
 */
export async function apiPost<T, U = unknown>(
  path: string,
  body: U
): Promise<T> {
  const url = buildUrl(path);
  
  try {
    const response = await fetch(url, {
      ...defaultFetchOptions,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
 * PATCH request to the QueueUp API.
 * Structured for future use - not implemented yet.
 */
export async function apiPatch<T, U = unknown>(
  path: string,
  body: U
): Promise<T> {
  const url = buildUrl(path);
  
  try {
    const response = await fetch(url, {
      ...defaultFetchOptions,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
 * DELETE request to the QueueUp API.
 * Structured for future use - not implemented yet.
 */
export async function apiDelete<T>(path: string): Promise<T> {
  const url = buildUrl(path);
  
  try {
    const response = await fetch(url, {
      ...defaultFetchOptions,
      method: 'DELETE',
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
