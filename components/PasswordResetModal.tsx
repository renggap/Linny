import React, { useState } from 'react';
import { X, Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authApi } from '../services/api';

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
      await authApi.requestPasswordReset(email);
      setSuccess(true);

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
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-accent transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-4 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all placeholder:text-[#2C2D35]"
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
                    className="bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-[11px]"
                  >
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
