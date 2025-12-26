import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Lock, Camera, Shield } from 'lucide-react';
import { User, Team } from '../types';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
    onSave: (data: Partial<User>) => void;
    currentTeam?: Team;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, currentUser, onSave, currentTeam }) => {
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name);
            setAvatarUrl(currentUser.avatarUrl);
            setPassword(currentUser.password || '');
        }
    }, [currentUser, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            avatarUrl,
            password: password || undefined // Only update if provided
        });
        onClose();
    };

    if (!isOpen || !currentUser) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#25262B] w-[450px] rounded-xl shadow-2xl border border-[#363840] overflow-hidden animate-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between px-5 py-4 border-b border-[#363840]">
                    <h2 className="text-sm font-semibold text-white">Edit Profile</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Avatar */}
                    <div className="flex items-center space-x-4">
                        <div className="relative group w-16 h-16 rounded-full overflow-hidden border border-[#363840]">
                            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Camera className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Avatar URL</label>
                            <input
                                type="text"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                className="w-full bg-[#1E1F24] border border-[#363840] rounded p-2 text-sm text-white focus:border-[#5E6AD2] focus:outline-none transition-colors"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[#1E1F24] border border-[#363840] rounded p-2 pl-9 text-sm text-white focus:border-[#5E6AD2] focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Email (Read only) */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Email (Cannot be changed)</label>
                        <div className="relative opacity-50">
                            <input
                                type="email"
                                value={currentUser.email}
                                readOnly
                                className="w-full bg-[#1E1F24] border border-[#363840] rounded p-2 text-sm text-gray-400 cursor-not-allowed focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#1E1F24] border border-[#363840] rounded p-2 pl-9 text-sm text-white focus:border-[#5E6AD2] focus:outline-none transition-colors"
                                placeholder="Leave blank to keep current"
                            />
                        </div>
                    </div>

                    {/* Team (Read only display) */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Team</label>
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center px-3 py-2 bg-[#2E3036] rounded border border-[#363840]">
                                <span className="w-4 h-4 flex items-center justify-center bg-blue-500/20 text-blue-400 rounded-sm text-[10px] mr-2">
                                    {currentTeam?.icon || 'T'}
                                </span>
                                <span className="text-sm text-gray-300">{currentTeam?.name || 'No Team'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full bg-[#5E6AD2] hover:bg-[#4b55aa] text-white py-2 rounded font-medium transition-colors shadow-lg shadow-purple-900/20"
                        >
                            Save Changes
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};
