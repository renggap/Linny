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

  it('removes token from localStorage on clearTokens', () => {
    const fn = src.match(/function clearTokens[\s\S]*?^\}/m)?.[0] ?? '';
    expect(fn).toMatch(/removeTokenFromStorage\(\)/);
    expect(src).toMatch(/window\.localStorage\.removeItem/);
  });

  it('guards against non-browser environments (typeof window check)', () => {
    expect(src).toMatch(/typeof window\s*===?\s*['"]undefined['"]/);
  });

  it('initializes accessToken from storage (not bare null)', () => {
    expect(src).toMatch(/let accessToken[\s\S]*?=\s*readTokenFromStorage\(\)/);
  });
});
