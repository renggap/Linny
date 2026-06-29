import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
    path.resolve(__dirname, '../../server/middleware/accountLockout.ts'),
    'utf8'
);

describe('accountLockout PII redaction', () => {
    it('does not log the raw email in the lockout warning', () => {
        // Must NOT interpolate the raw email variable into the warn message
        expect(src).not.toMatch(/console\.warn\(`?🔒 Account locked for email: \$\{email\}/);
    });

    it('logs a redacted identifier (prefix + length)', () => {
        const match = src.match(/console\.warn\([^)]+\)/gs) ?? [];
        const lockLine = match.find(m => m.toLowerCase().includes('locked')) ?? '';
        expect(lockLine.length).toBeGreaterThan(0);
        // Expect some redaction strategy
        expect(lockLine).toMatch(/redact|\${.*\.slice|hashed|prefix/i);
        // Must NOT contain raw email template literal
        expect(lockLine).not.toMatch(/\$\{email\}/);
    });
});
