/**
 * Manage tokens created on cook.tg
 * In production, this should be a backend API
 * For now, we use localStorage as a fallback
 */

const STORAGE_KEY = 'cook_tg_tokens';

/**
 * Add a token address to the list of tokens created on cook.tg
 */
export function addCookToken(tokenAddress: string): void {
  try {
    const existing = getCookTokens();
    if (!existing.includes(tokenAddress)) {
      existing.push(tokenAddress);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      }
    }
  } catch (error) {
    console.error('Failed to save cook token:', error);
  }
}

/**
 * Get list of token addresses created on cook.tg
 */
export function getCookTokens(): string[] {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Failed to load cook tokens:', error);
  }
  return [];
}

/**
 * Check if a token was created on cook.tg
 */
export function isCookToken(tokenAddress: string): boolean {
  const tokens = getCookTokens();
  return tokens.includes(tokenAddress);
}

