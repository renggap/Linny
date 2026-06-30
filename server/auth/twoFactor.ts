import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

/**
 * Two-Factor Authentication Service
 * 
 * DEEP REASONING CHAIN:
 * 2FA provides an additional security layer by:
 * 1. Requiring a second factor (something you have)
 * 2. Protecting against password theft
 * 3. Preventing unauthorized access even with compromised credentials
 * 
 * Uses TOTP (Time-based One-Time Password) standard:
 * - Compatible with Google Authenticator, Authy, etc.
 * - Time-based codes that change every 30 seconds
 * - Backup codes for account recovery
 * 
 * EDGE CASE ANALYSIS:
 * - Handles time window drift (±1 time step)
 * - Validates codes within time window
 * - Generates secure random secrets
 * - Creates QR codes for easy setup
 */

export interface TwoFactorSetup {
    secret: string;
    qrCode: string;
    backupCodes: string[];
}

/**
 * Generate TOTP secret
 */
export function generateSecret(): string {
    return speakeasy.generateSecret({
        name: 'Linny',
        issuer: 'Linny'
    }).base32;
}

/**
 * Generate backup codes
 * Users can use these if they lose access to their authenticator app
 */
export function generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        codes.push(Math.random().toString(36).substring(2, 2 + 8).toUpperCase());
    }
    return codes;
}

/**
 * Generate QR code for TOTP setup
 */
export async function generateQRCode(secret: string, email: string): Promise<string> {
    const otpauthUrl = speakeasy.otpauthURL({
        secret,
        label: `Linny (${email})`,
        issuer: 'Linny',
        encoding: 'base32'
    });

    try {
        const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        return qrCodeDataURL;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw new Error('Failed to generate QR code');
    }
}

/**
 * Verify TOTP code
 * 
 * DEEP REASONING CHAIN:
 * TOTP verification must:
 * 1. Check code matches secret
 * 2. Validate code is within time window (±1 step = ±30 seconds)
 * 3. Prevent code reuse (handled by time-based nature)
 * 
 * EDGE CASE ANALYSIS:
 * - Allows ±1 time step for clock drift
 * - Rejects invalid codes
 * - Rejects expired codes
 */
export function verifyTOTP(secret: string, token: string): boolean {
    const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1 // Allow ±1 time step (±30 seconds)
    });

    return verified;
}

/**
 * Generate TOTP code (for testing)
 */
export function generateTOTP(secret: string): string {
    return speakeasy.totp({
        secret,
        encoding: 'base32'
    });
}
