import { describe, it, expect } from 'vitest';
import { generateTOTPCode } from '../../server/auth/email';

describe('crypto RNG', () => {
  it('generateTOTPCode returns a 6-digit string', () => {
    const code = generateTOTPCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('generateTOTPCode returns distinct values across calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateTOTPCode());
    expect(seen.size).toBeGreaterThan(900);
  });
});
