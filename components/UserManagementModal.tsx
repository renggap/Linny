
import React, { useState } from 'react';
import { X, Shield, UserCog, Trash2, Search, Link, Copy, Plus, ChevronDown } from 'lucide-react';
import { User, UserRole, Team } from '../types';

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

    // Invite State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.Member);
    const [generatedLink, setGeneratedLink] = useState('');

    if (!isOpen) return null;

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const canManage = currentUser.role === UserRole.Admin || currentUser.role === UserRole.TeamLead;

    const handleGenerateLink = () => {
        if (!inviteEmail) return;

        // In a real app, this would call an API to generate a secure token.
        // For this clone, we'll encode the data in the URL params.
        const baseUrl = window.location.origin;
        const params = new URLSearchParams();
        params.set('inviteEmail', inviteEmail);
        if (currentTeam) params.set('inviteTeamId', currentTeam.id);
        params.set('inviteRole', inviteRole);

        const link = `${baseUrl}?${params.toString()}`;
        setGeneratedLink(link);
        onInviteUser(inviteEmail, inviteRole);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        alert('Link copied to clipboard!');
    };

    const resetInvite = () => {
        setInviteEmail('');
        setInviteRole(UserRole.Member);
        setGeneratedLink('');
        setView('list');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#25262B] w-[600px] max-h-[85vh] rounded-xl shadow-2xl border border-[#363840] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#363840]">
                    <h2 className="text-lg font-semibold text-white flex items-center">
                        <UserCog className="w-5 h-5 mr-3 text-gray-400" />
                        {view === 'invite' ? 'Invite to Team' : 'Team Members'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {view === 'list' ? (
                    <>
                        {/* Filter & Actions */}
                        <div className="px-6 py-4 border-b border-[#363840] flex items-center justify-between">
                            <div className="relative flex-1 mr-4">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search members..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#1E1F24] border border-[#363840] rounded-md pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#5E6AD2] transition-colors"
                                />
                            </div>
                            {canManage && (
                                <button
                                    onClick={() => setView('invite')}
                                    className="bg-[#5E6AD2] hover:bg-[#4b55aa] text-white text-xs font-semibold px-3 py-2 rounded-md shadow-lg shadow-purple-900/20 flex items-center transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                                    Invite new members
                                </button>
                            )}
                        </div>

                        {/* User List */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredUsers.map(user => (
                                <div key={user.id} className="flex items-center justify-between px-6 py-4 border-b border-[#363840] hover:bg-[#2E3036] transition-colors group">
                                    <div className="flex items-center space-x-3">
                                        <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full border border-[#363840]" />
                                        <div>
                                            <div className="text-sm font-medium text-white flex items-center">
                                                {user.name}
                                                {user.id === currentUser.id && <span className="ml-2 text-[10px] bg-[#363840] text-gray-400 px-1.5 py-0.5 rounded">You</span>}
                                            </div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        {canManage && user.id !== currentUser.id ? (
                                            <select
                                                value={user.role}
                                                onChange={(e) => onUpdateRole(user.id, e.target.value as UserRole)}
                                                className="bg-[#1E1F24] border border-[#363840] text-xs text-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#5E6AD2] cursor-pointer"
                                            >
                                                <option value={UserRole.Admin} className="bg-[#25262B]">Admin</option>
                                                <option value={UserRole.TeamLead} className="bg-[#25262B]">Team Lead</option>
                                                <option value={UserRole.Member} className="bg-[#25262B]">Member</option>
                                                <option value={UserRole.Viewer} className="bg-[#25262B]">Viewer</option>
                                            </select>
                                        ) : (
                                            <div className="flex items-center text-xs text-gray-400 bg-[#363840]/50 px-2 py-1 rounded border border-[#363840]">
                                                {user.role === UserRole.Admin && <Shield className="w-3 h-3 mr-1.5 text-[#5E6AD2]" />}
                                                {user.role}
                                            </div>
                                        )}

                                        {canManage && user.id !== currentUser.id && (
                                            <button
                                                onClick={() => onRemoveUser(user.id)}
                                                className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                title="Remove user"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="px-6 py-4 bg-[#202126] border-t border-[#363840] flex justify-between items-center text-xs text-gray-500">
                            <span>{filteredUsers.length} members</span>
                            {canManage && <span className="text-gray-400">Admins can manage teams and billing.</span>}
                        </div>
                    </>
                ) : (
                    <div className="p-6 flex flex-col h-full">
                        {!generatedLink ? (
                            <div className="space-y-6">
                                <div className="text-sm text-gray-400">
                                    Invite a new member to <strong className="text-white">{currentTeam?.name}</strong>. They will receive an email with a link to join.
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="colleague@acme.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full bg-[#1E1F24] border border-[#363840] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5E6AD2] transition-colors"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Role</label>
                                    <div className="relative">
                                        <select
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                            className="w-full bg-[#1E1F24] border border-[#363840] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5E6AD2] appearance-none cursor-pointer"
                                        >
                                            <option value={UserRole.Admin} className="bg-[#25262B]">Admin - Full access to all settings</option>
                                            <option value={UserRole.TeamLead} className="bg-[#25262B]">Team Lead - Manage team members and issues</option>
                                            <option value={UserRole.Member} className="bg-[#25262B]">Member - Create and manage issues</option>
                                            <option value={UserRole.Viewer} className="bg-[#25262B]">Viewer - Read-only access</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-end space-x-3">
                                    <button onClick={resetInvite} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                                    <button
                                        onClick={handleGenerateLink}
                                        disabled={!inviteEmail}
                                        className={`bg-[#5E6AD2] hover:bg-[#4b55aa] text-white text-sm font-semibold px-4 py-2 rounded-md shadow-lg shadow-purple-900/20 transition-all ${!inviteEmail ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        Generate Invite Link
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 flex flex-col justify-center flex-1">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className="w-12 h-12 bg-[#5E6AD2]/20 rounded-full flex items-center justify-center text-[#5E6AD2]">
                                        <Link className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Invite Link Generated</h3>
                                        <p className="text-sm text-gray-400 mt-1">Share this link with <span className="text-white">{inviteEmail}</span> to let them join the team.</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={generatedLink}
                                        className="flex-1 bg-[#15161A] border border-[#363840] rounded px-3 py-2 text-xs text-gray-300 font-mono focus:outline-none"
                                    />
                                    <button
                                        onClick={copyLink}
                                        className="p-2 bg-[#2E3036] hover:bg-[#363840] rounded border border-[#363840] text-gray-300 transition-colors"
                                        title="Copy to clipboard"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex-1"></div>

                                <button onClick={resetInvite} className="w-full text-center text-sm text-gray-500 hover:text-gray-300">
                                    Back to members list
                                </button>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};
