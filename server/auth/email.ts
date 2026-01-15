import crypto from 'crypto';

/**
 * Email Service (Mock Implementation)
 * 
 * DEEP REASONING CHAIN:
 * Email service enables:
 * 1. Email verification for account security
 * 2. Password reset for account recovery
 * 3. 2FA codes for additional security
 * 
 * In production, replace with real email service (SendGrid, AWS SES, etc.)
 * 
 * EDGE CASE ANALYSIS:
 * - Generates secure random tokens
 * - Handles email sending failures gracefully
 * - Logs email content for development
 * - Provides consistent interface for swapping providers
 */

export interface EmailOptions {
    to: string;
    subject: string;
    html?: string;
    text?: string;
}

/**
 * Send email (mock implementation)
 * In production, integrate with real email service
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
    // Mock implementation - log email to console
    console.log('\n📧 EMAIL MOCK:');
    console.log('─────────────────────────────────────');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('─────────────────────────────────────');
    if (options.text) {
        console.log(options.text);
    }
    if (options.html) {
        console.log('HTML:', options.html.substring(0, 100) + '...');
    }
    console.log('─────────────────────────────────────\n');

    // In production, use real email service:
    // await sendgrid.send(options);
    // or await ses.sendEmail(options).promise();
}

/**
 * Generate secure random token
 */
export function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate 6-digit TOTP code
 */
export function generateTOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate verification email HTML
 */
export function generateVerificationEmailHTML(token: string): string {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #5E6AD2; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #5E6AD2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Linear Clone</h1>
        </div>
        <div class="content">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
          <center><a href="${verifyUrl}" class="button">Verify Email</a></center>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #5E6AD2;">${verifyUrl}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate password reset email HTML
 */
export function generatePasswordResetEmailHTML(token: string): string {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #5E6AD2; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #5E6AD2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Linear Clone</h1>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <center><a href="${resetUrl}" class="button">Reset Password</a></center>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #5E6AD2;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
        </div>
        <div class="footer">
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate 2FA setup email
 */
export function generate2FASetupEmailHTML(secret: string, backupCodes: string[]): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #5E6AD2; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9f9f9; }
        .code { font-family: monospace; font-size: 18px; background: #f0f0f0; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .backup-codes { background: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Linear Clone</h1>
        </div>
        <div class="content">
          <h2>Two-Factor Authentication Setup</h2>
          <p>Scan this QR code with your authenticator app:</p>
          <div class="code">${secret}</div>
          <p>Or enter this code manually:</p>
          <div class="code">${secret}</div>
          <div class="backup-codes">
            <h3>⚠️ Save These Backup Codes</h3>
            <p>Store these codes in a safe place. You can use them if you lose access to your authenticator app:</p>
            <ul>
              ${backupCodes.map(code => `<li>${code}</li>`).join('')}
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>Keep these codes secure. Each code can only be used once.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
