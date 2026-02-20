/** Rate limit for chat messages: requests per minute */
export const CHAT_RATE_LIMIT = 8;

/** Default token budget for context retrieval */
export const DEFAULT_CONTEXT_TOKENS = 4000;

/** Max tool call steps per chat turn */
export const MAX_TOOL_STEPS = 4;

/** Max message length */
export const MAX_MESSAGE_LENGTH = 32000;

/** Max artifact title length */
export const MAX_ARTIFACT_TITLE_LENGTH = 500;

/** Cache staleness threshold in milliseconds (5 minutes) */
export const CACHE_STALE_MS = 5 * 60 * 1000;
