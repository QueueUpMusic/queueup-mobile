/**
 * Centralized server configuration for QueueUp API.
 * 
 * This module provides a single source of truth for the current QueueUp server.
 * Future implementations can replace the current server with a user-selected value
 * from persistent storage without changing API call sites.
 */

const DEFAULT_SERVER = 'https://queueup.kingdmvr.com';
const API_VERSION = '/api/v1';

/**
 * Get the current QueueUp server hostname.
 * 
 * Priority:
 * 1. EXPO_PUBLIC_API_URL environment variable (if set)
 * 2. Default server (https://queueup.kingdmvr.com)
 */
export function getCurrentServer(): string {
  // EXPO_PUBLIC_API_URL may contain just the host or the full URL
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  
  if (!envUrl) {
    return DEFAULT_SERVER;
  }
  
  // Normalize: extract hostname if a full URL was provided
  try {
    // Handle cases where EXPO_PUBLIC_API_URL might be just the hostname
    // or a full URL with protocol
    let url: URL;
    
    if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
      url = new URL(envUrl);
    } else {
      // Assume it's a hostname, add https://
      url = new URL(`https://${envUrl}`);
    }
    
    return url.origin;
  } catch {
    // If URL parsing fails, fall back to default
    return DEFAULT_SERVER;
  }
}

/**
 * Get the full API base URL for the current QueueUp server.
 * 
 * Returns a normalized URL with trailing slash, e.g.:
 * https://queueup.kingdmvr.com/api/v1
 */
export function getApiBaseUrl(): string {
  const server = getCurrentServer();
  const base = new URL(API_VERSION, server);
  return base.toString();
}

/**
 * Get the current server hostname without protocol for display purposes.
 */
export function getServerHostname(): string {
  const server = getCurrentServer();
  try {
    const url = new URL(server);
    return url.hostname;
  } catch {
    return server;
  }
}
