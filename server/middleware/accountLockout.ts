interface FailedAttempt {
    count: number;
    lockedUntil: number | null;
    lastAttempt: number;
}

// Store failed login attempts in memory (in production, use Redis)
const failedAttempts = new Map<string, FailedAttempt>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Clean up old failed attempt records
 */
function cleanupOldRecords(): void {
    const now = Date.now();
    for (const [email, data] of failedAttempts.entries()) {
        // Remove records that are older than the attempt window and not locked
        if (data.lastAttempt < now - ATTEMPT_WINDOW_MS && !data.lockedUntil) {
            failedAttempts.delete(email);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupOldRecords, 5 * 60 * 1000);

/**
 * Check if account is locked
 */
export function isAccountLocked(email: string): boolean {
    const attempts = failedAttempts.get(email);
    if (!attempts || !attempts.lockedUntil) {
        return false;
    }

    return attempts.lockedUntil > Date.now();
}

/**
 * Get remaining lockout time in seconds
 */
export function getLockoutTimeRemaining(email: string): number {
    const attempts = failedAttempts.get(email);
    if (!attempts || !attempts.lockedUntil) {
        return 0;
    }

    const remaining = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
    return Math.max(0, remaining);
}

/**
 * Record failed login attempt
 */
export function recordFailedAttempt(email: string): void {
    const now = Date.now();
    const existing = failedAttempts.get(email) || {
        count: 0,
        lockedUntil: null,
        lastAttempt: now
    };

    // Reset if outside attempt window
    if (existing.lastAttempt < now - ATTEMPT_WINDOW_MS) {
        existing.count = 0;
    }

    existing.count++;
    existing.lastAttempt = now;

    // Lock account if max attempts reached
    if (existing.count >= MAX_ATTEMPTS) {
        existing.lockedUntil = now + LOCKOUT_DURATION_MS;
        const [localPart, domain] = email.split('@');
        const redacted = `${localPart?.slice(0, 2)}**@${domain?.length ?? 0}-chars`;
        console.warn(`🔒 Account locked for ${redacted} due to too many failed attempts`);
    }

    failedAttempts.set(email, existing);
}

/**
 * Reset failed login attempts (called on successful login)
 */
export function resetFailedAttempts(email: string): void {
    failedAttempts.delete(email);
}
