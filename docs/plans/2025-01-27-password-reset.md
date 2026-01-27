# Password Reset Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add email-based password reset flow to the login area with "Lupa Password?" link and dedicated reset page

**Architecture:** Simple 2-step flow: (1) User requests reset via email from login modal, (2) User clicks email link to set new password on dedicated page. Uses existing PasswordResetToken model and email service.

**Tech Stack:** React (frontend), Fastify (backend), Prisma (ORM), Nodemailer (email), JWT auth

---

## Task 1: Backend - Add Forgot Password Route

**Files:**
- Modify: `server/routes/auth.fastify.ts`
- Reference: `server/auth/email.ts` (email service)
- Reference: `server/prisma/schema.prisma` (PasswordResetToken model)

**Step 1: Add forgot-password endpoint**

Add to `server/routes/auth.fastify.ts` after existing auth routes:

```typescript
// Forgot password - send reset link via email
fastify.post('/forgot-password', async (request, reply) => {
  const { email } = request.body as { email: string };

  // Validate email
  if (!email || !email.includes('@')) {
    return reply.status(400).send({ message: 'Email wajib diisi kak' });
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success message (don't reveal if email exists)
    if (!user) {
      return reply.send({ message: 'Kalo ada akun pake email ini, link reset udah dikirim ya kak' });
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    // Generate reset token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt
      }
    });

    // Send reset email
    const emailHTML = generatePasswordResetEmailHTML(token);
    await sendEmail({
      to: user.email,
      subject: 'Reset Password Kakak',
      html: emailHTML
    });

    reply.send({ message: 'Kalo ada akun pake email ini, link reset udah dikirim ya kak' });
  } catch (error) {
    console.error('Forgot password error:', error);
    reply.status(500).send({ message: 'Gagal kirim email reset. Coba lagi nanti ya kak' });
  }
});
```

**Step 2: Add imports at top of file**

```typescript
import { generateToken, sendEmail, generatePasswordResetEmailHTML } from '../auth/email.js';
```

**Step 3: Test endpoint**

Run: `curl -X POST http://localhost:3001/api/v1/auth/forgot-password -H "Content-Type: application/json" -d '{"email":"test@example.com"}'`
Expected: `{"message":"Kalo ada akun pake email ini, link reset udah dikirim ya kak"}`

**Step 4: Commit**

```bash
git add server/routes/auth.fastify.ts
git commit -m "feat: add forgot-password endpoint with email reset link"
```

---

## Task 2: Backend - Add Reset Password Route

**Files:**
- Modify: `server/routes/auth.fastify.ts`
- Reference: `server/database.ts` (prisma instance)

**Step 1: Add reset-password endpoint**

Add to `server/routes/auth.fastify.ts` after forgot-password route:

```typescript
// Reset password with token
fastify.post('/reset-password', async (request, reply) => {
  const { token, newPassword } = request.body as { token: string; newPassword: string };

  // Validate input
  if (!token || !newPassword) {
    return reply.status(400).send({ message: 'Token dan password wajib diisi' });
  }

  if (newPassword.length < 8) {
    return reply.status(400).send({ message: 'Password minimal 8 karakter ya kak' });
  }

  try {
    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetToken) {
      return reply.status(400).send({ message: 'Link reset nggak valid atau udah kadaluarsa kak' });
    }

    // Check if token expired
    if (resetToken.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } });
      return reply.status(400).send({ message: 'Link reset udah kadaluarsa. Request yang baru ya kak' });
    }

    // Hash new password
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash }
    });

    // Delete used token
    await prisma.passwordResetToken.delete({ where: { token } });

    reply.send({ message: 'Password berhasil diupdate kak!' });
  } catch (error) {
    console.error('Reset password error:', error);
    reply.status(500).send({ message: 'Gagal ganti password. Coba lagi nanti ya kak' });
  }
});
```

**Step 2: Test endpoint manually**

First create a token via forgot-password, then:
Run: `curl -X POST http://localhost:3001/api/v1/auth/reset-password -H "Content-Type: application/json" -d '{"token":"<token_from_email>","newPassword":"newPassword123"}'`
Expected: `{"message":"Password berhasil diupdate kak!"}`

**Step 3: Commit**

```bash
git add server/routes/auth.fastify.ts
git commit -m "feat: add reset-password endpoint with token validation"
```

---

## Task 3: Frontend API Client - Add Password Reset Methods

**Files:**
- Modify: `services/api.ts`

**Step 1: Add password reset methods to API class**

Add to `services/api.ts` in the API class (around line 250, after auth methods):

