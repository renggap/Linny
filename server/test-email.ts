import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function sendTestEmail() {
    console.log('🧪 Sending test email...');
    console.log('Email Enabled:', process.env.EMAIL_ENABLED);
    console.log('SMTP Host:', process.env.EMAIL_HOST);
    console.log('SMTP Port:', process.env.EMAIL_PORT);
    console.log('SMTP User:', process.env.EMAIL_USER);
    console.log('From:', process.env.EMAIL_FROM);
    console.log('');

    // Check if email is enabled
    if (process.env.EMAIL_ENABLED !== 'true') {
        console.error('❌ Email is not enabled. Set EMAIL_ENABLED=true in .env');
        process.exit(1);
    }

    // Validate email configuration
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error('❌ Email configuration incomplete. Please check EMAIL_* environment variables.');
        process.exit(1);
    }

    const testEmailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #5E6AD2; color: white; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 30px 20px; background: #f9f9f9; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧪 Neo Linear - Test Email</h1>
        </div>
        <div class="content">
          <h2>Halo Kak! 👋</h2>
          <p>Ini adalah email test dari Neo Linear buat ngecek SMTP configuration udah bener atau belum.</p>
          <p>Kalau kakak terima email ini, berarti konfigurasi SMTP udah berhasil dan siap dipakai! 🎉</p>
          <p><strong>Detail Konfigurasi:</strong></p>
          <ul>
            <li>SMTP Host: ${process.env.EMAIL_HOST}</li>
            <li>SMTP Port: ${process.env.EMAIL_PORT}</li>
            <li>From: ${process.env.EMAIL_FROM}</li>
          </ul>
          <p>Semoga harinya menyenangkan ya kak! 😊</p>
        </div>
        <div class="footer">
          <p>Neo Linear - Project Management Tool</p>
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        // Create transporter
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: parseInt(process.env.EMAIL_PORT || '587') === 465, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        console.log('✅ Transporter created successfully');

        // Send email
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: 'renggaworkspace@gmail.com',
            subject: '🧪 Test Email dari Neo Linear',
            html: testEmailHTML,
            text: 'Halo Kak! Ini adalah email test dari Neo Linear buat ngecek SMTP configuration udah bener atau belum.',
        });

        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Sent to: renggaworkspace@gmail.com');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to send test email:', error);
        process.exit(1);
    }
}

sendTestEmail();
