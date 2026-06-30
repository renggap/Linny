
import React, { useState, useEffect } from 'react';
import { X, Shield, Trash2, Search, Plus, ChevronDown, Mail, UserCheck, ShieldAlert, Activity, ArrowRight, Crown, Loader2 } from 'lucide-react';
import { User, UserRole, Team } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { UserAvatar } from './UserAvatar';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';
import { getEffectiveRole, canManageTeam } from '../lib/roleUtils';

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
    const [inviteSearchQuery, setInviteSearchQuery] = useState('');
    const [view, setView] = useState<'list' | 'invite'>('list');
    const [inviteMethod, setInviteMethod] = useState<'existing' | 'email'>('existing');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.Member);
    const [isSending, setIsSending] = useState(false);
    const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [directInviteLoadingId, setDirectInviteLoadingId] = useState<string | null>(null);

    // Reset all view state when modal closes, so reopening always lands on
    // the member list. Without this, the component stays mounted (returns null
    // when !isOpen) but its local state persists — reopening resumes the
    // invite-by-email view from the previous session.
    useEffect(() => {
        if (!isOpen) {
            setView('list');
            setInviteMethod('existing');
            setInviteEmail('');
            setSearchQuery('');
            setInviteSearchQuery('');
            setInviteStatus(null);
            setDirectInviteLoadingId(null);
        }
    }, [isOpen]);

    // Use the useWorkspaceMembers hook for base filtering, then apply search query
    // MUST be called before any early return to follow React's Rules of Hooks
    const workspaceMembers = useWorkspaceMembers(currentTeam, users);

    if (!isOpen) return null;

    // For list view: filter current team members
    const filteredUsers = workspaceMembers
        .filter(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            // Get effective role for each user
            const roleA = getEffectiveRole(a, currentTeam);
            const roleB = getEffectiveRole(b, currentTeam);

            // Sort by role priority: Administrator > TeamLead > Member > Guest
            const roleOrder = [UserRole.Administrator, UserRole.TeamLead, UserRole.Member, UserRole.Guest];
            const indexA = roleOrder.indexOf(roleA as UserRole);
            const indexB = roleOrder.indexOf(roleB as UserRole);

            if (indexA !== indexB) {
                return indexA - indexB;
            }

            // Secondary sort by name alphabetically
            return a.name.localeCompare(b.name);
        });

    // For invite view: show all users NOT in current team
    const currentTeamMemberIds = new Set(workspaceMembers.map(u => u.id));
    const availableUsers = users.filter(u => !currentTeamMemberIds.has(u.id));
    const filteredAvailableUsers = availableUsers.filter(u =>
        u.name.toLowerCase().includes(inviteSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(inviteSearchQuery.toLowerCase())
    );

    // For list view: when the member-search query also matches non-members,
    // surface them below the member list with a direct Add-to-Team button.
    // Without this, searching "Henry" (a non-member) in the list view looked
    // like the user didn't exist.
    const matchingNonMembers = searchQuery.trim().length === 0 ? [] : availableUsers.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDirectInvite = async (email: string) => {
        if (!currentTeam) return;
        setDirectInviteLoadingId(email);
        try {
            const result = await api.invitations.sendInvite(email, currentTeam.id, UserRole.Member);
            if ('user' in result) {
                setInviteStatus({ type: 'success', message: `${result.user.name} has been added to the team` });
            } else {
                setInviteStatus({ type: 'success', message: `Invitation sent to ${email}` });
            }
            onInviteUser(email, UserRole.Member);
            setTimeout(() => setInviteStatus(null), 2500);
        } catch (error: any) {
            setInviteStatus({ type: 'error', message: error.message || 'Failed to add user' });
        } finally {
            setDirectInviteLoadingId(null);
        }
    };

    const canManage = canManageTeam(currentUser, currentTeam);

    const handleSendInvite = async () => {
        if (!inviteEmail || !currentTeam) return;

        setIsSending(true);
        setInviteStatus(null);

        try {
            const result = await api.invitations.sendInvite(inviteEmail, currentTeam.id, inviteRole);
            setIsSending(false);

            if ('user' in result) {
                // User was already registered and added immediately
                setInviteStatus({ type: 'success', message: `${result.user.name} has been added to the team` });
                onInviteUser(inviteEmail, inviteRole);
            } else {
                // Invitation was sent via email
                setInviteStatus({ type: 'success', message: `Invitation sent to ${inviteEmail}` });
                onInviteUser(inviteEmail, inviteRole);
            }

            // Reset form after 2 seconds
            setTimeout(() => {
                setInviteEmail('');
                setInviteRole(UserRole.Member);
                setInviteStatus(null);
                setView('list');
            }, 2000);
        } catch (error: any) {
            setIsSending(false);
            setInviteStatus({ type: 'error', message: error.message || 'Failed to send invitation' });
        }
    };

    const handleAddUser = async (user: User) => {
        if (!currentTeam) return;

        setIsSending(true);
        setInviteStatus(null);

        try {
            const result = await api.invitations.sendInvite(user.email, currentTeam.id, inviteRole);
            setIsSending(false);

            if ('user' in result) {
                setInviteStatus({ type: 'success', message: `${result.user.name} has been added to the team` });
            } else {
                setInviteStatus({ type: 'success', message: `Invitation sent to ${user.email}` });
            }

            // Reset form after 2 seconds
            setTimeout(() => {
                setInviteSearchQuery('');
                setInviteRole(UserRole.Member);
                setInviteStatus(null);
                setView('list');
            }, 2000);
        } catch (error: any) {
            setIsSending(false);
            setInviteStatus({ type: 'error', message: error.message || 'Failed to add user' });
        }
    };

    const resetInvite = () => {
        setInviteEmail('');
        setInviteSearchQuery('');
        setInviteRole(UserRole.Member);
        setInviteStatus(null);
        setInviteMethod('existing');
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="bg-[#0F1014] w-full max-w-[700px] h-[85vh] rounded-[32px] shadow-[0_48px_140px_-20px_rgba(0,0,0,0.9)] border border-[#22242A] flex flex-col overflow-hidden relative z-10"
                >
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-10 h-20 border-b border-[#1A1C23] bg-[#14151A]/30 shrink-0">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-[#1A1C23] border border-[#2C2D35] flex items-center justify-center shadow-inner">
                                {view === 'invite' ? <Plus className="w-5 h-5 text-accent" /> : <Shield className="w-5 h-5 text-accent" />}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[#E8E8E8] tracking-tight">
                                    {view === 'invite' ? 'Invite User' : 'Team Members'}
                                </h2>
                                <div className="flex items-center space-x-2 mt-0.5">
                                    <span className="text-[9px] font-black text-[#5E6068] uppercase tracking-[0.3em]">
                                        {view === 'invite' ? 'Send Invitation' : 'Manage Team Access'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-[#5E6068] hover:text-[#E8E8E8] hover:bg-[#1C1D24] transition-all">
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
                                        placeholder="Search by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-4 py-3 text-[13px] text-[#C0C4CC] placeholder-[#2C2D35] focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all font-medium"
                                    />
                                </div>
                                {canManage && (
                                    <button
                                        onClick={() => setView('invite')}
                                        className="ml-6 px-6 py-3 bg-[#1A1C23] hover:bg-[#22242A] border border-[#2C2D35] hover:border-accent/40 text-[#C0C4CC] text-[11px] font-bold flex items-center transition-all uppercase tracking-[0.2em] group"
                                        title="Invite a user by email who isn't already registered"
                                    >
                                        <Mail className="w-4 h-4 mr-2" />
                                        Invite by Email
                                    </button>
                                )}
                            </div>

                            {/* Users List */}
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
                                                    <UserAvatar name={user.name} size="lg" className="" />
                                                    {user.role === UserRole.Administrator && (
                                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent flex items-center justify-center border-2 border-[#0F1014] text-white">
                                                            <Crown className="w-2.5 h-2.5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-[14px] font-bold text-[#E8E8E8] tracking-tight flex items-center space-x-2">
                                                        <span>{user.name}</span>
                                                        {user.id === currentUser.id && (
                                                            <span className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[9px] text-accent font-black uppercase tracking-widest">YOU</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-[#5E6068] font-mono mt-0.5">{user.email}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-8">
                                                {canManage && user.id !== currentUser.id ? (
                                                    <div className="relative group/select">
                                                        <select
                                                            value={getEffectiveRole(user, currentTeam)}
                                                            onChange={(e) => onUpdateRole(user.id, e.target.value as UserRole)}
                                                            className="bg-[#14151A] border border-[#22242A] text-[10px] font-bold text-[#C0C4CC] pl-4 pr-10 py-2.5 focus:outline-none hover:border-accent/50 cursor-pointer appearance-none uppercase tracking-widest transition-all"
                                                        >
                                                            <option value={UserRole.Administrator}>ADMINISTRATOR</option>
                                                            <option value={UserRole.TeamLead}>TEAM LEAD</option>
                                                            <option value={UserRole.Member}>MEMBER</option>
                                                            <option value={UserRole.Guest}>GUEST</option>
                                                        </select>
                                                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#3A3C46] pointer-events-none group-hover/select:text-accent transition-colors" />
                                                    </div>
                                                ) : (
                                                    <div className="px-4 py-2 border border-[#22242A] bg-[#14151A]/50 text-[10px] font-black uppercase tracking-[0.2em] text-[#5E6068] flex items-center">
                                                        {getEffectiveRole(user, currentTeam)}
                                                    </div>
                                                )}

                                                {canManage && user.id !== currentUser.id && (
                                                    <button
                                                        onClick={() => onRemoveUser(user.id)}
                                                        className="p-2.5 text-[#3A3C46] hover:text-red-500 hover:bg-red-500/5 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}

                                    {/* When the member search has matches but there are also non-members
                                        that fit the query, surface them with a direct Add button. Fixes
                                        the UX trap where searching for a non-member in the list view
                                        appeared to find nothing. */}
                                    {searchQuery.trim().length > 0 && matchingNonMembers.length > 0 && (
                                        <div className="mt-2 border-t border-[#1A1C23] pt-4">
                                            <div className="px-10 py-2 text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.3em]">
                                                Not in this team · {matchingNonMembers.length}
                                            </div>
                                            {matchingNonMembers.map((user) => (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center justify-between px-10 py-4 hover:bg-[#14151A]/30 transition-all group"
                                                >
                                                    <div className="flex items-center space-x-4">
                                                        <UserAvatar name={user.name} size="md" />
                                                        <div>
                                                            <div className="text-sm font-bold text-[#E8E8E8]">{user.name}</div>
                                                            <div className="text-xs text-[#5E6068] font-mono">{user.email}</div>
                                                        </div>
                                                    </div>
                                                    {canManage ? (
                                                        <button
                                                            onClick={() => handleDirectInvite(user.email)}
                                                            disabled={directInviteLoadingId === user.id}
                                                            className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                                                        >
                                                            {directInviteLoadingId === user.id ? 'Adding…' : 'Add to Team'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] text-[#3A3C46] uppercase tracking-wider">No permission</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {searchQuery.trim().length > 0 && filteredUsers.length === 0 && matchingNonMembers.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <Search className="w-12 h-12 text-[#3A3C46] mb-4" />
                                            <p className="text-sm text-[#5E6068] font-medium">No users match "{searchQuery}"</p>
                                            <p className="text-xs text-[#3A3C46] mt-1">Try inviting by email instead</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col h-full">
                            {!inviteStatus ? (
                                <>
                                    {/* Tabs */}
                                    <div className="px-10 py-5 border-b border-[#1A1C23] bg-[#14151A]/30 shrink-0">
                                        <div className="flex items-center space-x-1 bg-[#14151A] p-1 w-fit">
                                            <button
                                                onClick={() => setInviteMethod('existing')}
                                                className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] transition-all ${
                                                    inviteMethod === 'existing'
                                                        ? 'bg-accent text-white shadow-lg'
                                                        : 'text-[#5E6068] hover:text-[#C0C4CC] hover:bg-[#1A1C23]'
                                                }`}
                                            >
                                                Add Existing User
                                            </button>
                                            <button
                                                onClick={() => setInviteMethod('email')}
                                                className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] transition-all ${
                                                    inviteMethod === 'email'
                                                        ? 'bg-accent text-white shadow-lg'
                                                        : 'text-[#5E6068] hover:text-[#C0C4CC] hover:bg-[#1A1C23]'
                                                }`}
                                            >
                                                Send Email Invite
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tab Content */}
                                    <div className="flex-1 overflow-y-auto no-scrollbar">
                                        {inviteMethod === 'existing' ? (
                                            // === Add Existing User Tab ===
                                            <div className="px-10 py-6">
                                                <h3 className="text-sm font-bold text-[#E8E8E8] mb-2">Add Existing User</h3>
                                                <p className="text-[11px] text-[#5E6068] mb-4">Search for users already registered on the platform and add them to this workspace.</p>

                                                {/* Search */}
                                                <div className="relative mb-6">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46]" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search by name or email..."
                                                        value={inviteSearchQuery}
                                                        onChange={(e) => setInviteSearchQuery(e.target.value)}
                                                        className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-4 py-3 text-[13px] text-[#C0C4CC] placeholder-[#2C2D35] focus:outline-none focus:border-accent/50 transition-all"
                                                        autoFocus
                                                    />
                                                </div>

                                                {/* Role Selector */}
                                                <div className="flex items-center space-x-3 mb-6">
                                                    <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.3em]">Role:</label>
                                                    <div className="relative group/select">
                                                        <select
                                                            value={inviteRole}
                                                            onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                                            className="bg-[#14151A] border border-[#22242A] px-4 py-2 text-xs text-[#C0C4CC] focus:outline-none appearance-none cursor-pointer font-bold uppercase tracking-[0.15em] hover:border-accent/50 transition-all"
                                                        >
                                                            <option value={UserRole.Administrator}>ADMINISTRATOR</option>
                                                            <option value={UserRole.TeamLead}>TEAM LEAD</option>
                                                            <option value={UserRole.Member}>MEMBER</option>
                                                            <option value={UserRole.Guest}>GUEST</option>
                                                        </select>
                                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#3A3C46] pointer-events-none group-hover/select:text-accent transition-colors" />
                                                    </div>
                                                </div>

                                                {/* User List */}
                                                {filteredAvailableUsers.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                                        <Search className="w-12 h-12 text-[#3A3C46] mb-4" />
                                                        <p className="text-sm text-[#5E6068] font-medium">No users found</p>
                                                        <p className="text-xs text-[#3A3C46] mt-1">Try adjusting your search or invite by email</p>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-[#1A1C23]/50">
                                                        {filteredAvailableUsers.map((user, idx) => (
                                                            <motion.div
                                                                key={user.id}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: idx * 0.03 }}
                                                                className="flex items-center justify-between py-4 hover:bg-[#14151A]/30 transition-all group"
                                                            >
                                                                <div className="flex items-center space-x-4">
                                                                    <UserAvatar name={user.name} size="md" className="" />
                                                                    <div>
                                                                        <div className="text-sm font-bold text-[#E8E8E8]">{user.name}</div>
                                                                        <div className="text-xs text-[#5E6068] font-mono">{user.email}</div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleAddUser(user)}
                                                                    disabled={isSending}
                                                                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all uppercase tracking-[0.15em] disabled:opacity-50 flex items-center"
                                                                >
                                                                    {isSending ? (
                                                                        <>
                                                                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                                                            <span>Adding...</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Plus className="w-3 h-3 mr-1" />
                                                                            <span>Add</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            // === Send Email Invite Tab ===
                                            <div className="p-10">
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="space-y-8 max-w-sm mx-auto w-full"
                                                >
                                                    <div className="text-center mb-6">
                                                        <Mail className="w-12 h-12 text-accent mx-auto mb-3" />
                                                        <h3 className="text-lg font-bold text-[#E8E8E8]">Invite by Email</h3>
                                                        <p className="text-[11px] text-[#5E6068] mt-2">Send an invitation to someone who isn't registered yet.</p>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.3em] ml-1">Email Address</label>
                                                            <div className="relative group">
                                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] group-focus-within:text-accent transition-colors" />
                                                                <input
                                                                    type="email"
                                                                    placeholder="user@example.com"
                                                                    value={inviteEmail}
                                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                                    className="w-full bg-[#14151A] border border-[#22242A] pl-12 pr-4 py-4 text-sm text-[#E8E8E8] focus:outline-none focus:border-accent/50 transition-all font-medium"
                                                                    autoFocus
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.3em] ml-1">Role</label>
                                                            <div className="relative group/select">
                                                                <select
                                                                    value={inviteRole}
                                                                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                                                    className="w-full bg-[#14151A] border border-[#22242A] px-6 py-4 text-xs text-[#C0C4CC] focus:outline-none appearance-none cursor-pointer font-bold uppercase tracking-[0.2em] hover:border-accent/50 transition-all"
                                                                >
                                                                    <option value={UserRole.Administrator}>ADMINISTRATOR</option>
                                                                    <option value={UserRole.TeamLead}>TEAM LEAD</option>
                                                                    <option value={UserRole.Member}>MEMBER</option>
                                                                    <option value={UserRole.Guest}>GUEST</option>
                                                                </select>
                                                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A3C46] pointer-events-none group-hover/select:text-accent transition-colors" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 flex flex-col space-y-3">
                                                        <button
                                                            onClick={handleSendInvite}
                                                            disabled={!inviteEmail || isSending}
                                                            className="w-full bg-accent hover:bg-accent-hover text-white text-[11px] font-bold py-4 transition-all uppercase tracking-[0.2em] disabled:opacity-20 shadow-xl shadow-accent/20 flex items-center justify-center group"
                                                        >
                                                            {isSending ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                    <span>Sending...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>Send Invitation</span>
                                                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-10 flex flex-col items-center py-10 text-center max-w-md mx-auto w-full"
                                >
                                    <div className={`w-20 h-20 bg-[#14151A] border border-[#22242A] rounded-3xl flex items-center justify-center mb-2 shadow-popover relative ${inviteStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                        {inviteStatus.type === 'success' ? (
                                            <UserCheck className="w-10 h-10" />
                                        ) : (
                                            <ShieldAlert className="w-10 h-10" />
                                        )}
                                        <div className={`absolute inset-0 blur-2xl rounded-full ${inviteStatus.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`} />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-2xl font-bold text-[#E8E8E8] tracking-tight">
                                            {inviteStatus.type === 'success' ? 'Success' : 'Failed'}
                                        </h3>
                                        <p className="text-[11px] text-[#5E6068] font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[280px]">
                                            {inviteStatus.message}
                                        </p>
                                    </div>
                                    <button onClick={resetInvite} className="text-[10px] font-bold text-[#3A3C46] hover:text-[#C0C4CC] uppercase tracking-[0.3em] transition-colors">
                                        ← Back to Team Members
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Fixed Modal Footer */}
                    {view === 'list' && (
                        <div className="h-14 px-10 bg-[#14151A]/20 border-t border-[#1A1C23] flex items-center justify-between shrink-0">
                            <div className="flex items-center space-x-2">
                                <Activity className="w-3 h-3 text-accent" />
                                <span className="text-[9px] font-black text-[#5E6068] uppercase tracking-[0.3em]">Team Members • {workspaceMembers.length} Members</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <ShieldAlert className="w-3.5 h-3.5 text-red-500/40" />
                                <span className="text-[9px] font-bold text-[#3A3C46] uppercase tracking-[0.2em]">Admin Access Enabled</span>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
