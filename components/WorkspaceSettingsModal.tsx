
import React, { useState, useEffect } from 'react';
import { X, Settings, Trash2, AlertTriangle, Check, LayoutGrid } from 'lucide-react';
import { Team, User, UserRole } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: Team | null;
    currentUser: User | null;
    onUpdate: (teamId: string, updates: { name?: string; icon?: string }) => void;
    onDeleteWorkspace?: () => void;
}

const EMOJI_OPTIONS = ['⚡', '🚀', '🎯', '📦', '🔧', '🎨', '💻', '📊', '📈', '🔒', '🛡️', '⚙️', '🔨', '📁', '💼', '✅', '🎉', '⭐', '💎', '🔥', '❤️', '🌍', '🛠️'];

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
    isOpen,
    onClose,
    team,
    currentUser,
    onUpdate,
    onDeleteWorkspace
}) => {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('⚡');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const canManageWorkspace = currentUser && (currentUser.role === UserRole.Administrator || currentUser.role === UserRole.TeamLead);
    const canDeleteWorkspace = currentUser && currentUser.role === UserRole.Administrator;

    useEffect(() => {
        if (team) {
            setName(team.name);
            setIcon(team.icon);
        }
    }, [team]);

    useEffect(() => {
        if (saveStatus === 'saved') {
            const timeout = setTimeout(() => setSaveStatus('idle'), 2000);
            return () => clearTimeout(timeout);
        }
    }, [saveStatus]);

    const handleSaveName = async () => {
        if (!team || !name.trim() || name === team.name) return;
        setIsSaving(true);
        try {
            await onUpdate(team.id, { name: name.trim() });
            setSaveStatus('saved');
        } catch (error) {
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveIcon = async (newIcon: string) => {
        if (!team || newIcon === team.icon) return;
        setIcon(newIcon);
        try {
            await onUpdate(team.id, { icon: newIcon });
        } catch (error) {
            console.error('Failed to update icon:', error);
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!canDeleteWorkspace || !onDeleteWorkspace) return;
        setIsDeleting(true);
        try {
            await onDeleteWorkspace();
            onClose();
        } catch (error) {
            console.error('Failed to delete workspace:', error);
            setIsDeleting(false);
        }
    };

    if (!isOpen || !team) return null;

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
                    className="bg-[#0F1014] w-full max-w-[500px] rounded-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border border-[#22242A] flex flex-col overflow-hidden relative z-10"
                >
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-6 h-14 border-b border-[#1A1C23] bg-[#14151A]/30 shrink-0">
                        <div className="flex items-center space-x-3">
                            <Settings className="w-4 h-4 text-[#5E6AD2]" />
                            <h2 className="text-[11px] font-black text-[#5E6068] uppercase tracking-[0.2em]">Workspace Settings</h2>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-[#5E6068] hover:text-[#E8E8E8] hover:bg-[#1C1D24] rounded-lg transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Current Workspace Display */}
                        <div className="flex items-center space-x-4 pb-6 border-b border-[#1A1C23]">
                            <div className="w-14 h-14 bg-[#14151A] border border-[#22242A] rounded-xl flex items-center justify-center text-2xl shadow-inner">
                                {team.icon}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#E8E8E8] tracking-tight">{team.name}</h3>
                                <p className="text-[10px] text-[#5E6068] font-black uppercase tracking-[0.3em]">Current Workspace</p>
                            </div>
                        </div>

                        {/* Workspace Name */}
                        {canManageWorkspace && (
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-[#5E6068] uppercase tracking-[0.2em] ml-1">Workspace Name</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                        className="flex-1 bg-[#14151A] border border-[#22242A] rounded-xl px-4 py-2.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#5E6AD2]/50 transition-all font-medium"
                                        placeholder="Workspace name"
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        disabled={isSaving || !name.trim() || name === team.name}
                                        className="px-4 py-2.5 bg-[#5E6AD2] hover:bg-[#4b55aa] text-white text-[11px] font-bold rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed uppercase tracking-wider flex items-center space-x-1"
                                    >
                                        {isSaving ? (
                                            <span>Saving...</span>
                                        ) : saveStatus === 'saved' ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Saved</span>
                                            </>
                                        ) : (
                                            <span>Save</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Workspace Icon */}
                        {canManageWorkspace && (
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-[#5E6068] uppercase tracking-[0.2em] ml-1">Workspace Icon</label>
                                <div className="flex items-center space-x-3 p-3 bg-[#14151A] border border-[#22242A] rounded-xl">
                                    <div className="w-10 h-10 bg-[#0F1014] border border-[#1A1C23] rounded-lg flex items-center justify-center text-xl shrink-0">
                                        {icon}
                                    </div>
                                    <div className="flex-1 grid grid-cols-12 gap-1">
                                        {EMOJI_OPTIONS.map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => handleSaveIcon(emoji)}
                                                className={`w-7 h-7 flex items-center justify-center rounded transition-all text-sm ${
                                                    icon === emoji
                                                        ? 'bg-[#5E6AD2] text-white shadow-lg shadow-[#5E6AD2]/20 scale-95'
                                                        : 'hover:bg-[#1A1C23] text-[#3A3C46] hover:text-[#C0C4CC]'
                                                }`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Delete Workspace - Admin Only */}
                        {canDeleteWorkspace && (
                            <div className="pt-6 border-t border-[#1A1C23]">
                                {!showDeleteConfirm ? (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-[11px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-xl transition-all uppercase tracking-wider"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete Workspace</span>
                                    </button>
                                ) : (
                                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <AlertTriangle className="w-4 h-4 text-red-400" />
                                            <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Warning: Irreversible Action</span>
                                        </div>
                                        <p className="text-[11px] text-[#C0C4CC] leading-relaxed">
                                            This will permanently delete the entire workspace, including all teams, projects, issues, and data. This action cannot be undone.
                                        </p>
                                        <div className="flex items-center space-x-2 pt-2">
                                            <button
                                                onClick={handleDeleteWorkspace}
                                                disabled={isDeleting}
                                                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold rounded-lg transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                disabled={isDeleting}
                                                className="px-4 py-2.5 text-[11px] font-bold text-[#5E6068] hover:text-[#E8E8E8] rounded-lg transition-all uppercase tracking-wider"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
