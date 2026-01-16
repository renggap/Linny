import React, { useMemo } from 'react';
import { Issue, Status, User, Project, Team, Priority, UserRole } from '../types';
import { StatusIcon, PriorityIcon } from './Icons';
import {
    Target,
    Activity,
    Zap,
    Layout,
    ArrowUpRight,
    CheckCircle2,

} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Variants } from 'framer-motion';

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
        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ArrowUpRight className="w-4 h-4 text-[#4C4F59]" />
        </div>

        <div className="flex flex-col justify-between h-full space-y-4">
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

    // Memoized Data Calculation (Preserved logic, cleaner implementation)
    const stats = useMemo(() => {
        const total = issues.length;
        const byStatus: Record<Status, number> = {
            [Status.Backlog]: 0, [Status.Todo]: 0, [Status.InProgress]: 0,
            [Status.InReview]: 0, [Status.Done]: 0, [Status.Canceled]: 0,
        };
        const byPriority: Record<Priority, number> = {
            [Priority.Urgent]: 0, [Priority.High]: 0, [Priority.Medium]: 0,
            [Priority.Low]: 0, [Priority.NoPriority]: 0,
        };

        issues.forEach(issue => {
            if (byStatus[issue.status] !== undefined) byStatus[issue.status]++;
            if (byPriority[issue.priority] !== undefined) byPriority[issue.priority]++;
        });

        const completionRate = total > 0 ? Math.round((byStatus[Status.Done] / total) * 100) : 0;
        const activeCount = byStatus[Status.InProgress] + byStatus[Status.InReview];

        // Sort users by activity - only show team members (excluding guests)
        const teamMemberIds = team.members || [];
        const activeMembers = users
            .filter(user => teamMemberIds.includes(user.id) && user.role !== UserRole.Guest)
            .map(user => {
                const userIssues = issues.filter(i => i.assigneeIds.includes(user.id));
                const done = userIssues.filter(i => i.status === Status.Done).length;
                return {
                    user,
                    total: userIssues.length,
                    done,
                    completion: userIssues.length > 0 ? Math.round((done / userIssues.length) * 100) : 0
                };
            }).sort((a, b) => b.total - a.total).slice(0, 5);

        // Sort projects
        const activeProjects = projects.map(p => {
            const pIssues = issues.filter(i => i.projectId === p.id);
            const pDone = pIssues.filter(i => i.status === Status.Done).length;
            return {
                ...p,
                total: pIssues.length,
                progress: pIssues.length > 0 ? Math.round((pDone / pIssues.length) * 100) : 0
            }
        }).sort((a, b) => b.total - a.total).slice(0, 3);

        return { total, byStatus, byPriority, completionRate, activeCount, activeMembers, activeProjects };
    }, [issues, users, projects]);

    if (!team) return null;

    return (
        <div className="flex-1 h-full overflow-y-auto bg-[#0F1014] text-[#E8E8E8] font-sans selection:bg-[#5E6AD2]/30">
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
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-white mb-0.5">{team.name}</h1>
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
                        label="Velocity"
                        value={stats.total}
                        icon={Zap}
                        color="text-[#5E6AD2]"
                    />
                    <StatCard
                        label="Completion"
                        value={`${stats.completionRate}%`}
                        icon={CheckCircle2}
                        color="text-emerald-500"
                    />
                    <StatCard
                        label="Active Projects"
                        value={projects.length}
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
                                                <span className="font-mono text-[#5E6AD2]">{count}</span>
                                            </div>
                                            <div className="h-1 bg-[#1D1E24] rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ x: '-100%' }}
                                                    animate={{ x: 0 }}
                                                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                                                    className={cn(
                                                        "h-full rounded-full bg-[#3A3C46] group-hover:bg-[#5E6AD2] transition-colors duration-300",
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
                                        className="flex items-center justify-between p-4 bg-[#14151A] border border-[#26272F] rounded-lg hover:border-[#3A3C46] transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded bg-[#1D1E24] border border-[#2C2D35] flex items-center justify-center">
                                                <span className="text-lg">{p.icon}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-[14px] font-medium text-[#E8E8E8] group-hover:text-[#5E6AD2] transition-colors">{p.name}</h4>
                                                <span className="text-[11px] text-[#8A8F98]">{p.identifier} • {p.total} issues</span>
                                            </div>
                                        </div>
                                        <div className="w-32 flex flex-col items-end space-y-1.5">
                                            <span className="text-[11px] font-mono text-[#C0C4CC]">{p.progress}% Complete</span>
                                            <div className="w-full h-1 bg-[#1D1E24] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#5E6AD2] rounded-full"
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
                                {stats.activeMembers.map((stat) => (
                                    <div
                                        key={stat.user.id}
                                        className="flex items-center justify-between p-3 border-b border-[#22242A] last:border-0 hover:bg-[#1A1C23] transition-colors"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="relative">
                                                <img src={stat.user.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-[#2C2D35]" />
                                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#0F1014] rounded-full flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[13px] font-medium text-[#E8E8E8]">{stat.user.name}</div>
                                                <div className="text-[10px] text-[#8A8F98]">{stat.total} Issues</div>
                                            </div>
                                        </div>
                                        <div className="w-12 text-right">
                                            <span className="text-[12px] font-mono text-[#C0C4CC]">{stat.completion}%</span>
                                        </div>
                                    </div>
                                ))}
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

                    </div>
                </div>
            </motion.div>
        </div>
    );
};
