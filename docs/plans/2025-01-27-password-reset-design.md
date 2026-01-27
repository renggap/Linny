# Password Reset Flow Design

**Date:** 2025-01-27
**Status:** Approved
**Approach:** Simple 2-step flow with email confirmation

## Overview
Add password reset functionality to the login area with email-based confirmation. Users can request a password reset link via email and set a new password through a dedicated reset page.

## User Flow

### Step 1: Request Reset (from Login Page)
- Click "Lupa Password?" link below password field in login form
- Opens modal with email input
- Submit: "Kirim Link Reset"
- Success: "Cek email kakak buat link reset password-nya ya"
- Auto-return to login after 3 seconds

### Step 2: Reset Password (dedicated page)
- Route: `/reset-password?token=xxx`
- Two password fields: "Password Baru" + "Konfirmasi Password"
- Submit: "Reset Password"
- Success: Checkmark animation + "Password berhasil diupdate kak!" + "Lanjut ke Login" button

## Backend API

### POST /api/v1/auth/forgot-password
**Request:**
```json
{
  "email": "string"
}
```

**Response:**
```json
{
  "message": "Kalo ada akun pake email ini, link reset udah dikirim ya kak"
}
```

**Logic:**
1. Check if user exists with that email
2. Generate 64-char hex token
3. Save to `PasswordResetToken` (userId, token, expiresAt: 1hr)
4. Send email with reset link
5. Always return success (don't reveal if email exists)

### POST /api/v1/auth/reset-password
**Request:**
```json
{
  "token": "string",
  "newPassword": "string"
}
```

**Response:**
```json
{
  "message": "Password berhasil diupdate kak!"
}
```

**Logic:**
1. Validate token exists and not expired
2. Hash new password
3. Update user's passwordHash
4. Delete used token
5. Return success

## Frontend Components

### New Files
- `components/PasswordResetModal.tsx` - Email input modal
- `components/ResetPasswordPage.tsx` - Reset password page
- `components/PasswordResetSuccess.tsx` - Success confirmation

### Modified Files
- `components/Auth.tsx` - Add "Lupa Password?" link
- `services/api.ts` - Add password reset methods
- `router.tsx` - Add `/reset-password` route

## Error Messages (Bahasa Indonesia)

**Forgot Password:**
- "Email wajib diisi kak"
- "Kalo ada akun pake email ini, link reset udah dikirim ya kak"
- "Gagal kirim email reset. Coba lagi nanti ya kak"

**Reset Password:**
- "Link reset nggak valid atau udah kadaluarsa kak"
- "Password-nya beda kak"
- "Password minimal 8 karakter ya kak"
- "Link reset udah kadaluarsa. Request yang baru ya kak"
- "Gagal ganti password. Coba lagi nanti ya kak"

## Security Considerations
- Token expiry: 1 hour
- Single-use tokens (deleted after use)
- Rate limiting: 3 requests per email per hour
- Email enumeration protection (always return same message)
- Invalidate old tokens on new request

## Validation Rules
- Email: Valid format
- New Password: Min 8 characters
- Confirm Password: Must match
- Token: Must exist, not expired, not used
