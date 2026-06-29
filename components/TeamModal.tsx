
import React, { useState, useEffect } from 'react';
import { X, Users, Command, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string) => Promise<void>;
}

export const TeamModal: React.FC<TeamModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const icon = name.trim().charAt(0).toUpperCase() || 'T';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      await onSave(name.trim(), icon);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-[#070809]/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-[#0F1014] w-full max-w-[440px] rounded-3xl shadow-popover border border-[#22242A] overflow-hidden relative z-10"
        >
          {/* Dynamic Background */}
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Users className="w-32 h-32 text-accent" />
          </div>

          {/* Header / Identity */}
          <div className="flex flex-col items-center pt-12 pb-8 border-b border-[#1A1C23] relative">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 bg-[#14151A] border border-[#22242A] flex items-center justify-center text-4xl font-bold text-[#E8E8E8] mb-6 shadow-popover relative group"
            >
              {icon}
              <div className="absolute inset-x-2 bottom-[-1px] h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
            <h2 className="text-xl font-bold text-[#E8E8E8] tracking-tight">Create New Workspace</h2>
            <div className="flex items-center space-x-2 mt-1.5">
              <Command className="w-3 h-3 text-[#5E6068]" />
              <span className="text-[10px] text-[#5E6068] font-black uppercase tracking-[0.3em]">Team Container</span>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/5 border border-red-500/10 text-[11px] text-red-500 font-bold text-center uppercase tracking-widest flex items-center justify-center space-x-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Fault: {error}</span>
                </motion.div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.3em] ml-1">Terminal Handle</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[#14151A] border border-[#22242A] px-6 py-4 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all placeholder:text-[#2C2D35] font-medium"
                  placeholder="e.g. Engine Team"
                  autoFocus
                />
              </div>

              <div className="pt-4 space-y-4">
                <button
                  type="submit"
                  disabled={!name.trim() || isSubmitting}
                  className="w-full py-4 bg-accent hover:bg-accent-hover text-white text-[11px] font-bold transition-all disabled:opacity-20 disabled:grayscale uppercase tracking-[0.3em] shadow-xl shadow-accent/20 flex items-center justify-center group"
                >
                  <span>{isSubmitting ? 'Creating...' : 'Create Workspace'}</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2 text-[10px] font-bold text-[#3A3C46] hover:text-[#C0C4CC] transition-colors uppercase tracking-widest"
                >
                  Abort Operation
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
