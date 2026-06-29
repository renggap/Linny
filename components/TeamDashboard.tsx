import React, { useMemo } from 'react';
import { Issue, Status, User, Project, Team, Priority, UserRole } from '../types';
import { StatusIcon, PriorityIcon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { useUIStore } from '../stores/uiStore';
import { useNavigate } from '@tanstack/react-router';
import {
    Target,
    Activity,
    Zap,
    Layout,
    ArrowUpRight,
    CheckCircle2,
    EyeOff,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ActivityFeed } from './ActivityFeed';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Variants } from 'motion/react';

// Utility for merging tailwind classes
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface TeamDashboardProps {
    team: Team;
    issues: Issue[];
    users: User[];
    projects: Project[];
}

// Animation Variants
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 260,
            damping: 20
        }
    }
};

const StatCard = ({ label, value, icon: Icon, trend, color }: {
    label: string,
    value: string | number,
    icon: any,
    trend?: string,
    color?: string
}) => (
    <motion.div
        variants={itemVariants}
        className="group relative p-5 bg-[#14151A] rounded-xl border border-[#26272F] hover:border-[#3A3C46] transition-all duration-300 overflow-hidden"
    >
        {/* Animated decorative background */}
        <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500">
            <motion.div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl"
                style={{ background: color?.replace('text-', 'rgb(').replace('500', '').replace('400', '') ??
                    (color?.includes('amber') ? 'rgb(245, 158, 11)' :
                     color?.includes('emerald') ? 'rgb(16, 185, 129)' :
                     color?.includes('indigo') ? 'rgb(129, 140, 248)' : 'rgb(94, 106, 210)') }}
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full blur-2xl"
                style={{ background: color?.replace('text-', 'rgb(').replace('500', '').replace('400', '') ??
                    (color?.includes('amber') ? 'rgb(245, 158, 11)' :
                     color?.includes('emerald') ? 'rgb(16, 185, 129)' :
                     color?.includes('indigo') ? 'rgb(129, 140, 248)' : 'rgb(94, 106, 210)') }}
                animate={{
                    scale: [1.2, 1, 1.2],
                    rotate: [90, 0, 90],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
        </div>

        {/* Animated gradient mesh overlay */}
        <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-700"
            style={{
                background: `radial-gradient(circle at 30% 30%, ${color?.replace('text-', 'rgb(').replace('500', '').replace('400', '') ??
                    (color?.includes('amber') ? '245, 158, 11' :
                     color?.includes('emerald') ? '16, 185, 129' :
                     color?.includes('indigo') ? '129, 140, 248' : '94, 106, 210')}, transparent) 0%, transparent 50%)`
            }}
            animate={{
                backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
            }}
            transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear"
            }}
        />

        {/* Floating particles */}
        {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
                key={`particle-${i}`}
                className="absolute w-1 h-1 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-500"
                style={{
                    background: color?.replace('text-', 'rgb(').replace('500', '').replace('400', '') ??
                        (color?.includes('amber') ? 'rgb(245, 158, 11)' :
                         color?.includes('emerald') ? 'rgb(16, 185, 129)' :
                         color?.includes('indigo') ? 'rgb(129, 140, 248)' : 'rgb(94, 106, 210)')
                }}
                initial={{
                    x: `${Math.random() * 100}%`,
                    y: `${Math.random() * 100}%`
                }}
                animate={{
                    y: [0, -20, 0],
                    x: [0, Math.random() * 10 - 5, 0],
                    opacity: [0.1, 0.3, 0.1]
                }}
                transition={{
                    duration: 4 + i,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.5
                }}
            />
        ))}

        {/* Animated geometric shapes */}
        <motion.div
            className="absolute top-4 right-4 w-2 h-2 rounded-sm opacity-10 group-hover:opacity-20"
            style={{
                background: color?.replace('text-', 'rgb(').replace('500', '').replace('400', '') ??
                    (color?.includes('amber') ? 'rgb(245, 158, 11)' :
                     color?.includes('emerald') ? 'rgb(16, 185, 129)' :
                     color?.includes('indigo') ? 'rgb(129, 140, 248)' : 'rgb(94, 106, 210)')
            }}
            animate={{
                rotate: [0, 45, 90, 45, 0],
                scale: [1, 1.2, 1],
            }}
            transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        />

        {/* Small circle shape */}
        <motion.div
            className="absolute bottom-6 left-6 w-1.5 h-1.5 rounded-full opacity-15 group-hover:opacity-30"
            style={{
                background: color?.replace('text-', 'rgb(').replace('500', '').replace('400', '') ??
                    (color?.includes('amber') ? 'rgb(245, 158, 11)' :
                     color?.includes('emerald') ? 'rgb(16, 185, 129)' :
                     color?.includes('indigo') ? 'rgb(129, 140, 248)' : 'rgb(94, 106, 210)')
            }}
            animate={{
                scale: [1, 1.5, 1],
                opacity: [0.15, 0.3, 0.15],
            }}
            transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        />

        {/* Triangle shape using clip-path */}
        <motion.div
            className="absolute top-1/2 right-8 w-0 h-0 opacity-10 group-hover:opacity-20"
            style={{
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderBottom: `6px solid ${color?.includes('amber') ? '#F59E0B' :
                                    color?.includes('emerald') ? '#10B981' :
                                    color?.includes('indigo') ? '#818CF8' : 'var(--accent-color)'}`
            }}
            animate={{
                rotate: [0, 180, 360],
                y: [0, -5, 0],
            }}
            transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear"
            }}
        />

        {/* Animated sparkle/star */}
        <motion.svg
            className="absolute bottom-4 right-12 w-3 h-3 opacity-10 group-hover:opacity-20"
            viewBox="0 0 24 24"
            fill="none"
            style={{
                stroke: color?.includes('amber') ? '#F59E0B' :
                       color?.includes('emerald') ? '#10B981' :
                       color?.includes('indigo') ? '#818CF8' : 'var(--accent-color)'
            }}
        >
            <motion.path
                d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />
        </motion.svg>

        {/* Diamond shape */}
        <motion.div
            className="absolute top-8 left-8 w-2 h-2 opacity-10 group-hover:opacity-20"
            style={{
                background: color?.includes('amber') ? '#F59E0B' :
                           color?.includes('emerald') ? '#10B981' :
                           color?.includes('indigo') ? '#818CF8' : 'var(--accent-color)',
                transform: 'rotate(45deg)'
            }}
            animate={{
                y: [0, 8, 0],
                rotate: [45, 225, 45],
            }}
            transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        />

        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ArrowUpRight className="w-4 h-4 text-[#4C4F59]" />
        </div>

        <div className="flex flex-col justify-between h-full space-y-4 relative z-10">
            <div className="flex items-center space-x-3">
                <div className={cn("p-2 rounded-lg bg-[#1D1E24] border border-[#2C2D35] group-hover:scale-105 transition-transform duration-300", color)}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-[13px] font-medium text-[#8A8F98] tracking-tight">{label}</span>
            </div>

            <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-semibold text-[#E8E8E8] tracking-tight font-sans">
                    {value}
                </span>
                {trend && (
                    <span className="text-[11px] font-medium text-[#4C4F59] flex items-center">
                        <span className="text-emerald-500 mr-1">+{trend}</span>
                        this week
                    </span>
                )}
            </div>
        </div>

        {/* Subtle bottom gradient line */}
        <div className={cn("absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500", color?.replace('text-', 'text-'))} />
    </motion.div>
);

export const TeamDashboard: React.FC<TeamDashboardProps> = ({ team, issues, users, projects }) => {
    const ui = useUIStore();
    const navigate = useNavigate();

    // Helper function to create team slug (lowercase with hyphens)
    const toTeamSlug = (teamName: string) => teamName.toLowerCase().replace(/\s+/g, '-');

    // Helper function to create project identifier slug (lowercase)
    const toProjectSlug = (identifier: string) => identifier.toLowerCase();

    // Handle project click - navigate to project URL
    const handleProjectClick = (project: Project) => {
        const teamSlug = toTeamSlug(team.name);
        const projectSlug = toProjectSlug(project.identifier);
        navigate({ to: `/team/${teamSlug}/project/${projectSlug}` });
    };

    // Memoized Data Calculation (Preserved logic, cleaner implementation)
    const stats = useMemo(() => {
        // Issues are already filtered by teamId in useIssues hook
        // No need for additional filtering by projects array
        const teamIssues = issues;

        const total = teamIssues.length;
        const byStatus: Record<Status, number> = {
            [Status.Backlog]: 0, [Status.Todo]: 0, [Status.InProgress]: 0,
            [Status.InReview]: 0, [Status.Done]: 0, [Status.Canceled]: 0,
        };
        const byPriority: Record<Priority, number> = {
            [Priority.Urgent]: 0, [Priority.High]: 0, [Priority.Medium]: 0,
            [Priority.Low]: 0, [Priority.NoPriority]: 0,
        };

        teamIssues.forEach(issue => {
            if (byStatus[issue.status] !== undefined) byStatus[issue.status]++;
            if (byPriority[issue.priority] !== undefined) byPriority[issue.priority]++;
        });

        // Completion rate: Exclude Backlog and Canceled from calculation
        // Only include: Todo, InProgress, InReview, Done
        const activeStatuses = [Status.Todo, Status.InProgress, Status.InReview, Status.Done];
        const completionTotal = activeStatuses.reduce((sum, status) => sum + byStatus[status], 0);
        const completionRate = completionTotal > 0
            ? Math.round((byStatus[Status.Done] / completionTotal) * 100)
            : 0;
        const activeCount = byStatus[Status.InProgress] + byStatus[Status.InReview];

        // Sort users by activity - only show team members (excluding guests)
        const teamMemberIds = team.members || [];
        const activeMembers = users
            .filter(user => teamMemberIds.includes(user.id) && user.role !== UserRole.Guest)
            .map(user => {
                const userIssues = teamIssues.filter(i => i.assigneeIds.includes(user.id));
                // Exclude Backlog and Canceled from user completion calculation
                const userActiveIssues = userIssues.filter(i => activeStatuses.includes(i.status));
                const done = userActiveIssues.filter(i => i.status === Status.Done).length;
                return {
                    user,
                    total: userActiveIssues.length, // Only count active issues (excludes Backlog/Canceled)
                    done,
                    completion: userActiveIssues.length > 0 ? Math.round((done / userActiveIssues.length) * 100) : 0
                };
            }).sort((a, b) => b.total - a.total).slice(0, 5);

        // Sort projects - show all team projects with their issue counts, not just those with issues
        const activeProjects = projects.map(p => {
            const pIssues = teamIssues.filter(i => i.projectId === p.id);
            // Exclude Backlog and Canceled from project progress calculation
            const pActiveIssues = pIssues.filter(i => activeStatuses.includes(i.status));
            const pDone = pActiveIssues.filter(i => i.status === Status.Done).length;
            return {
                ...p,
                total: pActiveIssues.length, // Only count active issues (excludes Backlog/Canceled)
                progress: pActiveIssues.length > 0 ? Math.round((pDone / pActiveIssues.length) * 100) : 0
            }
        }).sort((a, b) => b.total - a.total); // Show all projects, sorted by issue count

        return { total, byStatus, byPriority, completionRate, activeCount, activeMembers, activeProjects };
    }, [issues, users, projects, team]);

    if (!team) return null;

    return (
        <div className="flex-1 h-full overflow-y-auto bg-[#0F1014] text-[#E8E8E8] font-sans selection:bg-accent/30">
            <motion.div
                className="max-w-[1600px] mx-auto p-8 space-y-10"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header */}
                <motion.header variants={itemVariants} className="flex items-center justify-between pb-6 border-b border-[#22242A]">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1A1C23] border border-[#2C2D35] flex items-center justify-center text-xl shadow-lg shadow-black/20">
                            {team.icon || <Layout className="w-5 h-5 text-[#8A8F98]" />}
                        </div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight text-white mb-0.5">{team.name}</h1>
                            {team.isStealth && (
                                <EyeOff className="w-5 h-5 text-[#5E6068]" title="Stealth workspace - only visible to members" />
                            )}
                        </div>
                    </div>
                </motion.header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Active Issues"
                        value={stats.activeCount}
                        icon={Activity}
                        color="text-amber-500"
                    />
                    <StatCard
                        label="Total Issues"
                        value={stats.total}
                        icon={Zap}
                        color="text-accent"
                    />
                    <StatCard
                        label="Completion"
                        value={`${stats.completionRate}%`}
                        icon={CheckCircle2}
                        color="text-emerald-500"
                    />
                    <StatCard
                        label="Active Projects"
                        value={stats.activeProjects.length}
                        icon={Target}
                        color="text-indigo-400"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Content: Pipeline & Breakdown */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Status Pipeline */}
                        <motion.section variants={itemVariants} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[13px] font-medium text-[#8A8F98] uppercase tracking-wider">Pipeline Overview</h3>
                            </div>

                            <div className="bg-[#14151A] border border-[#26272F] rounded-xl p-6 relative overflow-hidden">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4">
                                    {Object.entries(stats.byStatus).map(([status, count], idx) => (
                                        <div key={status} className="space-y-2 group">
                                            <div className="flex items-center justify-between text-[13px]">
                                                <div className="flex items-center space-x-2 text-[#C0C4CC]">
                                                    <StatusIcon status={status as Status} className="w-3.5 h-3.5" />
                                                    <span className="font-medium">{status}</span>
                                                </div>
                                                <span className="font-mono text-accent">{count}</span>
                                            </div>
                                            <div className="h-1 bg-[#1D1E24] rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ x: '-100%' }}
                                                    animate={{ x: 0 }}
                                                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                                                    className={cn(
                                                        "h-full rounded-full bg-[#3A3C46] group-hover:bg-accent transition-colors duration-300",
                                                        status === Status.Done && "bg-emerald-500/50 group-hover:bg-emerald-500",
                                                        status === Status.InProgress && "bg-amber-500/50 group-hover:bg-amber-500"
                                                    )}
                                                    style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%`, minWidth: '4px' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.section>

                        {/* Projects Breakdown */}
                        <motion.section variants={itemVariants} className="space-y-4">
                            <h3 className="text-[13px] font-medium text-[#8A8F98] uppercase tracking-wider">Active Projects</h3>
                            <div className="grid gap-3">
                                {stats.activeProjects.map((p) => (
                                    <motion.div
                                        key={p.id}
                                        whileHover={{ x: 4 }}
                                        onClick={() => handleProjectClick(p)}
                                        className="flex items-center justify-between p-4 bg-[#14151A] border border-[#26272F] rounded-lg hover:border-[#3A3C46] transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded bg-[#1D1E24] border border-[#2C2D35] flex items-center justify-center">
                                                <span className="text-lg">{p.icon}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-[14px] font-medium text-[#E8E8E8] group-hover:text-accent transition-colors">{p.name}</h4>
                                                <span className="text-[11px] text-[#8A8F98]">{p.identifier} • {p.total} issues</span>
                                            </div>
                                        </div>
                                        <div className="w-32 flex flex-col items-end space-y-1.5">
                                            <span className="text-[11px] font-mono text-[#C0C4CC]">{p.progress}% Complete</span>
                                            <div className="w-full h-1 bg-[#1D1E24] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-accent rounded-full"
                                                    style={{ width: `${p.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.section>
                    </div>

                    {/* Right Side: Team & Priority */}
                    <div className="space-y-8">

                        {/* Team Members */}
                        <motion.section variants={itemVariants} className="space-y-4">
                            <h3 className="text-[13px] font-medium text-[#8A8F98] uppercase tracking-wider">Team Velocity</h3>
                            <div className="bg-[#14151A] border border-[#26272F] rounded-xl overflow-hidden">
                                {stats.activeMembers.map((stat) => {
                                    // Determine completion color
                                    const completionColor = stat.completion >= 75 ? 'bg-emerald-500' :
                                                          stat.completion >= 50 ? 'bg-amber-500' :
                                                          stat.completion >= 25 ? 'bg-orange-500' : 'bg-red-500';
                                    const completionGlow = stat.completion >= 75 ? 'shadow-emerald-500/50' :
                                                           stat.completion >= 50 ? 'shadow-amber-500/50' :
                                                           stat.completion >= 25 ? 'shadow-orange-500/50' : 'shadow-red-500/50';

                                    return (
                                        <div
                                            key={stat.user.id}
                                            className="flex items-center justify-between p-3 border-b border-[#22242A] last:border-0 hover:bg-[#1A1C23] transition-colors"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <UserAvatar
                                                    name={stat.user.name}
                                                    size="lg"
                                                />
                                                <div>
                                                    <div className="text-[13px] font-medium text-[#E8E8E8]">{stat.user.name}</div>
                                                    <div className="text-[10px] text-[#8A8F98]">{stat.total} Issues</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {/* Completion Indicator Ring */}
                                                <div className="relative">
                                                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                                                        <circle
                                                            cx="16"
                                                            cy="16"
                                                            r="14"
                                                            fill="none"
                                                            stroke="#26272F"
                                                            strokeWidth="3"
                                                        />
                                                        <circle
                                                            cx="16"
                                                            cy="16"
                                                            r="14"
                                                            fill="none"
                                                            stroke={stat.completion >= 75 ? '#10B981' :
                                                                   stat.completion >= 50 ? '#F59E0B' :
                                                                   stat.completion >= 25 ? '#F97316' : '#EF4444'}
                                                            strokeWidth="3"
                                                            strokeDasharray={`${(stat.completion / 100) * 88} 88`}
                                                            strokeLinecap="round"
                                                            className="transition-all duration-500"
                                                        />
                                                    </svg>
                                                    {/* Inner dot */}
                                                    <div className={`absolute inset-0 flex items-center justify-center`}>
                                                        <div className={`w-2 h-2 rounded-full ${completionColor} ${completionGlow} shadow-lg`} />
                                                    </div>
                                                </div>
                                                <span className="text-[12px] font-mono text-[#C0C4CC]">{stat.completion}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.section>

                        {/* Priorities */}
                        <motion.section variants={itemVariants} className="space-y-4">
                            <h3 className="text-[13px] font-medium text-[#8A8F98] uppercase tracking-wider">Priority Breakdown</h3>
                            <div className="bg-[#14151A] border border-[#26272F] rounded-xl p-5 space-y-4">
                                {[Priority.Urgent, Priority.High, Priority.Medium].map((p, idx) => (
                                    <div key={p} className="flex items-center justify-between group">
                                        <div className="flex items-center space-x-3">
                                            <PriorityIcon priority={p} className="w-3.5 h-3.5" />
                                            <span className="text-[13px] text-[#C0C4CC] group-hover:text-white transition-colors">{p}</span>
                                        </div>
                                        <div className="flex items-center space-x-3 w-28">
                                            <div className="flex-1 h-1.5 bg-[#1D1E24] rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${stats.total ? (stats.byPriority[p] / stats.total) * 100 : 0}%` }}
                                                    transition={{ duration: 0.8, delay: 0.5 + (idx * 0.1) }}
                                                    className={cn(
                                                        "h-full rounded-full",
                                                        p === Priority.Urgent ? "bg-red-500" : p === Priority.High ? "bg-orange-500" : "bg-blue-500"
                                                    )}
                                                />
                                            </div>
                                            <span className="text-[11px] font-mono text-[#8A8F98] w-4 text-right">{stats.byPriority[p]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.section>

                        {/* Recent Activity Feed */}
                        <motion.section variants={itemVariants} className="space-y-4">
                            <h3 className="text-[13px] font-medium text-[#8A8F98] uppercase tracking-wider">Recent Activity</h3>
                            <div className="bg-[#14151A] border border-[#26272F] rounded-xl p-4 max-h-[400px overflow-y-auto no-scrollbar">
                                <ActivityFeed users={users} />
                            </div>
                        </motion.section>

                    </div>
                </div>
            </motion.div>
        </div>
    );
};
