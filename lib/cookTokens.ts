/**
 * Manage tokens created on cook.tg
 * In production, this should be a backend API
 * For now, we use localStorage as a fallback
 */

const STORAGE_KEY = 'cook_tg_tokens';
const USER_TOKENS_KEY = 'cook_user_tokens'; // wallet address -> token addresses

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
 * Normalize address to EQ format
 */
function normalizeAddress(address: string): string {
  // Convert UQ to EQ format for consistency
  return address.replace(/^UQ/, 'EQ');
}

/**
 * Add a token to user's personal list
 */
export function addUserToken(walletAddress: string, tokenAddress: string): void {
  try {
    if (typeof window !== 'undefined') {
      // Normalize addresses for consistency
      const normalizedWallet = normalizeAddress(walletAddress);
      const normalizedToken = normalizeAddress(tokenAddress);
      
      const userTokens = getUserTokens(normalizedWallet);
      if (!userTokens.includes(normalizedToken)) {
        userTokens.push(normalizedToken);
        const allUserTokens = getAllUserTokens();
        allUserTokens[normalizedWallet] = userTokens;
        localStorage.setItem(USER_TOKENS_KEY, JSON.stringify(allUserTokens));
        console.log('Token saved to user list:', { wallet: normalizedWallet, token: normalizedToken });
      }
    }
  } catch (error) {
    console.error('Failed to save user token:', error);
  }
}

/**
 * Get user's tokens
 */
export function getUserTokens(walletAddress: string): string[] {
  try {
    if (typeof window !== 'undefined') {
      // Normalize address for consistency
      const normalizedWallet = normalizeAddress(walletAddress);
      const allUserTokens = getAllUserTokens();
      return allUserTokens[normalizedWallet] || [];
    }
  } catch (error) {
    console.error('Failed to load user tokens:', error);
  }
  return [];
}

/**
 * Get all user tokens (wallet -> tokens mapping)
 */
function getAllUserTokens(): Record<string, string[]> {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(USER_TOKENS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Failed to load all user tokens:', error);
  }
  return {};
}

/**
 * Get token deployment timestamp
 */
export function getTokenDeployedAt(tokenAddress: string): number | undefined {
  try {
    if (typeof window !== 'undefined') {
      const key = `cook_token_${tokenAddress}_deployed_at`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return parseInt(stored);
      }
      // If not found, set current timestamp for existing tokens
      const timestamp = Date.now();
      localStorage.setItem(key, timestamp.toString());
      return timestamp;
    }
  } catch (error) {
    console.error('Failed to get token deployed at:', error);
  }
  return undefined;
}

/**
 * Set token deployment timestamp
 */
export function setTokenDeployedAt(tokenAddress: string, timestamp?: number): void {
  try {
    if (typeof window !== 'undefined') {
      const key = `cook_token_${tokenAddress}_deployed_at`;
      localStorage.setItem(key, (timestamp || Date.now()).toString());
    }
  } catch (error) {
    console.error('Failed to set token deployed at:', error);
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

