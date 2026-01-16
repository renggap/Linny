
import React, { useState } from 'react';
import { X, Shield, Trash2, Search, Plus, ChevronDown, Mail, UserCheck, ShieldAlert, Activity, ArrowRight, User as UserIcon, Crown } from 'lucide-react';
import { User, UserRole, Team } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    currentUser: User;
    currentTeam?: Team;
    onUpdateRole: (userId: string, role: UserRole) => void;
    onRemoveUser: (userId: string) => void;
    onInviteUser: (email: string, role: UserRole) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
    isOpen,
    onClose,
    users,
    currentUser,
    currentTeam,
    onUpdateRole,
    onRemoveUser,
    onInviteUser
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [view, setView] = useState<'list' | 'invite'>('list');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.Member);
    const [generatedLink, setGeneratedLink] = useState('');

    if (!isOpen) return null;

    // Filter by team members first, then by search query
    const teamMemberIds = currentTeam?.members || [];
    const filteredUsers = users
        .filter(u => teamMemberIds.includes(u.id))
        .filter(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const canManage = currentUser.role === UserRole.Administrator || currentUser.role === UserRole.TeamLead;

    const handleGenerateLink = () => {
        if (!inviteEmail) return;
        const baseUrl = window.location.origin;
        const params = new URLSearchParams();
        params.set('inviteEmail', inviteEmail);
        if (currentTeam) params.set('inviteTeamId', currentTeam.id);
        params.set('inviteRole', inviteRole);
        const link = `${baseUrl}?${params.toString()}`;
        setGeneratedLink(link);
        onInviteUser(inviteEmail, inviteRole);
    };

    const resetInvite = () => {
        setInviteEmail('');
        setInviteRole(UserRole.Member);
        setGeneratedLink('');
        setView('list');
    };

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
                    className="bg-[#0F1014] w-full max-w-[700px] h-[85vh] rounded-[32px] shadow-[0_48px_140px_-20px_rgba(0,0,0,0.9)] border border-[#22242A] flex flex-col overflow-hidden relative z-10"
                >
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-10 h-20 border-b border-[#1A1C23] bg-[#14151A]/30 shrink-0">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-[#1A1C23] border border-[#2C2D35] rounded-xl flex items-center justify-center shadow-inner">
                                {view === 'invite' ? <Plus className="w-5 h-5 text-[#5E6AD2]" /> : <Shield className="w-5 h-5 text-[#5E6AD2]" />}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[#E8E8E8] tracking-tight">
                                    {view === 'invite' ? 'Protocol Recruitment' : 'Personnel Registry'}
                                </h2>
                                <div className="flex items-center space-x-2 mt-0.5">
                                    <span className="text-[9px] font-black text-[#5E6068] uppercase tracking-[0.3em]">
                                        {view === 'invite' ? 'Access Key Initialization' : 'Central Authorization Matrix'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-[#5E6068] hover:text-[#E8E8E8] hover:bg-[#1C1D24] rounded-xl transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {view === 'list' ? (
                        <>
                            {/* Filter & Primary Action */}
                            <div className="px-10 py-6 border-b border-[#1A1C23] bg-[#14151A]/10 flex items-center justify-between shrink-0">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46]" />
                                    <input
                                        type="text"
                                        placeholder="Filter by identification name or link..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#14151A] border border-[#22242A] rounded-2xl pl-12 pr-4 py-3 text-[13px] text-[#C0C4CC] placeholder-[#2C2D35] focus:outline-none focus:border-[#5E6AD2]/50 focus:ring-4 focus:ring-[#5E6AD2]/5 transition-all font-medium"
                                    />
                                </div>
                                {canManage && (
                                    <button
                                        onClick={() => setView('invite')}
                                        className="ml-6 px-6 py-3 bg-[#5E6AD2] hover:bg-[#4b55aa] text-white text-[11px] font-bold rounded-2xl flex items-center transition-all uppercase tracking-[0.2em] shadow-xl shadow-[#5E6AD2]/20 group"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Initialize Invite
                                    </button>
                                )}
                            </div>

                            {/* Users Scroll Registry */}
                            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                                <div className="divide-y divide-[#1A1C23]/50">
                                    {filteredUsers.map((user, idx) => (
                                        <motion.div
                                            key={user.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="flex items-center justify-between px-10 py-6 hover:bg-[#14151A]/30 transition-all group"
                                        >
                                            <div className="flex items-center space-x-5">
                                                <div className="relative">
                                                    <img src={user.avatarUrl} alt="" className="w-12 h-12 rounded-2xl border border-[#22242A] p-0.5 bg-[#0F1014] object-cover" />
                                                    {user.role === UserRole.Administrator && (
                                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#5E6AD2] rounded-lg flex items-center justify-center border-2 border-[#0F1014] text-white">
                                                            <Crown className="w-2.5 h-2.5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-[14px] font-bold text-[#E8E8E8] tracking-tight flex items-center space-x-2">
                                                        <span>{user.name}</span>
                                                        {user.id === currentUser.id && (
                                                            <span className="px-2 py-0.5 rounded-full bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 text-[9px] text-[#5E6AD2] font-black uppercase tracking-widest">SELF</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-[#5E6068] font-mono mt-0.5">{user.email}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-8">
                                                {canManage && user.id !== currentUser.id ? (
                                                    <div className="relative group/select">
                                                        <select
                                                            value={user.role}
                                                            onChange={(e) => onUpdateRole(user.id, e.target.value as UserRole)}
                                                            className="bg-[#14151A] border border-[#22242A] text-[10px] font-bold text-[#C0C4CC] rounded-xl pl-4 pr-10 py-2.5 focus:outline-none hover:border-[#5E6AD2]/50 cursor-pointer appearance-none uppercase tracking-widest transition-all"
                                                        >
                                                            <option value={UserRole.Administrator}>ADMINISTRATOR</option>
                                                            <option value={UserRole.TeamLead}>TEAM LEAD</option>
                                                            <option value={UserRole.Member}>MEMBER</option>
                                                            <option value={UserRole.Guest}>GUEST</option>
                                                        </select>
                                                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#3A3C46] pointer-events-none group-hover/select:text-[#5E6AD2] transition-colors" />
                                                    </div>
                                                ) : (
                                                    <div className="px-4 py-2 border border-[#22242A] bg-[#14151A]/50 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-[#5E6068] flex items-center">
                                                        {user.role}
                                                    </div>
                                                )}

                                                {canManage && user.id !== currentUser.id && (
                                                    <button
                                                        onClick={() => onRemoveUser(user.id)}
                                                        className="p-2.5 text-[#3A3C46] hover:text-red-500 hover:bg-red-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-10 flex-1 flex flex-col justify-center">
                            {!generatedLink ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-12 max-w-sm mx-auto w-full"
                                >
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.3em] ml-1">Recipient Identification</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-[#5E6AD2] transition-colors" />
                                                <input
                                                    type="email"
                                                    placeholder="agent@network.org"
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                    className="w-full bg-[#14151A] border border-[#22242A] rounded-2xl pl-12 pr-4 py-4 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#5E6AD2]/50 transition-all font-medium"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.3em] ml-1">Authorized Profile</label>
                                            <div className="relative group/select">
                                                <select
                                                    value={inviteRole}
                                                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                                    className="w-full bg-[#14151A] border border-[#22242A] rounded-2xl px-6 py-4 text-xs text-[#C0C4CC] focus:outline-none appearance-none cursor-pointer font-bold uppercase tracking-[0.2em] hover:border-[#5E6AD2]/50 transition-all"
                                                >
                                                    <option value={UserRole.Administrator}>ADMINISTRATOR</option>
                                                    <option value={UserRole.TeamLead}>TEAM LEAD</option>
                                                    <option value={UserRole.Member}>MEMBER</option>
                                                    <option value={UserRole.Guest}>GUEST</option>
                                                </select>
                                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] pointer-events-none group-hover/select:text-[#5E6AD2] transition-colors" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 flex flex-col space-y-6">
                                        <button
                                            onClick={handleGenerateLink}
                                            disabled={!inviteEmail}
                                            className="w-full bg-[#5E6AD2] hover:bg-[#4b55aa] text-white text-[11px] font-bold py-4 rounded-2xl transition-all uppercase tracking-[0.2em] disabled:opacity-20 shadow-xl shadow-[#5E6AD2]/20 flex items-center justify-center group"
                                        >
                                            <span>Generate Access Link</span>
                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                        <button onClick={resetInvite} className="w-full text-[10px] font-black text-[#3A3C46] hover:text-[#C0C4CC] uppercase tracking-[0.3em] transition-colors">Return to Registry</button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-10 flex flex-col items-center py-10 text-center max-w-md mx-auto w-full"
                                >
                                    <div className="w-20 h-20 bg-[#14151A] border border-[#22242A] rounded-3xl flex items-center justify-center text-[#5E6AD2] mb-2 shadow-2xl relative">
                                        <UserCheck className="w-10 h-10" />
                                        <div className="absolute inset-0 bg-[#5E6AD2]/20 blur-2xl rounded-full" />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-2xl font-bold text-[#E8E8E8] tracking-tight">Access Secure</h3>
                                        <p className="text-[11px] text-[#5E6068] font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[280px]">
                                            Signal generated for <span className="text-[#E8E8E8]">{inviteEmail}</span>. Distribute via secure channel.
                                        </p>
                                    </div>
                                    <div className="w-full space-y-4">
                                        <div className="bg-[#0A0A0C] border border-[#1A1C23] rounded-2xl px-6 py-4 text-[11px] text-[#5E6AD2] font-mono break-all leading-relaxed shadow-inner">
                                            {generatedLink}
                                        </div>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(generatedLink); }}
                                            className="w-full py-4 bg-[#14151A] hover:bg-[#1C1D24] text-[#C0C4CC] hover:text-white text-[11px] font-bold rounded-2xl transition-all uppercase tracking-[0.2em] border border-[#22242A] hover:border-[#5E6AD2]/30"
                                        >
                                            Duplicate Signal to Clipboard
                                        </button>
                                    </div>
                                    <button onClick={resetInvite} className="w-full py-2 text-[10px] font-black text-[#5E6AD2] hover:text-white uppercase tracking-[0.4em] transition-colors">Close Circuit</button>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Fixed Modal Footer for Registry Status */}
                    {view === 'list' && (
                        <div className="h-14 px-10 bg-[#14151A]/20 border-t border-[#1A1C23] flex items-center justify-between shrink-0">
                            <div className="flex items-center space-x-2">
                                <Activity className="w-3 h-3 text-[#5E6AD2]" />
                                <span className="text-[9px] font-black text-[#5E6068] uppercase tracking-[0.3em]">Registry Synchronized • {users.length} Authorized Units</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <ShieldAlert className="w-3.5 h-3.5 text-red-500/40" />
                                <span className="text-[9px] font-bold text-[#3A3C46] uppercase tracking-[0.2em]">Administrative Override Enabled</span>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
