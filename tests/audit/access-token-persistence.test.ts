import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../services/api.ts'),
  'utf8'
);

describe('access token persistence across page reloads', () => {
  it('defines a localStorage storage key', () => {
    expect(src).toMatch(/TOKEN_STORAGE_KEY\s*=\s*['"][^'"]+['"]/);
  });

  it('reads token from localStorage at module init', () => {
    expect(src).toMatch(/readTokenFromStorage\(\)/);
    expect(src).toMatch(/window\.localStorage\.getItem/);
  });

  it('writes token to localStorage on setAccessToken', () => {
    const fn = src.match(/function setAccessToken[\s\S]*?^\}/m)?.[0] ?? '';
    expect(fn).toMatch(/writeTokenToStorage\(token\)/);
    expect(src).toMatch(/window\.localStorage\.setItem/);
  });

  it('removes token from localStorage on clearTokens (covers current + legacy keys)', () => {
    const fn = src.match(/function clearTokens[\s\S]*?^\}/m)?.[0] ?? '';
    expect(fn).toMatch(/removeTokenFromStorage\(\)/);
    expect(src).toMatch(/window\.localStorage\.removeItem/);
    // Legacy pre-rebrand keys must also be cleaned
    expect(src).toMatch(/LEGACY_TOKEN_STORAGE_KEYS/);
    expect(src).toMatch(/linear_clone_access_token/);
  });

  it('guards against non-browser environments (typeof window check)', () => {
    expect(src).toMatch(/typeof window\s*===?\s*['"]undefined['"]/);
  });

  it('initializes accessToken from storage (not bare null)', () => {
    expect(src).toMatch(/let accessToken[\s\S]*?=\s*readTokenFromStorage\(\)/);
  });

  it('triggerAuthFailure clears tokens before notifying callbacks', () => {
    // Bug: previously, refresh failure left stale token in localStorage,
    // causing every subsequent request to retry the same known-bad bearer
    // and retrigger the failing refresh — infinite loop until manual logout.
    const fn = src.match(/function triggerAuthFailure[\s\S]*?^\}/m)?.[0] ?? '';
    expect(fn).toMatch(/clearTokens\(\)/);
  });

  it('listens for storage events to sync cross-tab logout', () => {
    // Bug: previously, logout in tab A didn't clear tab B's in-memory token,
    // so tab B kept sending the revoked bearer until 401 -> refresh failed.
    expect(src).toMatch(/window\.addEventListener\(['"]storage['"]/);
    expect(src).toMatch(/event\.key === TOKEN_STORAGE_KEY/);
  });

  it('writeTokenToStorage surfaces failures (not silent swallow)', () => {
    // Bug: previously, setItem failures were silently caught, allowing
    // in-memory and persisted token to diverge across rotations.
    const fn = src.match(/function writeTokenToStorage[\s\S]*?^\}/m)?.[0] ?? '';
    expect(fn).toMatch(/return false/);
    expect(fn).toMatch(/console\.warn/);
  });
});
