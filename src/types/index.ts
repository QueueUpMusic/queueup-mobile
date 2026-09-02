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

export interface SeasonSummary {
  id: number;
  name: string;
  description: string;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  banner_url: string | null;
  recap?: { available: boolean; viewed: boolean };
}

export interface RoundHostSummary {
  display_name: string;
  picture_url: string | null;
}

export interface RoundSummary {
  id: number;
  season: SeasonSummary;
  prompt: string;
  details: string;
  state: string;
  submission_opens: string | null;
  submission_deadline: string | null;
  voting_deadline: string | null;
  reveal_at: string | null;
  archived: boolean;
  submission_count: number;
  rating_count: number;
  host: RoundHostSummary | null;
  playlist_url?: string | null;
}

export interface SubmissionTrack {
  id: number;
  spotify_track_id: string;
  spotify_uri: string;
  spotify_url: string;
  title: string;
  artist: string;
  album: string;
  album_art_url: string | null;
  preview_url: string | null;
}

export interface SpotifySearchTrack {
  id: string;
  uri: string;
  url: string;
  title: string;
  artist: string;
  artist_ids: string[];
  album: string;
  art: string;
  preview: string;
  explicit: boolean;
  isrc: string;
  used: boolean;
  available: boolean;
}

export interface SpotifySearchResponse {
  tracks: SpotifySearchTrack[];
}

export interface SubmissionStatusResponse {
  round: RoundSummary;
  submission: SubmissionTrack | null;
  can_submit: boolean;
  submission_rules_accepted: boolean;
  submission_bonus_points: number;
}

export interface RoundBallot {
  saved_scores: Record<string, number>;
  eligible_count: number;
  voted_count: number;
  complete: boolean;
  no_votable_songs: boolean;
  eligible_submissions?: SubmissionTrack[];
}

export interface VoteMutationResponse {
  vote: {
    id: number;
    submission_id: number;
    score: number;
    created: boolean;
  };
  ballot: RoundBallot;
}

export interface UserSummary {
  id: number;
  username: string;
  display_name: string;
  picture_url: string | null;
}

export interface RevealedSubmission extends SubmissionTrack {
  submitter: UserSummary;
  average_score: number;
  vote_count: number;
  place?: number;
  tied?: boolean;
  place_label?: string;
}

export interface RoundDetailResponse {
  round: RoundSummary;
  my_submission: SubmissionTrack | null;
  ballot: RoundBallot;
  show_voting_guide: boolean;
  results?: RevealedSubmission[];
}

export interface HomepageCountdown {
  id: number;
  title: string;
  target_at: string;
  state: 'counting_down' | 'expired';
}

export interface DashboardResponse {
  cards: { kind: 'current' | 'results'; round: RoundSummary }[];
  current_round: RoundSummary | null;
  results_round: RoundSummary | null;
  my_submission: SubmissionTrack | null;
  countdowns: HomepageCountdown[];
}

export interface SeasonsResponse {
  seasons: SeasonSummary[];
}

export interface ArchiveResponse {
  seasons?: (SeasonSummary & { recap: { available: boolean; viewed: boolean } })[];
  rounds: RoundSummary[];
}

export interface RecapSong extends SubmissionTrack {
  art?: string | null;
  prompt?: string;
  place?: number;
  place_label?: string;
  average?: number;
  ratings?: number;
  low?: number;
  high?: number;
  disagreement?: number;
}

export interface RecapStanding {
  player: UserSummary;
  score: number;
  place: number;
  tied: boolean;
  place_label: string;
}

export type RecapSlide =
  | { kind: 'intro'; round_count: number; song_count: number }
  | { kind: 'standing'; place: number; league_size: number; points: number; podiums: number; wins: number; top_half: number; played: number }
  | { kind: 'best_submission'; song: RecapSong }
  | { kind: 'taste'; song: RecapSong | null; favorite_artist: string | null; favorite_genre: string | null }
  | { kind: 'voting'; average: number; league_average: number | null; five_stars: number; ratings: number; personality: string | null }
  | { kind: 'story'; best_finish: string; round_prompt: string; top_half: number; played: number }
  | { kind: 'chaos'; song: RecapSong }
  | { kind: 'league'; song_count: number; rating_count: number; round_count: number; top_song: RecapSong | null }
  | { kind: 'summary'; standing: RecapStanding | null; best_submission: SubmissionTrack | null; song_of_season: SubmissionTrack | null; favorite_artist: string | null; podiums: number; wins: number; round_count: number };

export interface SeasonRecapResponse {
  season: SeasonSummary;
  slides: RecapSlide[];
  summary: Extract<RecapSlide, { kind: 'summary' }>;
  viewed: true;
}

export interface LeaderboardEntry {
  place: number;
  tied: boolean;
  player: UserSummary;
  vote_score: number;
  submission_bonus: number;
  rounds_played: number;
  total_score: number;
}

export interface LeaderboardResponse {
  season: SeasonSummary | null;
  seasons: SeasonSummary[];
  leaderboard: LeaderboardEntry[];
}

export interface ProfileMetrics {
  wins: number;
  podiums: number;
  round_count: number;
  average_received: number;
  average_placement: number;
  win_rate: number;
}

export interface ProfileBadge {
  key: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  hidden: boolean;
}

export interface ProfilePrestigeBadge {
  id: number;
  name: string;
  description: string;
  icon: string;
}

export interface ProfileResponse {
  player: UserSummary;
  metrics: ProfileMetrics;
  favorite_genres: [string, number][];
  most_submitted_artists: [string, number][];
  history: RevealedSubmission[];
  season: SeasonSummary | null;
  seasons: SeasonSummary[];
  badges: ProfileBadge[];
  prestige_badges: ProfilePrestigeBadge[];
}

export interface ProfileUpdateResponse {
  display_name: string;
  email: string;
  picture_url: string | null;
}

export interface ProfilePictureResponse {
  picture_url: string | null;
  removed?: boolean;
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
