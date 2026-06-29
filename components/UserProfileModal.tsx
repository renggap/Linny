
import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, ShieldCheck, Lock, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';
import { User, Team } from '../types';
import { UserAvatar } from './UserAvatar';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { cn } from '../lib/utils';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
    onSave: (data: { name?: string; avatar_url?: string }) => void;
    currentTeam?: Team;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, currentUser, onSave, currentTeam }) => {
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

    // Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    useEffect(() => {
        if (currentUser && isOpen) {
            setName(currentUser.name);
            // Reset security tab on open
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError('');
            setPasswordSuccess(false);
            setActiveTab('profile');
        }
    }, [currentUser, isOpen]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            await onSave({ name });
            // The modal might stay open if onSave doesn't close it, 
            // but the parent usually handles closure or refresh.
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess(false);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('All authorized fields required');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Phrase mismatch detected');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('Complexity requirement failed: Minimum 8 characters');
            return;
        }

        setIsUpdatingPassword(true);
        try {
            if (currentUser) {
                await api.users.changePassword(currentUser.id, currentPassword, newPassword);
                setPasswordSuccess(true);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (err: any) {
            setPasswordError(err.message || 'Authorization update failed');
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    if (!isOpen || !currentUser) return null;

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
                    className="bg-[#0F1014] w-full max-w-[500px] rounded-3xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border border-[#22242A] overflow-hidden relative z-10"
                >
                    {/* Industrial Header / Banner */}
                    <div className="h-24 bg-[#14151A]/50 border-b border-[#1A1C23] relative flex items-end px-10 pb-4 overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                            <UserIcon className="w-32 h-32" />
                        </div>
                        <div className="flex space-x-6 relative z-10">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.2em] pb-1 transition-all border-b-2",
                                    activeTab === 'profile' ? "text-white border-accent" : "text-[#5E6068] border-transparent hover:text-[#C0C4CC]"
                                )}
                            >
                                Identity
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.2em] pb-1 transition-all border-b-2",
                                    activeTab === 'security' ? "text-white border-accent" : "text-[#5E6068] border-transparent hover:text-[#C0C4CC]"
                                )}
                            >
                                Security
                            </button>
                        </div>
                        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-[#5E6068] hover:text-[#E8E8E8] hover:bg-[#1C1D24] transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-10">
                        {activeTab === 'profile' ? (
                            <div className="space-y-10">
                                {/* Profile Header */}
                                <div className="flex items-center space-x-6">
                                    <UserAvatar
                                        name={currentUser.name}
                                        size="xl"
                                        className="border-2 border-[#22242A] shadow-popover"
                                    />
                                    <div>
                                        <h2 className="text-xl font-bold text-[#E8E8E8] tracking-tight">{currentUser.name}</h2>
                                        <p className="text-[10px] text-[#5E6068] font-black uppercase tracking-[0.3em] mt-1">Profile</p>
                                    </div>
                                </div>

                                <form onSubmit={handleProfileSubmit} className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.2em] ml-1">Name</label>
                                            <div className="relative group">
                                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-accent transition-colors" />
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-4 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all font-medium"
                                                    placeholder="Enter your name..."
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 opacity-40">
                                            <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.2em] ml-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46]" />
                                                <input
                                                    type="email"
                                                    value={currentUser.email}
                                                    readOnly
                                                    className="w-full bg-[#0A0A0C] border border-[#1A1C23] pl-12 pr-4 py-3.5 text-sm text-[#5E6068] font-mono cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-[#14151A] p-4 border border-[#22242A]">
                                            <span className="text-[9px] font-black text-[#3A3C46] uppercase tracking-[0.2em] block mb-2">Role</span>
                                            <div className="flex items-center text-[11px] font-bold text-[#C0C4CC] uppercase tracking-wider">
                                                <ShieldCheck className="w-3.5 h-3.5 mr-2 text-accent" />
                                                {currentUser.role}
                                            </div>
                                        </div>
                                        <div className="bg-[#14151A] p-4 border border-[#22242A]">
                                            <span className="text-[9px] font-black text-[#3A3C46] uppercase tracking-[0.2em] block mb-2">Team</span>
                                            <div className="text-[11px] font-bold text-[#C0C4CC] uppercase tracking-wider truncate">
                                                {currentTeam?.name || 'No Team'}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSaving || !name.trim() || name === currentUser.name}
                                        className="w-full bg-accent hover:bg-accent-hover text-white py-4 font-bold text-[11px] uppercase tracking-[0.2em] transition-all disabled:opacity-20 shadow-xl shadow-accent/20 flex items-center justify-center group"
                                    >
                                        {isSaving ? <Activity className="w-4 h-4 animate-spin" /> : (
                                            <>
                                                <span>Update Profile</span>
                                                <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-[#E8E8E8] tracking-tight">Security</h3>
                                    <p className="text-[10px] text-[#5E6068] font-black uppercase tracking-[0.3em] mt-1">Change Password</p>
                                </div>

                                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.2em] ml-1">Current Password</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-accent transition-colors" />
                                                <input
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-4 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all"
                                                    placeholder="••••••••••••"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.2em] ml-1">New Password</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-accent transition-colors" />
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-4 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all"
                                                    placeholder="••••••••••••"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.2em] ml-1">Confirm New Password</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-accent transition-colors" />
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-4 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all"
                                                    placeholder="••••••••••••"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {passwordError && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="px-4 py-3 bg-red-500/5 border border-red-500/20 flex items-center space-x-3"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                            <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">{passwordError}</span>
                                        </motion.div>
                                    )}

                                    {passwordSuccess && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="px-4 py-3 bg-green-500/5 border border-green-500/20 flex items-center space-x-3"
                                        >
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            <span className="text-green-400 text-[10px] font-bold uppercase tracking-wider">Password Updated</span>
                                        </motion.div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isUpdatingPassword}
                                        className="w-full bg-[#14151A] hover:bg-[#1C1D24] text-[#C0C4CC] hover:text-white py-4 font-bold text-[11px] uppercase tracking-[0.2em] transition-all border border-[#22242A] hover:border-accent/30 flex items-center justify-center group"
                                    >
                                        {isUpdatingPassword ? <Activity className="w-4 h-4 animate-spin" /> : (
                                            <>
                                                <span>Update Password</span>
                                                <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
