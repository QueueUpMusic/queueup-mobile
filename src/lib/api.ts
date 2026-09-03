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
  ArchiveResponse,
  CsrfResponse,
  DashboardResponse,
  LeaderboardResponse,
  LoginPayload,
  OnboardingResponse,
  ProfileResponse,
  ProfilePictureResponse,
  ProfileUpdateResponse,
  RoundDetailResponse,
  SeasonsResponse,
  SeasonRecapResponse,
  SignupPayload,
  SessionResponse,
  StaffOverviewResponse,
  StaffRound,
  StaffSeasonsResponse,
  StaffRoundsResponse,
  StaffPlayersResponse,
  StaffBadgesResponse,
  StaffCountdown, StaffCountdownsResponse, StaffNotification, StaffNotificationsResponse, StaffRoundStatus,
  SpotifySearchResponse,
  SubmissionStatusResponse,
  SubmissionTrack,
  RoundBallot,
  VoteMutationResponse,
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

export async function getDashboard(): Promise<DashboardResponse> {
  return apiGet<DashboardResponse>('dashboard/');
}

export async function getSeasons(): Promise<SeasonsResponse> {
  return apiGet<SeasonsResponse>('seasons/');
}

export async function getArchive(): Promise<ArchiveResponse> {
  return apiGet<ArchiveResponse>('archive/');
}

export async function getSeasonRecap(seasonId: number): Promise<SeasonRecapResponse> {
  return apiGet<SeasonRecapResponse>(`seasons/${seasonId}/recap/`);
}

export async function getLeaderboard(seasonId?: number): Promise<LeaderboardResponse> {
  const query = seasonId === undefined ? '' : `?season=${encodeURIComponent(seasonId)}`;
  return apiGet<LeaderboardResponse>(`leaderboard/${query}`);
}

export function getStaffOverview(): Promise<StaffOverviewResponse> {
  return apiGet<StaffOverviewResponse>('staff/');
}

export function getStaffSeasons(): Promise<StaffSeasonsResponse> {
  return apiGet<StaffSeasonsResponse>('staff/seasons/');
}

export function getStaffRounds(query = ''): Promise<StaffRoundsResponse> { return apiGet<StaffRoundsResponse>(`staff/rounds/${query ? `?q=${encodeURIComponent(query)}` : ''}`); }
export function getStaffPlayers(query = ''): Promise<StaffPlayersResponse> { return apiGet<StaffPlayersResponse>(`staff/players/${query ? `?q=${encodeURIComponent(query)}` : ''}`); }
export function getStaffBadges(query = ''): Promise<StaffBadgesResponse> { return apiGet<StaffBadgesResponse>(`staff/badges/${query ? `?q=${encodeURIComponent(query)}` : ''}`); }
export function getStaffCountdowns(): Promise<StaffCountdownsResponse> { return apiGet<StaffCountdownsResponse>('staff/countdowns/'); }
export function saveStaffCountdown(payload: Record<string, unknown>, id?: number): Promise<StaffCountdown> { return apiMutation<StaffCountdown>(id ? `staff/countdowns/${id}/` : 'staff/countdowns/', id ? 'PATCH' : 'POST', payload); }
export function deleteStaffCountdown(id: number): Promise<{ id: number; deleted: boolean }> { return apiMutation<{ id: number; deleted: boolean }>(`staff/countdowns/${id}/`, 'DELETE'); }
export function getStaffNotifications(): Promise<StaffNotificationsResponse> { return apiGet<StaffNotificationsResponse>('staff/notifications/'); }
export function createStaffNotification(payload: Record<string, unknown>): Promise<{ notification: StaffNotification; delivery?: { sent?: number; skipped?: number } }> { return apiMutation<{ notification: StaffNotification; delivery?: { sent?: number; skipped?: number } }>('staff/notifications/', 'POST', payload); }
export function getStaffRoundStatus(id: number): Promise<StaffRoundStatus> { return apiGet<StaffRoundStatus>(`staff/rounds/${id}/status/`); }
export function staffRoundAction(id: number, action: string): Promise<{ round_id: number; action: string; state: string }> { return apiMutation(`staff/rounds/${id}/action/`, 'POST', { action }); }
export function archiveStaffRound(id: number): Promise<Record<string, unknown>> { return apiMutation(`staff/rounds/${id}/archive/`, 'POST'); }
export function deleteStaffRound(id: number): Promise<{ round_id: number; deleted: boolean }> { return apiMutation(`staff/rounds/${id}/delete/`, 'DELETE'); }
export function staffPlayerAction(id: number, action: string): Promise<Record<string, unknown>> { return apiMutation(`staff/players/${id}/action/`, 'POST', { action }); }
export function saveStaffBadge(payload: Record<string, unknown>, id?: number): Promise<{ id: number; name: string; slug: string }> { return apiMutation<{ id: number; name: string; slug: string }>(id ? `staff/badges/${id}/` : 'staff/badges/create/', id ? 'PATCH' : 'POST', payload); }
export function awardStaffBadge(badgeId: number, userId: number): Promise<{ badge_id: number; user_id: number; awarded: boolean }> { return apiMutation(`staff/badges/${badgeId}/award/${userId}/`, 'POST'); }

