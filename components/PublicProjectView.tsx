
import React, { useState } from 'react';
import { Issue, Project, User, Status } from '../types';
import { IssueList } from './IssueList';
import { BoardView } from './BoardView';
import { Link } from '@tanstack/react-router';
import { ExternalLink, Lock, Hash, Layout, Terminal, ArrowRight, Heart, Grid3x3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { renderMentionsWithBadges, hasMentions } from '../services/mentionUtils';

type ViewType = 'list' | 'board';

interface PublicProjectViewProps {
    project: Project | null;
    issues: Issue[];
    users: User[];
    onViewIssue: (issue: Issue) => void;
}

export const PublicProjectView: React.FC<PublicProjectViewProps> = ({
    project,
    issues,
    users,
    onViewIssue
}) => {
    const [currentView, setCurrentView] = useState<ViewType>('list');

    if (!project) {
        return (
            <div className="min-h-screen bg-[#070809] flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'linear-gradient(#5E6AD2 1px, transparent 1px), linear-gradient(90deg, #5E6AD2 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center relative z-10"
                >
                    <div className="w-20 h-20 bg-[#14151A] border border-[#22242A] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                        <Lock className="w-8 h-8 text-[#5E6AD2]" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-widest leading-none">Access Restricted</h1>
                    <p className="text-[11px] text-[#5E6068] font-bold uppercase tracking-[0.3em] mb-10">Object not found in public registry</p>
                    <Link
                        to="/"
                        className="inline-flex items-center space-x-3 px-8 py-3.5 bg-[#5E6AD2] hover:bg-[#4b55aa] text-white text-[11px] font-bold rounded-xl transition-all uppercase tracking-[0.2em] shadow-xl shadow-[#5E6AD2]/20 group"
                    >
                        <span>Return to Terminal</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </motion.div>
            </div>
        );
    }

    const projectIssues = issues.filter(i => i.projectId === project.id);

    return (
        <div className="min-h-screen bg-[#0A0A0C] text-[#C0C4CC] flex flex-col font-sans">
            {/* Nav Header */}
            <header className="h-16 border-b border-[#1A1C23] flex items-center justify-between px-8 bg-[#0F1014]/80 backdrop-blur-xl sticky top-0 z-40">
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-[#14151A] border border-[#22242A] rounded-lg flex items-center justify-center text-lg shadow-inner">
                            {project.icon}
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-[#E8E8E8] tracking-tight">{project.name}</h1>
                            <div className="flex items-center space-x-2 mt-0.5">
                                <span className="text-[9px] font-black text-[#5E6AD2] uppercase tracking-widest">Public Registry</span>
                                <div className="w-1 h-1 rounded-full bg-[#3A3C46]" />
                                <span className="text-[9px] font-bold text-[#3A3C46] uppercase tracking-widest">Read Only Access</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    <Link to="/" className="text-[10px] font-bold text-[#E8E8E8] hover:text-[#5E6AD2] transition-colors uppercase tracking-[0.2em]">
                        Login
                    </Link>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                <main className="max-w-6xl mx-auto py-12 px-8 space-y-12">

                    {/* Project Overview Card */}
                    <section className="bg-[#0F1014] border border-[#22242A] rounded-3xl p-10 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                            <Terminal className="w-40 h-40" />
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center space-x-3 text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.4em]">
                                <Layout className="w-3 h-3" />
                                <span>Project Description</span>
                            </div>

                            {project.description ? (
                                <p className="text-lg text-[#E8E8E8] font-medium leading-relaxed max-w-3xl">
                                    {hasMentions(project.description) ? (
                                        <span className="inline">
                                            {renderMentionsWithBadges(project.description, users)}
                                        </span>
                                    ) : (
                                        project.description
                                    )}
                                </p>
                            ) : (
                                <p className="text-lg text-[#3A3C46] italic font-medium">
                                    No description specified for this unit.
                                </p>
                            )}

                            {/* Resource Links Section */}
                            {project.links && project.links.length > 0 && (
                                <div className="space-y-3 pt-4">
                                    <div className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.3em]">
                                        Resource Links
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {project.links.map((link) => (
                                            <a
                                                key={link.id}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center space-x-2 px-4 py-2 bg-[#14151A] hover:bg-[#1A1C23] border border-[#22242A] hover:border-[#5E6AD2]/30 rounded-lg transition-all group/link"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5 text-[#5E6068] group-hover/link:text-[#5E6AD2]" />
                                                <span className="text-[11px] font-medium text-[#C0C4CC]">{link.title}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center space-x-8 pt-4">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-[#3A3C46] uppercase tracking-widest block">Issue Count</span>
                                    <span className="text-sm font-mono text-[#5E6AD2] font-bold">{projectIssues.length}</span>
                                </div>
                                <div className="w-px h-8 bg-[#1A1C23]" />
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-[#3A3C46] uppercase tracking-widest block">Deployment ID</span>
                                    <span className="text-sm font-mono text-[#C0C4CC] font-bold">{project.identifier}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Issues Section */}
                    <section className="space-y-6 pb-20">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center space-x-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2]" />
                                <h2 className="text-[11px] font-black text-[#E8E8E8] uppercase tracking-[0.3em]">
                                    Active Objectives
                                </h2>
                            </div>

                            {/* View Switcher */}
                            <div className="flex items-center space-x-1 bg-[#14151A] rounded-lg border border-[#22242A] p-1">
                                <button
                                    onClick={() => setCurrentView('list')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                                        currentView === 'list'
                                            ? "bg-[#5E6AD2] text-white"
                                            : "text-[#5E6068] hover:text-[#C0C4CC]"
                                    )}
                                >
                                    <span className="hidden md:inline">List</span>
                                    <span className="md:hidden">List</span>
                                </button>
                                <button
                                    onClick={() => setCurrentView('board')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5",
                                        currentView === 'board'
                                            ? "bg-[#5E6AD2] text-white"
                                            : "text-[#5E6068] hover:text-[#C0C4CC]"
                                    )}
                                >
                                    <Grid3x3 className="w-3 h-3" />
                                    <span className="hidden md:inline">Board</span>
                                </button>
                            </div>
                        </div>

                        {projectIssues.length > 0 ? (
                            <>
                                {currentView === 'list' && (
                                    <div className="bg-[#0F1014] border border-[#22242A] rounded-2xl overflow-hidden shadow-xl">
                                        <IssueList
                                            issues={projectIssues}
                                            users={users}
                                            onEdit={onViewIssue}
                                            onDelete={() => { }} // No-op for public
                                            onStatusChange={() => { }} // No-op for public
                                            isPublicView={true}
                                        />
                                    </div>
                                )}
                                {currentView === 'board' && (
                                    <BoardView
                                        issues={projectIssues}
                                        users={users}
                                        onEdit={onViewIssue}
                                        onDelete={() => { }} // No-op for public
                                        onStatusChange={() => { }} // No-op for public
                                        isPublicView={true}
                                    />
                                )}
                            </>
                        ) : (
                            <div className="py-24 border border-dashed border-[#1A1C23] rounded-3xl flex flex-col items-center justify-center space-y-4">
                                <Hash className="w-8 h-8 text-[#1A1C23]" />
                                <span className="text-[10px] text-[#3A3C46] font-black uppercase tracking-widest">Registry Empty</span>
                            </div>
                        )}
                    </section>
                </main>
            </div>

            {/* Fixed Footer */}
            <footer className="h-12 bg-[#0F1014] border-t border-[#1A1C23] flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center space-x-2">
                    <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                    <p className="text-[9px] text-[#5E6068] font-bold uppercase tracking-widest">
                        Made with Love by Neo Digital
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-[9px] text-[#3A3C46] font-bold uppercase tracking-widest">Transmission Secure</span>
                    <div className="h-3 w-px bg-[#1A1C23]" />
                    <Link to="/" className="text-[9px] text-[#5E6AD2] hover:text-[#E8E8E8] font-bold uppercase tracking-widest transition-colors">
                        Internal Access
                    </Link>
                </div>
            </footer>
        </div>
    );
};
