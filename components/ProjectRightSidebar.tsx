
import React, { useMemo, useState } from 'react';
import { Project, Issue, User, Status, Activity, Priority } from '../types';
import { Clock, Users, BarChart3, Target, Calendar } from 'lucide-react';
import { DatePicker } from './DatePicker';
import { UserSelect } from './UserSelect';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ProjectRightSidebarProps {
    project: Project;
    issues: Issue[];
    users: User[];
    activities: Activity[];
    onUpdate: (project: Project) => void;
}

const ProgressBar = ({ percentage, color = "bg-[#5E6AD2]" }: { percentage: number, color?: string }) => (
    <div className="h-1.5 w-full bg-[#1A1C23] rounded-full overflow-hidden">
        <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn("h-full rounded-full", color)}
        />
    </div>
);

export const ProjectRightSidebar: React.FC<ProjectRightSidebarProps> = ({
    project,
    issues,
    users,
    activities,
    onUpdate
}) => {
    const [visibleCount, setVisibleCount] = useState(8);

    const projectIssues = useMemo(() => issues.filter(i => i.projectId === project.id), [issues, project.id]);

    // Progress Calculation
    const totalIssues = projectIssues.length;
    const completedIssues = projectIssues.filter(i => i.status === Status.Done || i.status === Status.Canceled).length;
    const activeIssues = projectIssues.filter(i => i.status !== Status.Done && i.status !== Status.Canceled).length;

    const completionPercentage = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

    // Member Progress
    const memberProgress = useMemo(() => {
        const memberStats = new Map<string, { total: number, completed: number }>();

        projectIssues.forEach(issue => {
            issue.assigneeIds.forEach(assigneeId => {
                const stats = memberStats.get(assigneeId) || { total: 0, completed: 0 };
                stats.total++;
                if (issue.status === Status.Done || issue.status === Status.Canceled) {
                    stats.completed++;
                }
                memberStats.set(assigneeId, stats);
            });
        });

        return Array.from(memberStats.entries()).map(([userId, stats]) => ({
            userId,
            percentage: Math.round((stats.completed / stats.total) * 100),
            count: stats.total
        })).sort((a, b) => b.count - a.count);
    }, [projectIssues]);

    // Filter Activities
    const filteredActivities = useMemo(() => {
        return (activities || [])
            .filter(a => a.projectId === project.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [activities, project.id]);

    const visibleActivities = useMemo(() => {
        return filteredActivities.slice(0, visibleCount);
    }, [filteredActivities, visibleCount]);

    return (
        <aside className="w-80 border-l border-[#22242A] bg-[#0F1014] flex flex-col h-full overflow-hidden shrink-0">
            <div className="flex-1 overflow-y-auto no-scrollbar py-8 px-6 space-y-10">

                {/* Properties Section */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[11px] font-bold text-[#5E6068] uppercase tracking-widest flex items-center">
                            <Users className="w-3.5 h-3.5 mr-2" /> Properties
                        </h4>
                    </div>

                    <div className="space-y-4">
                        <div className="group">
                            <label className="text-[10px] font-semibold text-[#3A3C46] uppercase tracking-wider mb-2 block ml-1">Project Lead</label>
                            <div className="bg-[#14151A] rounded-xl border border-[#22242A] p-0.5 hover:border-[#2C2D35] transition-all">
                                <UserSelect
                                    users={users}
                                    selectedUserIds={project.leadId ? [project.leadId] : []}
                                    onSelect={(id) => {
                                        onUpdate({ id: project.id, leadId: id } as Project);
                                    }}
                                    placeholder="Assign lead..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-[#3A3C46] uppercase tracking-wider block ml-1">Starts</label>
                                <DatePicker
                                    value={project.startDate}
                                    onChange={(date) => {
                                        const dateStr = date.toISOString().split('T')[0];
                                        onUpdate({ id: project.id, startDate: dateStr } as Project);
                                    }}
                                    placeholder="Set date"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-[#3A3C46] uppercase tracking-wider block ml-1">Target</label>
                                <DatePicker
                                    value={project.targetDate}
                                    onChange={(date) => {
                                        const dateStr = date.toISOString().split('T')[0];
                                        onUpdate({ id: project.id, targetDate: dateStr } as Project);
                                    }}
                                    placeholder="Set date"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Progress Visualizer */}
                <section className="space-y-5">
                    <h4 className="text-[11px] font-bold text-[#5E6068] uppercase tracking-widest flex items-center">
                        <BarChart3 className="w-3.5 h-3.5 mr-2" /> Progress
                    </h4>

                    <div className="bg-[#14151A] border border-[#22242A] rounded-2xl p-5 space-y-6">
                        <div className="flex items-end justify-between">
                            <div>
                                <span className="text-4xl font-light text-[#E8E8E8] tracking-tight">{completionPercentage}%</span>
                                <p className="text-[9px] text-[#5E6068] font-bold uppercase tracking-widest mt-1">Completion Rate</p>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-mono text-[#C0C4CC]">{completedIssues}/{totalIssues}</span>
                                <p className="text-[9px] text-[#5E6068] font-bold uppercase mt-1">Issues</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <ProgressBar percentage={completionPercentage} />
                            <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-[#5E6AD2]" />
                                    <span className="text-[#8A8F98] font-medium">{completedIssues} Done</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-[#2C2D35]" />
                                    <span className="text-[#8A8F98] font-medium">{activeIssues} Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Assignees Section */}
                <section className="space-y-5">
                    <h4 className="text-[11px] font-bold text-[#5E6068] uppercase tracking-widest flex items-center">
                        <Target className="w-3.5 h-3.5 mr-2" /> Contributors
                    </h4>

                    <div className="space-y-4">
                        <AnimatePresence>
                            {memberProgress.map(({ userId, percentage }, idx) => {
                                const user = users.find(u => u.id === userId);
                                if (!user) return null;
                                return (
                                    <motion.div
                                        key={userId}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-3">
                                                <img
                                                    src={user.avatarUrl}
                                                    className="w-5 h-5 rounded-full ring-1 ring-[#22242A] group-hover:ring-[#5E6AD2]/50 transition-all"
                                                    alt=""
                                                />
                                                <span className="text-xs font-medium text-[#C0C4CC] group-hover:text-[#E8E8E8] transition-colors">{user.name}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-[#5E6068] group-hover:text-[#5E6AD2] transition-colors">{percentage}%</span>
                                        </div>
                                        <div className="h-1 bg-[#1A1C23] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                className="h-full bg-[#2C2D35] group-hover:bg-[#5E6AD2] transition-all duration-500"
                                            />
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                        {memberProgress.length === 0 && (
                            <div className="py-8 text-center border border-dashed border-[#22242A] rounded-2xl">
                                <span className="text-[10px] text-[#3A3C46] font-bold uppercase italic tracking-widest">No active contributors</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Activity Section */}
                <section className="space-y-5 pb-8">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-[#5E6068] uppercase tracking-widest flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-2" /> Activity
                        </h4>
                    </div>

                    <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-[#22242A]">
                        {visibleActivities.map((activity, idx) => {
                            const user = users.find(u => u.id === activity.userId);
                            return (
                                <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="flex gap-4 relative"
                                >
                                    <div className="z-10 bg-[#0F1014] p-0.5">
                                        <img
                                            src={user?.avatarUrl}
                                            className="w-3.5 h-3.5 rounded-full ring-1 ring-[#22242A]"
                                            alt=""
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] text-[#8A8F98] leading-relaxed">
                                            <span className="font-bold text-[#C0C4CC] mr-1">{user?.name}</span>
                                            {activity.description}
                                            {activity.issueId && (
                                                <span className="text-[#5E6AD2] ml-1 font-bold hover:underline cursor-pointer">#{activity.entityTitle}</span>
                                            )}
                                        </p>
                                        <span className="text-[9px] text-[#3A3C46] font-bold uppercase mt-1 block">
                                            {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {filteredActivities.length > visibleCount && (
                            <button
                                onClick={() => setVisibleCount(prev => prev + 10)}
                                className="w-full py-3 text-[10px] font-bold text-[#5E6068] hover:text-[#E8E8E8] uppercase tracking-widest border border-[#22242A] rounded-xl hover:bg-[#14151A] transition-all mt-4"
                            >
                                Show full history
                            </button>
                        )}
                    </div>
                </section>

            </div>
        </aside>
    );
};
