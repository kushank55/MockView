/**
 * Current Gemini model IDs. 2.x Flash IDs are retired for new API keys
 * (404: use 3.5 Flash-Lite / 3.6 Flash instead).
 *
 * Flash-Lite is the default for interviews so repeated local testing
 * does not burn the small daily cap on the full Flash model.
 */
export const GEMINI_FAST = 'gemini-3.5-flash-lite';
export const GEMINI_DEFAULT = 'gemini-3.6-flash';
export const INTERVIEW_MODELS = [GEMINI_FAST, GEMINI_DEFAULT] as const;