```typescript
// Password Reset
async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await fetch(`${this.API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to request password reset');
    }

    return response.json();
}

async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${this.API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset password');
    }

    return response.json();
}
```

**Step 2: Test methods in browser console**

```javascript
import { api } from './services/api';
await api.requestPasswordReset('test@example.com');
await api.resetPassword('token123', 'newPassword123');
```

**Step 3: Commit**

```bash
git add services/api.ts
git commit -m "feat: add password reset API client methods"
```

---

## Task 4: Frontend - Create Password Reset Modal

**Files:**
- Create: `components/PasswordResetModal.tsx`
- Reference: `components/Auth.tsx` (styling consistency)

**Step 1: Create PasswordResetModal component**

```typescript
import React, { useState } from 'react';
import { X, Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = ''
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.requestPasswordReset(email);
      setSuccess(true);

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setEmail('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal kirim email reset. Coba lagi nanti ya kak');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#070809]/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0F1014] w-full max-w-[420px] rounded-3xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border border-[#22242A] p-10 relative z-10"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#5E6068] hover:text-[#E8E8E8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {!success ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-white mb-2">Lupa Password?</h2>
                <p className="text-[11px] text-[#5E6068]">
                  Masukin email kakak, kami kirim link reset ya
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-widest ml-1">
                    Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-[#5E6AD2] transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#14151A] border border-[#22242A] rounded-xl pl-12 pr-4 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#5E6AD2]/50 focus:ring-4 focus:ring-[#5E6AD2]/5 transition-all placeholder:text-[#2C2D35]"
                      placeholder="address@nodex.network"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-[11px]"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#5E6AD2] hover:bg-[#4b55aa] disabled:opacity-30 text-white text-[12px] font-bold py-3.5 rounded-xl transition-all uppercase tracking-[0.2em] flex items-center justify-center"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Kirim Link Reset</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Cek Email Kakak!</h3>
              <p className="text-[11px] text-[#5E6068]">
                Link reset password udah dikirim ke {email}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
```

**Step 2: Commit**

```bash
git add components/PasswordResetModal.tsx
git commit -m "feat: create password reset modal component"
```

---

## Task 5: Frontend - Create Reset Password Page

**Files:**
- Create: `components/ResetPasswordPage.tsx`
- Reference: `components/Auth.tsx` (styling consistency)

**Step 1: Create ResetPasswordPage component**

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Lock, CheckCircle, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    setToken(tokenParam);

    if (!tokenParam) {
      setError('Link reset nggak valid atau udah kadaluarsa kak');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Link reset nggak valid atau udah kadaluarsa kak');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password minimal 8 karakter ya kak');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Password-nya beda kak');
      return;
    }

    setIsLoading(true);

    try {
      await api.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Gagal ganti password. Coba lagi nanti ya kak');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen bg-[#0A0A0C] items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0F1014] border border-[#22242A] rounded-3xl p-10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] max-w-[420px] w-full text-center"
        >
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Password Berhasil Diupdate!</h1>
          <p className="text-[11px] text-[#5E6068] mb-6">
            Password kakak udah berhasil diganti ya
          </p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="w-full bg-[#5E6AD2] hover:bg-[#4b55aa] text-white text-[12px] font-bold py-3.5 rounded-xl transition-all uppercase tracking-[0.2em] flex items-center justify-center"
          >
            <span>Lanjut ke Login</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0C] items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0F1014] border border-[#22242A] rounded-3xl p-10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] max-w-[420px] w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-[11px] text-[#5E6068]">
            Masukin password baru kakak
          </p>
        </div>

        {!token ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={() => navigate({ to: '/' })}
              className="text-[#5E6AD2] hover:text-[#7c7bf4] text-xs font-bold uppercase tracking-wider"
            >
              Request Reset Link Baru
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-widest ml-1">
                Password Baru
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-[#5E6AD2] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#14151A] border border-[#22242A] rounded-xl pl-12 pr-12 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#5E6AD2]/50 focus:ring-4 focus:ring-[#5E6AD2]/5 transition-all placeholder:text-[#2C2D35]"
                  placeholder="Minimal 8 karakter"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3A3C46] hover:text-[#5E6AD2] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-widest ml-1">
                Konfirmasi Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-[#5E6AD2] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#14151A] border border-[#22242A] rounded-xl pl-12 pr-4 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#5E6AD2]/50 focus:ring-4 focus:ring-[#5E6AD2]/5 transition-all placeholder:text-[#2C2D35]"
                  placeholder="Ketik lagi password-nya"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-[11px] flex items-center"
              >
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#5E6AD2] hover:bg-[#4b55aa] disabled:opacity-30 text-white text-[12px] font-bold py-3.5 rounded-xl transition-all uppercase tracking-[0.2em] flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add components/ResetPasswordPage.tsx
git commit -m "feat: create reset password page component"
```

---

## Task 6: Frontend - Integrate Modal into Auth Component

**Files:**
- Modify: `components/Auth.tsx`

**Step 1: Add modal state and import**

Add at top of Auth component (after existing state):

```typescript
import { PasswordResetModal } from './PasswordResetModal';

// In Auth component, add state:
const [showForgotPassword, setShowForgotPassword] = useState(false);
```

**Step 2: Add "Lupa Password?" link**

Add after password field (around line 169, before closing `</div>` of password field):

```typescript
{isLoginMode && (
  <div className="flex justify-end mt-2">
    <button
      type="button"
      onClick={() => setShowForgotPassword(true)}
      className="text-[10px] text-[#5E6AD2] hover:text-[#7c7bf4] transition-colors font-medium"
    >
      Lupa Password?
    </button>
  </div>
)}
```

**Step 3: Add PasswordResetModal component**

Add at end of Auth component return (before closing `</div>`):

```typescript
{showForgotPassword && (
  <PasswordResetModal
    isOpen={showForgotPassword}
    onClose={() => setShowForgotPassword(false)}
    defaultEmail={email}
  />
)}
```

**Step 4: Test the flow**

1. Open login page
2. Click "Lupa Password?"
3. Modal should open with email pre-filled if user entered email
4. Submit form
5. Should show success message and auto-close

**Step 5: Commit**

```bash
git add components/Auth.tsx
git commit -m "feat: add forgot password modal to login"
```

---

## Task 7: Frontend - Add Reset Password Route

**Files:**
- Modify: `router.tsx`

**Step 1: Import ResetPasswordPage**

Add at top of router.tsx:

```typescript
import { ResetPasswordPage } from './components/ResetPasswordPage';
```

**Step 2: Add route to router**

Add route in router configuration (after existing routes):

```typescript
const routeTree = rootRoute.addChildren([
  // ... existing routes
  resetPasswordRoute,
]);

// Add route definition:
const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
});
```

**Step 3: Test route**

1. Visit `/reset-password?token=test123`
2. Should show "Link reset nggak valid atau udah kadaluarsa kak" error
3. Visit `/reset-password` without token
4. Should show same error

**Step 4: Commit**

```bash
git add router.tsx
git commit -m "feat: add reset password route"
```

---

## Task 8: Build and Deploy

**Files:**
- Root: `package.json`
- Production: `manage-production.sh`

**Step 1: Build frontend**

Run: `npm run build`
Expected: Build completes successfully with dist/ folder created

**Step 2: Restart production services**

Run: `./manage-production.sh restart`
Expected: All services restart successfully

**Step 3: Test complete flow**

1. Navigate to login page
2. Click "Lupa Password?"
3. Enter email address
4. Check email console logs or actual email
5. Click reset link from email
6. Enter new password (min 8 chars)
7. Confirm password matches
8. Submit
9. Should see success message
10. Click "Lanjut ke Login"
11. Login with new password

**Step 4: Verify error cases**

Test these scenarios:
- Try using same reset link twice → should show expired error
- Wait 1 hour, try link → should show expired error
- Enter mismatched passwords → should show match error
- Enter password < 8 chars → should show length error

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete password reset flow implementation"
```

---

## Testing Checklist

**Manual Testing:**
- [ ] Forgot password modal opens from login
- [ ] Email validation works
- [ ] Success message shows and auto-closes
- [ ] Reset password page loads with valid token
- [ ] Reset password page shows error without token
- [ ] Password mismatch validation works
- [ ] Password length validation works
- [ ] Successful reset shows success page
- [ ] "Lanjut ke Login" button navigates correctly
- [ ] Can login with new password after reset
- [ ] Using reset link twice shows expired error
- [ ] All error messages are in Bahasa Indonesia with "kak"

**API Testing:**
```bash
# Test forgot password
curl -X POST http://localhost:3001/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test reset password (get token from email first)
curl -X POST http://localhost:3001/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>","newPassword":"newPassword123"}'
```

---

## Notes

- Email template already exists in `server/auth/email.ts` (line 174)
- PasswordResetToken model already exists in Prisma schema
- Rate limiting should be added to forgot-password endpoint (3 req/hr per email)
- Consider adding countdown timer on forgot password button to prevent spam
- All user-facing messages use friendly Bahasa Indonesia with "kak"
