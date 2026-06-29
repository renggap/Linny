
import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Cpu, Activity, ArrowRight, Lock, Mail, User as UserIcon, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { PasswordResetModal } from './PasswordResetModal';

export const Auth: React.FC = () => {
  const { login, register, isLoading, error, clearError } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');
  const [inviteMode, setInviteMode] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteEmail = params.get('inviteEmail');
    const token = params.get('inviteToken');
    if (inviteEmail) {
      setIsLoginMode(false);
      setEmail(inviteEmail);
      setInviteMode(true);
      if (token) {
        setInviteToken(token);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (isLoginMode) {
      try {
        await login(email, password);
      } catch (err) {
        setLocalError('Authentication failed: Invalid credentials');
      }
    } else {
      if (!email || !password || !name) {
        setLocalError('All credentials must be provided');
        return;
      }
      try {
        await register(name, email, password);

        // If this is an invitation flow, accept the invitation after registration
        if (inviteToken) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1/invitations/accept`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: inviteToken })
            });
          } catch (err) {
            console.error('Failed to accept invitation:', err);
            // Don't fail registration if invitation acceptance fails
          }
        }
      } catch (err) {
        setLocalError(error || 'Registration sequence interrupted');
      }
    }
  };

  const handleToggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setLocalError('');
    clearError();
  };

  const displayError = localError || error;

  return (
    <div className="flex min-h-screen bg-[#0A0A0C] items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] animate-pulse delay-700" />

        {/* Subtle Grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(var(--accent-color) 1px, transparent 1px), linear-gradient(90deg, var(--accent-color) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="bg-[#0F1014] border border-[#22242A] rounded-3xl p-10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">

          <div className="flex flex-col items-center mb-10">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-14 h-14 bg-[#14151A] border border-[#2C2D35] flex items-center justify-center text-accent mb-8 shadow-popover relative group"
            >
              <Terminal className="w-7 h-7" />
              <div className="absolute inset-0 bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>

            <h1 className="text-2xl font-bold text-white tracking-widest uppercase mb-2">Linear</h1>
            <div className="flex items-center space-x-2">
              <div className="h-px w-4 bg-[#2C2D35]" />
              <span className="text-[10px] text-[#5E6068] font-black uppercase tracking-[0.3em]">
                {isLoginMode ? 'Access Restricted' : 'Secure Initializing'}
              </span>
              <div className="h-px w-4 bg-[#2C2D35]" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLoginMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-widest ml-1">Identity Name</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-accent transition-colors" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-4 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all placeholder:text-[#2C2D35]"
                      placeholder="Specify identity..."
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-widest ml-1">Access Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-accent transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isLoading || inviteMode}
                  className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-4 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all placeholder:text-[#2C2D35] disabled:opacity-40"
                  placeholder="address@nodex.network"
                />
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-widest ml-1">Pass-Key</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-accent transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-4 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all placeholder:text-[#2C2D35]"
                  placeholder="••••••••••••"
                  disabled={isLoading}
                />
              </div>
              {isLoginMode && (
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[10px] text-accent hover:text-[#7c7bf4] transition-colors font-medium"
                  >
                    Lupa Password?
                  </button>
                </div>
              )}
            </div>

            {displayError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 p-3"
              >
                <Shield className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-red-400 text-[11px] font-medium leading-tight">{displayError}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-30 text-white text-[12px] font-bold py-4 transition-all uppercase tracking-[0.2em] shadow-xl shadow-accent/10 flex items-center justify-center group"
            >
              {isLoading ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isLoginMode ? 'Authorize Access' : 'Register'}</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-[#22242A] text-center">
            {!inviteMode ? (
              <button
                type="button"
                onClick={handleToggleMode}
                className="text-[10px] font-bold text-[#5E6068] hover:text-[#C0C4CC] uppercase tracking-widest transition-colors flex items-center justify-center mx-auto group"
              >
                <Cpu className="w-3.5 h-3.5 mr-2 group-hover:text-accent transition-colors" />
                {isLoginMode ? "Create New Account" : "Back to Login Area"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setInviteMode(false); setIsLoginMode(true); setEmail(''); }}
                className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors"
              >
                Abort Invitation
              </button>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-[#3A3C46] text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          Made with love by Neo DEV Team
        </p>
      </motion.div>

      {showForgotPassword && (
        <PasswordResetModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          defaultEmail={email}
        />
      )}
    </div>
  );
};