export function saveStaffRound(payload: Record<string, unknown>, roundId?: number): Promise<StaffRound> {
  return apiMutation<StaffRound>(roundId ? `staff/rounds/${roundId}/` : 'staff/rounds/create/', roundId ? 'PATCH' : 'POST', payload);
}

export function saveStaffSeason(payload: Record<string, unknown>, seasonId?: number): Promise<{ id: number; name: string }> {
  return apiMutation<{ id: number; name: string }>(seasonId ? `staff/seasons/${seasonId}/` : 'staff/seasons/create/', seasonId ? 'PATCH' : 'POST', payload);
}

export async function getProfile(username: string, seasonId?: number): Promise<ProfileResponse> {
  const query = seasonId === undefined ? '' : `?season=${encodeURIComponent(seasonId)}`;
  return apiGet<ProfileResponse>(`profiles/${encodeURIComponent(username)}/${query}`);
}

export function updateProfile(payload: { display_name?: string; email?: string }): Promise<ProfileUpdateResponse> {
  return apiMutation<ProfileUpdateResponse>('profile/', 'POST', payload);
}

export async function getRoundDetail(roundId: number): Promise<RoundDetailResponse> {
  return apiGet<RoundDetailResponse>(`rounds/${roundId}/`);
}

export async function getBallot(roundId: number): Promise<RoundBallot & { round_id: number }> {
  return apiGet<RoundBallot & { round_id: number }>(`rounds/${roundId}/ballot/`);
}

export function saveVote(roundId: number, submissionId: number, score: number): Promise<VoteMutationResponse> {
  return apiMutation<VoteMutationResponse>(`rounds/${roundId}/votes/${submissionId}/`, 'POST', { score });
}

export async function searchSpotify(query: string, roundId: number): Promise<SpotifySearchResponse> {
  return apiGet<SpotifySearchResponse>(`spotify/search/?q=${encodeURIComponent(query)}&round=${roundId}`);
}

export async function getSubmissionStatus(roundId: number): Promise<SubmissionStatusResponse> {
  return apiGet<SubmissionStatusResponse>(`rounds/${roundId}/submission/`);
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

export async function apiRawUpload<T>(path: string, body: ArrayBuffer, filename: string, contentType: string): Promise<T> {
  const token = await ensureCsrfToken();
  try {
    const response = await fetch(buildUrl(path), {
      ...defaultFetchOptions,
      method: 'POST',
      headers: {
        'X-CSRFToken': token,
        'X-QueueUp-Raw-Upload': '1',
        'X-QueueUp-Filename': encodeURIComponent(filename),
        'Content-Type': contentType,
        ...(Platform.OS === 'web' ? {} : { Origin: getCurrentServer() }),
      },
      body: body as BodyInit,
    });
    return (await handleResponse<T>(response)).data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.networkError(error instanceof Error ? error.message : 'Unknown API error');
  }
}

export async function uploadProfilePicture(asset: { uri: string; name: string; type: string }): Promise<ProfilePictureResponse> {
  let localResponse: Response;
  try {
    localResponse = await fetch(asset.uri);
  } catch (error) {
    throw ApiError.networkError(error instanceof Error ? error.message : 'Unable to read the selected image.', error instanceof Error ? error : undefined);
  }
  if (!localResponse.ok) throw ApiError.networkError('Unable to read the selected image.');
  const body = await localResponse.arrayBuffer();
  return apiRawUpload<ProfilePictureResponse>('profile/picture/', body, asset.name, asset.type);
}

export function removeProfilePicture(): Promise<ProfilePictureResponse> {
  return apiMutation<ProfilePictureResponse>('profile/picture/', 'DELETE');
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

export function acceptSubmissionRules(): Promise<{ submission_rules_accepted: boolean }> {
  return apiMutation('onboarding/submission-rules/', 'POST');
}

export function acknowledgeVotingGuide(): Promise<{ voting_guide_seen: boolean }> {
  return apiMutation('onboarding/voting-guide/', 'POST');
}

export function createSubmission(roundId: number, trackId: string): Promise<{ submission: SubmissionTrack; submission_bonus_points: number }> {
  return apiMutation(`rounds/${roundId}/submissions/`, 'POST', { track_id: trackId });
}
