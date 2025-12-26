import React, { useState, useEffect } from 'react';
import { X, Settings, Globe, Lock, Copy, Check, ExternalLink } from 'lucide-react';
import { Project } from '../types';

interface ProjectSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
    onUpdate: (projectId: string, updates: Partial<Project>) => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
    isOpen,
    onClose,
    project,
    onUpdate
}) => {
    const [isPublic, setIsPublic] = useState(false);
    const [publicSlug, setPublicSlug] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (project) {
            setIsPublic(project.isPublic || false);
            setPublicSlug(project.publicSlug || project.identifier.toLowerCase());
        }
    }, [project]);

    if (!isOpen || !project) return null;

    const publicUrl = `${window.location.origin}/public/${publicSlug}`;

    const handleTogglePublic = () => {
        const newIsPublic = !isPublic;
        setIsPublic(newIsPublic);

        // Generate slug if enabling public access
        if (newIsPublic && !publicSlug) {
            setPublicSlug(project.identifier.toLowerCase());
        }

        onUpdate(project.id, {
            isPublic: newIsPublic,
            publicSlug: newIsPublic ? (publicSlug || project.identifier.toLowerCase()) : undefined
        });
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setPublicSlug(slug);
    };

    const handleSlugBlur = () => {
        if (isPublic && publicSlug) {
            onUpdate(project.id, { publicSlug });
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#25262B] w-[450px] rounded-xl shadow-2xl border border-[#363840] p-6 animate-in zoom-in-95">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white flex items-center">
                        <Settings className="w-4 h-4 mr-2 text-gray-400" />
                        Project Settings
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Project Info */}
                <div className="mb-6 p-3 bg-[#1E1F24] rounded-lg border border-[#363840]">
                    <div className="flex items-center space-x-3">
                        <span className="text-2xl">{project.icon}</span>
                        <div>
                            <h3 className="font-medium text-white">{project.name}</h3>
                            <p className="text-xs text-gray-500">{project.identifier}</p>
                        </div>
                    </div>
                </div>

                {/* Public Sharing Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {isPublic ? (
                                <Globe className="w-5 h-5 text-green-400" />
                            ) : (
                                <Lock className="w-5 h-5 text-gray-500" />
                            )}
                            <div>
                                <h4 className="text-sm font-medium text-white">Public Access</h4>
                                <p className="text-xs text-gray-500">
                                    {isPublic
                                        ? 'Anyone with the link can view'
                                        : 'Only team members can access'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleTogglePublic}
                            className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-green-500' : 'bg-[#363840]'
                                }`}
                        >
                            <span
                                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isPublic ? 'left-6' : 'left-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {isPublic && (
                        <div className="pl-8 space-y-3 animate-in fade-in duration-200">
                            {/* Custom Slug */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                    Public URL Slug
                                </label>
                                <input
                                    type="text"
                                    value={publicSlug}
                                    onChange={handleSlugChange}
                                    onBlur={handleSlugBlur}
                                    className="w-full bg-[#191A1F] border border-[#363840] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5E6AD2] font-mono"
                                    placeholder={project.identifier.toLowerCase()}
                                />
                            </div>

                            {/* Shareable Link */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                    Shareable Link
                                </label>
                                <div className="flex items-center space-x-2">
                                    <div className="flex-1 bg-[#191A1F] border border-[#363840] rounded-md px-3 py-2 text-sm text-gray-300 font-mono truncate">
                                        {publicUrl}
                                    </div>
                                    <button
                                        onClick={handleCopyLink}
                                        className={`p-2 rounded-md border transition-all ${copied
                                                ? 'bg-green-500/20 border-green-500 text-green-400'
                                                : 'bg-[#363840] border-[#464852] text-gray-400 hover:text-white'
                                            }`}
                                        title="Copy link"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                    <a
                                        href={publicUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-[#363840] border border-[#464852] rounded-md text-gray-400 hover:text-white transition-colors"
                                        title="Open in new tab"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>

                            <p className="text-xs text-yellow-500/80 flex items-center">
                                ⚠️ Public projects are visible to anyone with the link
                            </p>
                        </div>
                    )}
                </div>

                {/* Close Button */}
                <div className="mt-6 pt-4 border-t border-[#363840] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-[#363840] hover:bg-[#464852] text-white text-sm font-medium rounded transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
