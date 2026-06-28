import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAccountLocked,
  recordFailedAttempt,
  resetFailedAttempts,
  getLockoutTimeRemaining
} from '../../server/middleware/accountLockout';

describe('account lockout state machine', () => {
  beforeEach(() => {
    resetFailedAttempts('lockout-test@example.com');
  });

  it('is not locked initially', () => {
    expect(isAccountLocked('lockout-test@example.com')).toBe(false);
  });

  it('locks after 5 failed attempts', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('lockout-test@example.com');
    expect(isAccountLocked('lockout-test@example.com')).toBe(true);
  });

  it('reports remaining lockout time when locked', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('lockout-test@example.com');
    const remaining = getLockoutTimeRemaining('lockout-test@example.com');
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(15 * 60);
  });

  it('unlocks after resetFailedAttempts', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('lockout-test@example.com');
    resetFailedAttempts('lockout-test@example.com');
    expect(isAccountLocked('lockout-test@example.com')).toBe(false);
  });

  it('does not lock after only 4 attempts', () => {
    for (let i = 0; i < 4; i++) recordFailedAttempt('lockout-test@example.com');
    expect(isAccountLocked('lockout-test@example.com')).toBe(false);
  });
});
