
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Settings, Trash2, AlertTriangle, Check, Eye, EyeOff, LogOut, Activity } from 'lucide-react';
import { Team, User, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';

interface WorkspaceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: Team | null;
    currentUser: User | null;
    onUpdate: (teamId: string, updates: { name?: string; icon?: string; isStealth?: boolean }) => void;
    onDeleteWorkspace?: () => void;
    onLeaveTeam?: () => void;
}

const EMOJI_OPTIONS = ['⚡', '🚀', '🎯', '📦', '🔧', '🎨', '💻', '📊', '📈', '🔒', '🛡️', '⚙️', '🔨', '📁', '💼', '✅', '🎉', '⭐', '💎', '🔥', '❤️', '🌍', '🛠️'];

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
    isOpen,
    onClose,
    team,
    currentUser,
    onUpdate,
    onDeleteWorkspace,
    onLeaveTeam
}) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('⚡');
    const [isStealth, setIsStealth] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLeavingTeam, setIsLeavingTeam] = useState(false);
    const [leaveTeamError, setLeaveTeamError] = useState('');
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    const canManageWorkspace = currentUser && (currentUser.role === UserRole.Administrator || currentUser.role === UserRole.TeamLead);
    const canDeleteWorkspace = currentUser && currentUser.role === UserRole.Administrator;

    useEffect(() => {
        if (team) {
            setName(team.name);
            setIcon(team.icon);
            setIsStealth(team.isStealth || false);
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
            // Invalidate teams cache to refresh the name everywhere
            queryClient.invalidateQueries({ queryKey: ['teams'] });
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
            // Invalidate teams cache to refresh the icon everywhere
            queryClient.invalidateQueries({ queryKey: ['teams'] });
        } catch (error) {
            console.error('Failed to update icon:', error);
        }
    };

    const handleToggleStealth = async () => {
        if (!team) return;
        const newStealthValue = !isStealth;
        setIsStealth(newStealthValue);
        try {
            await onUpdate(team.id, { isStealth: newStealthValue });
            // Invalidate teams cache to refresh the stealth status everywhere
            queryClient.invalidateQueries({ queryKey: ['teams'] });
        } catch (error) {
            console.error('Failed to update stealth mode:', error);
            // Revert on error
            setIsStealth(!newStealthValue);
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

    const handleLeaveTeam = async () => {
        if (!team) return;

        setIsLeavingTeam(true);
        setLeaveTeamError('');

        try {
            await api.teams.leaveTeam(team.id);
            // Call the parent callback to refresh teams
            if (onLeaveTeam) {
                onLeaveTeam();
            }
            onClose();
        } catch (err: any) {
            setLeaveTeamError(err.message || 'Failed to leave team');
            setShowLeaveConfirm(false);
        } finally {
            setIsLeavingTeam(false);
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="bg-[#0F1014] w-full max-w-[500px] shadow-popover border border-[#22242A] flex flex-col overflow-hidden relative z-10"
                >
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-6 h-14 border-b border-[#1A1C23] bg-[#14151A]/30 shrink-0">
                        <div className="flex items-center space-x-3">
                            <Settings className="w-4 h-4 text-accent" />
                            <h2 className="text-[11px] font-black text-[#5E6068] uppercase tracking-[0.2em]">Workspace Settings</h2>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-[#5E6068] hover:text-[#E8E8E8] hover:bg-[#1C1D24] transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Current Workspace Display */}
                        <div className="flex items-center space-x-4 pb-6 border-b border-[#1A1C23]">
                            <div className="w-14 h-14 bg-[#14151A] border border-[#22242A] flex items-center justify-center text-2xl shadow-inner">
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
                                        className="flex-1 bg-[#14151A] border border-[#22242A] px-4 py-2.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 transition-all font-medium"
                                        placeholder="Workspace name"
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        disabled={isSaving || !name.trim() || name === team.name}
                                        className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-[11px] font-bold transition-all disabled:opacity-20 disabled:cursor-not-allowed uppercase tracking-wider flex items-center space-x-1"
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
                                <div className="flex items-center space-x-3 p-3 bg-[#14151A] border border-[#22242A]">
                                    <div className="w-10 h-10 bg-[#0F1014] border border-[#1A1C23] flex items-center justify-center text-xl shrink-0">
                                        {icon}
                                    </div>
                                    <div className="flex-1 grid grid-cols-12 gap-1">
                                        {EMOJI_OPTIONS.map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => handleSaveIcon(emoji)}
                                                className={`w-7 h-7 flex items-center justify-center rounded transition-all text-sm ${icon === emoji
                                                    ? 'bg-accent text-white shadow-lg shadow-accent/20 scale-95'
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

                        {/* Stealth Mode Toggle */}
                        {canManageWorkspace && (
                            <div className="space-y-3 pb-6 border-b border-[#1A1C23]">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-[#5E6068] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                            {isStealth ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            Stealth Mode
                                        </label>
                                        <p className="text-[11px] text-[#5E6068] mt-1.5 ml-1 leading-relaxed">
                                            {isStealth
                                                ? 'Workspace is hidden from non-members. Only team members can see and access this workspace.'
                                                : 'Workspace is visible to all administrators. Team members can always see their workspaces.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleToggleStealth}
                                        className={`relative w-14 h-7 rounded-full transition-all duration-300 shrink-0 ${isStealth
                                            ? 'bg-accent shadow-lg shadow-accent/20'
                                            : 'bg-[#22242A] hover:bg-[#2C2D35]'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${isStealth ? 'left-8' : 'left-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Danger Zone */}
                        <div className="pt-6 border-t border-[#1A1C23]">
                            <h4 className="text-[9px] font-bold text-[#3A3C46] uppercase tracking-[0.3em] mb-4 ml-1">Danger Zone</h4>

                            {/* Leave Team - All Users */}
                            {!showDeleteConfirm && (
                                <div className="space-y-2">
                                    {!showLeaveConfirm ? (
                                        <button
                                            onClick={() => setShowLeaveConfirm(true)}
                                            className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-medium text-[#5E6068] hover:text-[#8A8F98] hover:bg-[#14151A] transition-all group"
                                        >
                                            <span className="uppercase tracking-wider">Leave Team</span>
                                            <LogOut className="w-3.5 h-3.5 text-[#3A3C46] group-hover:text-[#5E6068] transition-colors" />
                                        </button>
                                    ) : (
                                        <div className="bg-[#14151A]/50 border border-[#22242A] p-4 space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <AlertTriangle className="w-4 h-4 text-[#E8E8E8]" />
                                                <span className="text-[10px] font-bold text-[#E8E8E8] uppercase tracking-wider">Leaving Team</span>
                                            </div>
                                            <p className="text-[10px] text-[#8A8F98] leading-relaxed">
                                                You will lose access to all projects, issues, and resources in this workspace. A team administrator can re-invite you.
                                            </p>
                                            {leaveTeamError && (
                                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{leaveTeamError}</p>
                                            )}
                                            <div className="flex items-center space-x-2 pt-2">
                                                <button
                                                    onClick={handleLeaveTeam}
                                                    disabled={isLeavingTeam}
                                                    className="flex-1 px-4 py-2 bg-[#25262B] hover:bg-[#2C2D35] text-[10px] font-bold text-[#8A8F98] hover:text-[#E8E8E8] transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isLeavingTeam ? (
                                                        <>
                                                            <Activity className="w-3.5 h-3.5 mr-2 animate-spin inline" />
                                                            <span>Leaving...</span>
                                                        </>
                                                    ) : (
                                                        'Confirm'
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setShowLeaveConfirm(false)}
                                                    disabled={isLeavingTeam}
                                                    className="px-4 py-2 text-[10px] font-bold text-[#5E6068] hover:text-[#E8E8E8] transition-all uppercase tracking-wider"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Delete Workspace - Admin Only */}
                            {canDeleteWorkspace && (
                                <div className="space-y-2">
                                    {!showDeleteConfirm ? (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-medium text-[#5E6068] hover:text-[#8A8F98] hover:bg-[#14151A] transition-all group"
                                        >
                                            <span className="uppercase tracking-wider">Delete Workspace</span>
                                            <Trash2 className="w-3.5 h-3.5 text-[#3A3C46] group-hover:text-[#5E6068] transition-colors" />
                                        </button>
                                    ) : (
                                        <div className="bg-[#14151A]/50 border border-[#22242A] p-4 space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Delete Workspace</span>
                                            </div>
                                            <p className="text-[10px] text-[#8A8F98] leading-relaxed">
                                                This will permanently delete this workspace and all its data. This action cannot be undone.
                                            </p>
                                            <div className="flex items-center space-x-2 pt-2">
                                                <button
                                                    onClick={handleDeleteWorkspace}
                                                    disabled={isDeleting}
                                                    className="flex-1 px-4 py-2 bg-[#25262B] hover:bg-red-500/10 text-[10px] font-bold text-[#8A8F98] hover:text-red-400 transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed border border-[#22242A] hover:border-red-500/30"
                                                >
                                                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(false)}
                                                    disabled={isDeleting}
                                                    className="px-4 py-2 text-[10px] font-bold text-[#5E6068] hover:text-[#E8E8E8] transition-all uppercase tracking-wider"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
