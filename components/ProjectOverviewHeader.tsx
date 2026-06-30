
import React, { useState, useEffect } from 'react';
import { Project, ResourceLink, User } from '../types';
import {
    Link2,
    Trash2,
    FileText,
    LayoutList,
    ChevronUp,
    ChevronDown,
    Plus,
    Globe,
    Layout,
    User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { renderMentionsWithBadges, hasMentions } from '../services/mentionUtils';
import { useAddProjectLink, useDeleteProjectLink, useUpdateProject } from '../hooks/useProjects';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ProjectOverviewHeaderProps {
    project: Project;
    isExpanded: boolean;
    onToggleExpand: () => void;
    users?: User[];
    onUserClick?: (user: User) => void;
}

export const ProjectOverviewHeader: React.FC<ProjectOverviewHeaderProps> = ({ project, isExpanded, onToggleExpand, users = [], onUserClick }) => {
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [descValue, setDescValue] = useState(project.description || "");

    // Links state
    const [newLinkTitle, setNewLinkTitle] = useState("");
    const [newLinkUrl, setNewLinkUrl] = useState("");
    const [isAddingLink, setIsAddingLink] = useState(false);

    // Mutations
    const updateProjectMutation = useUpdateProject();
    const addLinkMutation = useAddProjectLink();
    const deleteLinkMutation = useDeleteProjectLink();

    useEffect(() => {
        setDescValue(project.description || "");
    }, [project.description]);

    const handleDescBlur = async () => {
        // Only save if the value actually changed
        if (descValue !== project.description) {
            try {
                console.log('[ProjectOverviewHeader] Saving description:', descValue);
                await updateProjectMutation.mutateAsync({
                    id: project.id,
                    updates: { description: descValue }
                });
                console.log('[ProjectOverviewHeader] Description saved successfully');
                // Only close edit mode after successful save
                setIsEditingDesc(false);
            } catch (error) {
                console.error('[ProjectOverviewHeader] Failed to update description:', error);
                // Keep edit mode open on error so user can retry
            }
        } else {
            // No changes, just close edit mode
            setIsEditingDesc(false);
        }
    };

    const handleAddLink = async () => {
        if (!newLinkTitle || !newLinkUrl) return;
        try {
            const url = newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`;
            console.log('[ProjectOverviewHeader] Adding link:', { title: newLinkTitle, url });
            await addLinkMutation.mutateAsync({
                projectId: project.id,
                title: newLinkTitle,
                url
            });
            console.log('[ProjectOverviewHeader] Link added successfully');
            setNewLinkTitle("");
            setNewLinkUrl("");
            setIsAddingLink(false);
        } catch (error) {
            console.error('[ProjectOverviewHeader] Failed to add link:', error);
        }
    };

    const handleDeleteLink = async (linkId: string) => {
        try {
            console.log('[ProjectOverviewHeader] Deleting link:', linkId);
            await deleteLinkMutation.mutateAsync({
                projectId: project.id,
                linkId
            });
            console.log('[ProjectOverviewHeader] Link deleted successfully');
        } catch (error) {
            console.error('[ProjectOverviewHeader] Failed to delete link:', error);
        }
    };

    return (
        <motion.div
            layout
            className="bg-[#14151A] border border-[#26272F] overflow-hidden shadow-popover"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
        >
            {/* Header / Banner Area */}
            <div className="flex items-center justify-between p-1 bg-[#1A1C23]/50 border-b border-[#26272F] min-w-0">
                <div className="flex items-center space-x-4 px-4 py-3 min-w-0 flex-1">
                    <div
                        onClick={onToggleExpand}
                        className="w-10 h-10 bg-[#1A1C23] border border-[#2C2D35] flex items-center justify-center text-lg cursor-pointer hover:border-accent/50 hover:text-[#E8E8E8] hover:shadow-[0_0_15px_rgba(94,106,210,0.15)] transition-all duration-300 group shrink-0"
                    >
                        <span className="opacity-80 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-300">
                            {project.icon || <Layout className="w-5 h-5" />}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-3 mb-0.5 min-w-0">
                            <h2 className="font-semibold text-[#E8E8E8] tracking-tight text-lg truncate">{project.name}</h2>
                            <span className="text-[10px] font-mono text-[#5E6068] border border-[#2C2D35] px-1.5 rounded uppercase tracking-wider bg-[#101114] shrink-0">
                                {project.identifier}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2 px-2 lg:px-4 shrink-0">
                    {project.isPublic && project.publicSlug && (
                        <a
                            href={`/public/${project.publicSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:flex items-center space-x-2 h-8 px-3 bg-[#1A1C23] border border-[#2C2D35] hover:border-[#3A3C46] hover:bg-[#202229] transition-all group"
                        >
                            <Globe className="w-3.5 h-3.5 text-[#5E6068] group-hover:text-accent transition-colors" />
                            <span className="text-[11px] font-medium text-[#8A8F98] group-hover:text-[#C0C4CC]">Public View</span>
                        </a>
                    )}

                    <button
                        onClick={onToggleExpand}
                        className={cn(
                            "h-8 w-8 flex items-center justify-center border transition-all",
                            isExpanded
                                ? "bg-[#1A1C23] border-[#2C2D35] text-[#8A8F98] hover:text-[#E8E8E8]"
                                : "bg-[#1A1C23] border-[#2C2D35] text-[#5E6068] hover:text-[#8A8F98]"
                        )}
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Expandable Content Area */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#22242A]">

                            {/* Description Column */}
                            <div className="md:col-span-2 p-6 bg-[#0F1014]/50">
                                <div className="flex items-center space-x-2 mb-3">
                                    <FileText className="w-3.5 h-3.5 text-[#5E6068]" />
                                    <h4 className="text-[11px] font-semibold text-[#5E6068] uppercase tracking-wider">Project Brief</h4>
                                </div>

                                {isEditingDesc ? (
                                    <textarea
                                        className="w-full bg-[#1A1C23] border border-[#2C2D35] focus:border-accent/50 p-3 text-sm text-[#E8E8E8] placeholder-[#5E6068] focus:outline-none min-h-[120px] transition-all resize-none font-sans leading-relaxed selection:bg-accent/30"
                                        value={descValue}
                                        onChange={(e) => setDescValue(e.target.value)}
                                        onBlur={handleDescBlur}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                handleDescBlur();
                                            }
                                        }}
                                        autoFocus
                                        placeholder="Add project description..."
                                    />
                                ) : (
                                    <div
                                        className="text-[13px] text-[#C0C4CC] leading-relaxed cursor-text hover:text-[#E8E8E8] transition-colors min-h-[60px]"
                                        onClick={() => setIsEditingDesc(true)}
                                    >
                                        {project.description ? (
                                            hasMentions(project.description) ? (
                                                <p className="text-[13px] text-[#C0C4CC] leading-relaxed">
                                                    {renderMentionsWithBadges(project.description, users, (userId: string) => {
                                                        const user = users.find(u => u.id === userId);
                                                        onUserClick?.(user!);
                                                    })}
                                                </p>
                                            ) : (
                                                project.description
                                            )
                                        ) : (
                                            <span className="text-[#5E6068] italic">No description provided. Click to add details...</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Resources links */}
                            <div className="p-6 bg-[#14151A]">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                        <LayoutList className="w-3.5 h-3.5 text-[#5E6068]" />
                                        <h4 className="text-[11px] font-semibold text-[#5E6068] uppercase tracking-wider">Resources</h4>
                                    </div>
                                    <button
                                        onClick={() => setIsAddingLink(true)}
                                        className="p-1 hover:bg-[#25262B] rounded transition-colors text-[#5E6068] hover:text-[#E8E8E8]"
                                        title="Add Link"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <div
                                        className={cn(
                                            "space-y-1 transition-all duration-300",
                                            (project.links?.length || 0) > 3 && "max-h-[220px] overflow-y-auto pr-1"
                                        )}
                                    >
                                        <AnimatePresence>
                                            {(project.links || []).map(link => (
                                                <motion.div
                                                    key={link.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="flex items-center justify-between group py-1.5 px-2 hover:bg-[#1A1C23] border border-transparent hover:border-[#2C2D35] transition-all"
                                                    style={(project.links?.length || 0) > 3 ? {
                                                        scrollbarWidth: 'thin',
                                                        scrollbarColor: '#2C2D35 transparent'
                                                    } : undefined}
                                                >
                                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-[12px] text-[#8A8F98] group-hover:text-[#C0C4CC] transition-colors truncate max-w-[85%] font-medium">
                                                        <Link2 className="w-3 h-3 mr-2.5 text-[#5E6068] group-hover:text-accent transition-colors" />
                                                        <span className="truncate">{link.title}</span>
                                                    </a>
                                                    <button
                                                        onClick={() => handleDeleteLink(link.id)}
                                                        className="text-[#5E6068] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    {(project.links || []).length === 0 && !isAddingLink && (
                                        <div className="p-4 border border-dashed border-[#22242A] text-center">
                                            <span className="text-[11px] text-[#5E6068] italic">No resources linked</span>
                                        </div>
                                    )}

                                    {isAddingLink && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="p-3 bg-[#1A1C23] border border-[#2C2D35] space-y-3 mt-2 shadow-lg"
                                        >
                                            <input
                                                type="text"
                                                placeholder="Link Title"
                                                className="w-full bg-[#0F1014] border border-[#2C2D35] rounded px-2 py-1.5 text-xs text-[#E8E8E8] placeholder-[#5E6068] focus:outline-none focus:border-accent transition-all"
                                                value={newLinkTitle}
                                                onChange={(e) => setNewLinkTitle(e.target.value)}
                                                autoFocus
                                            />
                                            <input
                                                type="text"
                                                placeholder="https://..."
                                                className="w-full bg-[#0F1014] border border-[#2C2D35] rounded px-2 py-1.5 text-xs text-[#C0C4CC] placeholder-[#5E6068] focus:outline-none focus:border-accent transition-all font-mono"
                                                value={newLinkUrl}
                                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                                            />
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={() => setIsAddingLink(false)} className="px-2 py-1 text-[10px] text-[#8A8F98] hover:text-[#E8E8E8]">Cancel</button>
                                                <button onClick={handleAddLink} className="bg-accent hover:bg-accent-hover text-white text-[10px] font-medium px-2 py-1 rounded transition-colors">Add Resource</button>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
