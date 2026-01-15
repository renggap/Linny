
import React, { useState, useEffect } from 'react';
import { X, Globe, Lock, Copy, Check, ExternalLink, FileText, Settings, Activity, ArrowRight, Layout } from 'lucide-react';
import { Project } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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
    const [localDescription, setLocalDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (project) {
            setIsPublic(project.isPublic || false);
            setPublicSlug(project.publicSlug || project.identifier.toLowerCase());
            setLocalDescription(project.description || '');
        }
    }, [project]);

    if (!isOpen || !project) return null;

    const publicUrl = `${window.location.origin}/public/${publicSlug}`;

    const handleTogglePublic = () => {
        const newIsPublic = !isPublic;
        setIsPublic(newIsPublic);
        if (newIsPublic && !publicSlug) setPublicSlug(project.identifier.toLowerCase());
        onUpdate(project.id, {
            isPublic: newIsPublic,
            publicSlug: newIsPublic ? (publicSlug || project.identifier.toLowerCase()) : undefined
        });
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    };

    const handleSlugBlur = () => {
        if (isPublic && publicSlug) onUpdate(project.id, { publicSlug });
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveDescription = () => {
        if (localDescription !== project.description) {
            onUpdate(project.id, { description: localDescription });
        }
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
                    className="bg-[#0F1014] w-full max-w-[580px] rounded-3xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border border-[#22242A] flex flex-col overflow-hidden relative z-10"
                >
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-8 h-14 border-b border-[#1A1C23] bg-[#14151A]/30 shrink-0">
                        <div className="flex items-center space-x-3">
                            <Settings className="w-4 h-4 text-[#5E6AD2]" />
                            <h2 className="text-[10px] font-black text-[#5E6068] uppercase tracking-[0.3em]">Unit Configuration • {project.identifier}</h2>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-[#5E6068] hover:text-[#E8E8E8] hover:bg-[#1C1D24] rounded-lg transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-8 space-y-12 overflow-y-auto no-scrollbar max-h-[75vh]">
                        {/* Identity Section */}
                        <div className="flex items-center space-x-6 pb-12 border-b border-[#1A1C23]">
                            <div className="w-20 h-20 bg-[#14151A] border border-[#22242A] rounded-2xl flex items-center justify-center text-4xl shadow-inner relative group">
                                {project.icon}
                                <div className="absolute inset-x-2 bottom-[-1px] h-px bg-[#5E6AD2] opacity-30" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-[#E8E8E8] tracking-tight leading-none mb-2">{project.name}</h3>
                                <p className="text-[10px] text-[#5E6068] font-black uppercase tracking-[0.4em]">Segmental Objective Root</p>
                            </div>
                        </div>

                        {/* Description Editor */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-1.5 rounded bg-[#1A1C23] border border-[#2C2D35]">
                                    <FileText className="w-3 h-3 text-[#5E6AD2]" />
                                </div>
                                <label className="text-[10px] font-black text-[#E8E8E8] uppercase tracking-[0.2em]">Deployment Manifesto</label>
                            </div>
                            <textarea
                                value={localDescription}
                                onChange={(e) => setLocalDescription(e.target.value)}
                                onBlur={handleSaveDescription}
                                className="w-full bg-[#14151A] border border-[#22242A] rounded-2xl px-6 py-4 text-sm text-[#C0C4CC] focus:outline-none focus:border-[#5E6AD2]/50 focus:ring-4 focus:ring-[#5E6AD2]/5 transition-all resize-none h-32 placeholder:text-[#2C2D35] leading-relaxed"
                                placeholder="Formalize operational objectives..."
                            />
                        </div>

                        {/* Access Control & Registry */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3">
                                <div className="p-1.5 rounded bg-[#1A1C23] border border-[#2C2D35]">
                                    <Globe className="w-3 h-3 text-[#5E6AD2]" />
                                </div>
                                <label className="text-[10px] font-black text-[#E8E8E8] uppercase tracking-[0.2em]">Registry Access Protocol</label>
                            </div>

                            <div className="bg-[#14151A] border border-[#22242A] rounded-2xl p-6 space-y-8 relative overflow-hidden">
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-[#E8E8E8]">Broadcast Visibility</h4>
                                        <div className="flex items-center space-x-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", isPublic ? "bg-[#5E6AD2] shadow-[0_0_8px_rgba(94,106,210,0.6)]" : "bg-[#3A3C46]")} />
                                            <p className="text-[11px] text-[#5E6068] font-bold uppercase tracking-wider">
                                                {isPublic ? 'Public Relay Active' : 'Restricted Internal Loop'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleTogglePublic}
                                        className={cn(
                                            "relative w-11 h-6 rounded-full transition-all duration-300 border",
                                            isPublic ? "bg-[#5E6AD2] border-[#5E6AD2]" : "bg-[#0F1014] border-[#22242A]"
                                        )}
                                    >
                                        <motion.div
                                            animate={{ x: isPublic ? 20 : 0 }}
                                            className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                                        />
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {isPublic && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="pt-6 border-t border-[#1A1C23] space-y-6 overflow-hidden"
                                        >
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black text-[#3A3C46] uppercase tracking-[0.2em] ml-1">Universal Segment Address</span>
                                                <div className="relative group">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A3C46] text-xs font-mono font-bold select-none">/public/</div>
                                                    <input
                                                        type="text"
                                                        value={publicSlug}
                                                        onChange={handleSlugChange}
                                                        onBlur={handleSlugBlur}
                                                        className="w-full bg-[#0F1014] border border-[#22242A] rounded-xl pl-[72px] pr-4 py-3 text-sm font-mono text-[#5E6AD2] font-bold focus:outline-none focus:border-[#5E6AD2]/30 transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black text-[#3A3C46] uppercase tracking-[0.2em] ml-1">End-Point Signal</span>
                                                <div className="flex items-center space-x-2 bg-[#0F1014] border border-[#22242A] rounded-xl px-4 py-3 group">
                                                    <div className="flex-1 text-[11px] text-[#5E6068] font-mono truncate">{publicUrl}</div>
                                                    <div className="flex items-center space-x-3">
                                                        <button
                                                            onClick={handleCopyLink}
                                                            className={cn(
                                                                "p-1.5 rounded-lg transition-all",
                                                                copied ? "bg-green-500/10 text-green-500" : "hover:bg-[#1A1C23] text-[#3A3C46] hover:text-[#E8E8E8]"
                                                            )}
                                                        >
                                                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <a
                                                            href={publicUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 rounded-lg hover:bg-[#1A1C23] text-[#3A3C46] hover:text-[#5E6AD2] transition-all"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Success Sync */}
                    <div className="h-20 px-10 border-t border-[#1A1C23] flex items-center justify-between bg-[#14151A]/20 shrink-0">
                        <div className="flex items-center space-x-2">
                            <Activity className="w-3 h-3 text-[#5E6AD2]" />
                            <span className="text-[9px] font-black text-[#5E6068] uppercase tracking-widest">Awaiting Command Synchrony</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-10 py-3 bg-[#5E6AD2] hover:bg-[#4b55aa] text-white text-[11px] font-bold rounded-xl transition-all uppercase tracking-[0.2em] shadow-xl shadow-[#5E6AD2]/20 flex items-center group"
                        >
                            <span>Finalize</span>
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
