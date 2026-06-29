
import React, { useState, useEffect } from 'react';
import { X, Hash, Layout, ArrowRight } from 'lucide-react';
import { Team } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTeam: Team | undefined;
  onSave: (name: string, identifier: string, icon: string, teamId: string) => Promise<void>;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, currentTeam, onSave }) => {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [icon, setIcon] = useState('⚡');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setIdentifier('');
      setIcon('⚡');
      setError('');
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  if (!isOpen || !currentTeam) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!identifier && newName.length >= 3) {
      // Create suggested ID from the first 3 alphanumeric characters
      const suggestedId = newName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
      if (suggestedId.length === 3) setIdentifier(suggestedId);
    }
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    setIdentifier(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || identifier.length !== 3) return;
    setIsSubmitting(true);
    setError('');
    try {
      await onSave(name, identifier, icon, currentTeam.id);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0F1014] w-full max-w-[540px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border border-[#22242A] overflow-hidden relative z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 h-20 border-b border-[#1A1C23] bg-[#14151A]/30">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-[#1A1C23] border border-[#2C2D35] flex items-center justify-center text-xl shadow-inner">
                <Layout className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#E8E8E8] tracking-tight">Project Deployment</h2>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-[9px] font-black text-[#5E6068] uppercase tracking-[0.2em]">Scope initialization</span>
                </div>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 text-[#5E6068] hover:text-[#E8E8E8] hover:bg-[#1C1D24] transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-8">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-4 bg-red-500/5 border border-red-500/20 text-[11px] text-red-400 font-bold flex items-center space-x-3 uppercase tracking-wider"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>Error: {error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-3 space-y-3">
                  <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.2em] ml-1">Project Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={handleNameChange}
                    className="w-full bg-[#14151A] border border-[#22242A] px-5 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all placeholder:text-[#2C2D35] font-medium"
                    placeholder="Project Name"
                    autoFocus
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.2em] ml-1">Identifier</label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    className="w-full bg-[#14151A] border border-[#22242A] px-3 py-3.5 text-sm text-accent focus:outline-none focus:border-accent/50 font-mono text-center font-bold tracking-[0.2em]"
                    placeholder="ID"
                    maxLength={3}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.2em] ml-1">Icon</label>
                <div className="flex items-center space-x-6 p-1 bg-[#14151A] border border-[#22242A]">
                  <div className="w-16 h-16 bg-[#0F1014] border border-[#1A1C23] flex items-center justify-center text-3xl shrink-0 shadow-inner">
                    {icon}
                  </div>
                  <div className="flex-1 grid grid-cols-8 gap-1 p-2 max-h-24 overflow-y-auto no-scrollbar">
                    {['⚡', '🚀', '🎯', '📦', '🔧', '🎨', '📱', '💻', '📊', '📈', '🔒', '🛡️', '⚙️', '🔨', '📁', '💼', '✅', '🎉', '⭐', '💎', '🔥', '❤️', '🌍', '🛠️'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`w-9 h-9 flex items-center justify-center transition-all text-xl ${icon === emoji ? 'bg-accent text-white shadow-lg shadow-accent/20 scale-95' : 'hover:bg-[#1A1C23] text-[#3A3C46] hover:text-[#C0C4CC]'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-[#1A1C23] flex items-center justify-between">
                <div className="flex items-center space-x-3 bg-[#14151A] px-3 py-1.5 rounded-full border border-[#22242A]">
                  <span className="text-[9px] font-black text-[#5E6068] uppercase tracking-widest">Team</span>
                  <div className="h-3 w-px bg-[#22242A]" />
                  <span className="text-[10px] font-bold text-[#C0C4CC] uppercase tracking-tighter">{currentTeam.name}</span>
                </div>
                <div className="flex space-x-6">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-[11px] font-bold text-[#5E6068] hover:text-[#E8E8E8] transition-colors uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name || identifier.length !== 3 || isSubmitting}
                    className="px-8 py-3 bg-accent hover:bg-accent-hover text-white text-[11px] font-bold transition-all disabled:opacity-20 disabled:grayscale uppercase tracking-[0.2em] shadow-xl shadow-accent/20 flex items-center space-x-2 group"
                  >
                    <span>{isSubmitting ? 'Creating...' : 'Create Project'}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};