import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from '../../server/auth/password';

describe('reset password strength parity', () => {
  it('rejects all-lowercase 8-char password (would have passed old reset check)', () => {
    const result = validatePasswordStrength('aaaaaaaa');
    expect(result.valid).toBe(false);
  });

  it('rejects 7-char password', () => {
    const result = validatePasswordStrength('Aa1aaaa');
    expect(result.valid).toBe(false);
  });

  it('accepts strong password', () => {
    const result = validatePasswordStrength('Str0ngP@ssword');
    expect(result.valid).toBe(true);
  });
});

describe('reset-password route uses validatePasswordStrength', () => {
  it('imports and calls validatePasswordStrength', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('./server/routes/auth.fastify.ts', 'utf8');
    // Confirm the import exists
    expect(src).toMatch(/import\s+\{[^}]*validatePasswordStrength[^}]*\}\s+from\s+['"][^'"]*\/auth\/password/);
    // Confirm the reset-password handler calls it
    const resetBlock = src.match(/fastify\.post\('\/reset-password'[\s\S]*?^\};/m)?.[0] ?? '';
    expect(resetBlock).toMatch(/validatePasswordStrength\(newPassword\)/);
  });
});
