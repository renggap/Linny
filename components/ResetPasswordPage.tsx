import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Lock, CheckCircle, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { authApi } from '../services/api';

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
      await authApi.resetPassword(token, newPassword);
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
            className="w-full bg-accent hover:bg-accent-hover text-white text-[12px] font-bold py-3.5 transition-all uppercase tracking-[0.2em] flex items-center justify-center"
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
              className="text-accent hover:text-[#7c7bf4] text-xs font-bold uppercase tracking-wider"
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
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-accent transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-12 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all placeholder:text-[#2C2D35]"
                  placeholder="Minimal 8 karakter"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3A3C46] hover:text-accent transition-colors"
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
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-accent transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-4 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all placeholder:text-[#2C2D35]"
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
                className="bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-[11px] flex items-center"
              >
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-30 text-white text-[12px] font-bold py-3.5 transition-all uppercase tracking-[0.2em] flex items-center justify-center"
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
