import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

/**
 * Email Service (SMTP Implementation)
 *
 * DEEP REASONING CHAIN:
 * Email service enables:
 * 1. Email verification for account security
 * 2. Password reset for account recovery
 * 3. 2FA codes for additional security
 *
 * Uses nodemailer with SMTP configuration from environment variables.
 * Gracefully degrades if email is disabled or misconfigured.
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

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
    if (!config.emailEnabled) {
        return null;
    }

    if (transporter) {
        return transporter;
    }

    // Validate email configuration
    if (!config.emailHost || !config.emailPort || !config.emailUser || !config.emailPassword) {
        console.warn('⚠️  Email configuration incomplete. Please check EMAIL_* environment variables.');
        return null;
    }

    try {
        transporter = nodemailer.createTransport({
            host: config.emailHost,
            port: config.emailPort,
            secure: config.emailPort === 465, // true for 465, false for other ports
            auth: {
                user: config.emailUser,
                pass: config.emailPassword,
            },
        });

        console.log('✅ Email transporter initialized successfully');
        return transporter;
    } catch (error) {
        console.error('❌ Failed to create email transporter:', error);
        return null;
    }
}

/**
 * Send email via SMTP
 * Falls back to console logging if email is disabled or misconfigured
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
    const mailTransporter = getTransporter();

    if (!mailTransporter) {
        // Fallback to console logging if email is not configured
        console.log('\n📧 EMAIL LOG (Email disabled or not configured):');
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
        return;
    }

    try {
        const mailOptions = {
            from: config.emailFrom || config.emailUser,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        };

        const info = await mailTransporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        // Log email content for debugging
        console.log('\n📧 Failed Email Content:');
        console.log('─────────────────────────────────────');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log('─────────────────────────────────────\n');
        throw error; // Re-throw to allow caller to handle the error
    }
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
          <h1>Neo Linear</h1>
        </div>
        <div class="content">
          <h2>Verifikasi Email Kakak</h2>
          <p>Makasih sudah daftar! Tolong verifikasi email kakak dengan klik tombol di bawah ini ya:</p>
          <center><a href="${verifyUrl}" class="button">Verifikasi Email</a></center>
          <p>Atau copy-paste link ini ke browser kakak:</p>
          <p style="word-break: break-all; color: #5E6AD2;">${verifyUrl}</p>
          <p>Link ini bakal kadaluarsa dalam 24 jam.</p>
        </div>
        <div class="footer">
          <p>Kalau kakak nggak bikin akun, bisa diabaikan aja email ini.</p>
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
          <h1>Neo Linear</h1>
        </div>
        <div class="content">
          <h2>Reset Password Kakak</h2>
          <p>Kami ada request buat reset password kakak. Klik tombol di bawah ini buat bikin password baru:</p>
          <center><a href="${resetUrl}" class="button">Reset Password</a></center>
          <p>Atau copy-paste link ini ke browser kakak:</p>
          <p style="word-break: break-all; color: #5E6AD2;">${resetUrl}</p>
          <p>Link ini bakal kadaluarsa dalam 1 jam.</p>
        </div>
        <div class="footer">
          <p>Kalau kakak nggak request reset password, bisa diabaikan aja email ini.</p>
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
          <h1>Neo Linear</h1>
        </div>
        <div class="content">
          <h2>Setup Autentikasi Dua Faktor</h2>
          <p>Scan QR code ini pake authenticator app kakak:</p>
          <div class="code">${secret}</div>
          <p>Atau masukin kode ini manual:</p>
          <div class="code">${secret}</div>
          <div class="backup-codes">
            <h3>⚠️ Simpan Kode Backup Ini</h3>
            <p>Simpan kode-kode ini di tempat aman. Kakak bisa pake ini kalau sewaktu-waktu nggak bisa akses authenticator app:</p>
            <ul>
              ${backupCodes.map(code => `<li>${code}</li>`).join('')}
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>Simpan kode-kode ini dengan aman ya kak. Setiap kode cuma bisa dipake sekali aja.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate team invitation email HTML
 */
export function generateInvitationEmailHTML(teamName: string, role: string, inviteToken: string): string {
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${inviteToken}`;

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
          <h1>Neo Linear</h1>
        </div>
        <div class="content">
          <h2>Kakak Diundang ke ${teamName}</h2>
          <p>Kakak udah diundang buat gabung ke team <strong>${teamName}</strong> sebagai <strong>${role}</strong>.</p>
          <p>Untuk terima undangan ini dan gabung ke workspace, klik tombol di bawah ini ya:</p>
          <center><a href="${inviteUrl}" class="button">Terima Undangan</a></center>
          <p>Atau copy-paste link ini ke browser kakak:</p>
          <p style="word-break: break-all; color: #5E6AD2;">${inviteUrl}</p>
          <p>Undangan ini bakal kadaluarsa dalam 7 hari.</p>
        </div>
        <div class="footer">
          <p>Kalau kakak belum punya akun, bisa bikin dulu setelah klik link tadi.</p>
          <p>Kalau kakak nggak ngira ada undangan ini, bisa diabaikan aja.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
