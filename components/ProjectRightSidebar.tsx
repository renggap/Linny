
import React, { useMemo, useState } from 'react';
import { Project, Issue, User, Status, Activity } from '../types';
import { Calendar } from 'lucide-react';
import { DatePicker } from './DatePicker';
import { UserSelect } from './UserSelect';

interface ProjectRightSidebarProps {
    project: Project;
    issues: Issue[];
    users: User[];
    activities: Activity[];
    onUpdate: (project: Project) => void;
}

export const ProjectRightSidebar: React.FC<ProjectRightSidebarProps> = ({
    project,
    issues,
    users,
    activities,
    onUpdate
}) => {
    const [visibleCount, setVisibleCount] = useState(5);

    const projectIssues = useMemo(() => issues.filter(i => i.projectId === project.id), [issues, project.id]);

    // Progress Calculation
    const totalIssues = projectIssues.length;
    const completedIssues = projectIssues.filter(i => i.status === Status.Done || i.status === Status.Canceled).length;
    const startedIssues = projectIssues.filter(i => i.status === Status.InProgress || i.status === Status.InReview).length;

    const completionPercentage = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

    // Member Progress
    const memberProgress = useMemo(() => {
        const memberStats = new Map<string, { total: number, completed: number }>();

        projectIssues.forEach(issue => {
            if (!issue.assigneeId) return;
            const stats = memberStats.get(issue.assigneeId) || { total: 0, completed: 0 };
            stats.total++;
            if (issue.status === Status.Done || issue.status === Status.Canceled) {
                stats.completed++;
            }
            memberStats.set(issue.assigneeId, stats);
        });

        return Array.from(memberStats.entries()).map(([userId, stats]) => ({
            userId,
            percentage: Math.round((stats.completed / stats.total) * 100),
            count: stats.total
        })).sort((a, b) => b.count - a.count);
    }, [projectIssues]);

    // Filter Activities
    const filteredActivities = useMemo(() => {
        // Filter by project ID (either directed at project, or issues within project)
        // Since activity has projectId, we can use that directly.
        // Also ensure we sort descendant
        return (activities || [])
            .filter(a => a.projectId === project.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [activities, project.id]);

    const visibleActivities = useMemo(() => {
        return filteredActivities.slice(0, visibleCount);
    }, [filteredActivities, visibleCount]);

    return (
        <aside className="w-80 border-l border-[#363840] bg-[#1E1F24] flex flex-col h-full overflow-y-auto">
            <div className="p-6 space-y-8">

                {/* Project Lead */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Project Lead</h3>
                    <UserSelect
                        users={users}
                        selectedUserIds={project.leadId ? [project.leadId] : []}
                        onSelect={(id) => onUpdate({ ...project, leadId: id })}
                        placeholder="Assign Lead"
                    />
                </div>

                {/* Dates */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Timeline</h3>
                    <div className="space-y-3">
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Start Date</label>
                            <DatePicker
                                value={project.startDate}
                                onChange={(date) => onUpdate({ ...project, startDate: date })}
                                placeholder="Set Start Date"
                                className="w-full"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Target Date</label>
                            <DatePicker
                                value={project.targetDate}
                                onChange={(date) => onUpdate({ ...project, targetDate: date })}
                                placeholder="Set Target Date"
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Progress Chart */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">Progress</h3>
                    <div className="flex items-center space-x-4">
                        {/* Donut Chart */}
                        <div className="relative w-20 h-20">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                {/* Background */}
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#2E3036"
                                    strokeWidth="4"
                                />
                                {/* Progress */}
                                {totalIssues > 0 && (
                                    <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#5E6AD2" // Completed Color
                                        strokeWidth="4"
                                        strokeDasharray={`${completionPercentage}, 100`}
                                    />
                                )}
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                                {completionPercentage}%
                            </div>
                        </div>

                        <div className="space-y-1 text-xs">
                            <div className="flex items-center text-gray-300">
                                <span className="w-2 h-2 rounded-full bg-[#5E6AD2] mr-2"></span>
                                <span>Done ({completedIssues})</span>
                            </div>
                            <div className="flex items-center text-gray-400">
                                <span className="w-2 h-2 rounded-full bg-[#F2C94C] mr-2"></span>
                                <span>In Progress ({startedIssues})</span>
                            </div>
                            <div className="flex items-center text-gray-500">
                                <span className="w-2 h-2 rounded-full bg-gray-600 mr-2"></span>
                                <span>Todo ({totalIssues - completedIssues - startedIssues})</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Member Progress */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Member Progress</h3>
                    <div className="space-y-3">
                        {memberProgress.map(({ userId, percentage }) => {
                            const user = users.find(u => u.id === userId);
                            if (!user) return null;
                            return (
                                <div key={userId} className="flex items-center justify-between group">
                                    <div className="flex items-center space-x-2">
                                        <img src={user.avatarUrl} className="w-5 h-5 rounded-full grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt={user.name} />
                                        <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">{user.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-16 h-1 bg-[#2E3036] rounded-full overflow-hidden">
                                            <div className="h-full bg-[#5E6AD2]" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                        <span className="text-xs text-gray-500 w-6 text-right">{percentage}%</span>
                                    </div>
                                </div>
                            )
                        })}
                        {memberProgress.length === 0 && <span className="text-xs text-gray-600 italic">No members assigned</span>}
                    </div>
                </div>

                {/* Activity Log */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Activity Log</h3>
                    <div className="space-y-4">
                        {visibleActivities.map(activity => {
                            const user = users.find(u => u.id === activity.userId);
                            return (
                                <div key={activity.id} className="flex gap-3 relative pl-4 border-l border-[#2E3036]">
                                    <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-[#2E3036] ring-4 ring-[#1E1F24]"></div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center space-x-1 mb-0.5">
                                            {user && <img src={user.avatarUrl} className="w-3.5 h-3.5 rounded-full" alt={user.name} />}
                                            <span className="text-xs font-medium text-gray-200">{user?.name || 'Unknown'}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {activity.description}
                                            {activity.issueId && (
                                                <> on <a href="#" className="text-[#5E6AD2] hover:underline hover:text-[#4b55aa] transition-colors">{activity.entityTitle}</a></>
                                            )}
                                            {!activity.issueId && activity.entityTitle && (
                                                <span className="text-gray-300"> ({activity.entityTitle})</span>
                                            )}
                                        </span>
                                        <span className="text-[10px] text-gray-600 mt-1">
                                            {new Date(activity.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {visibleActivities.length === 0 && <span className="text-xs text-gray-600 italic">No activity recorded</span>}

                        {filteredActivities.length > visibleCount && (
                            <button
                                onClick={() => setVisibleCount(prev => prev + 10)}
                                className="text-xs text-[#5E6AD2] hover:text-[#4b55aa] font-medium pt-2 pl-4"
                            >
                                View More
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </aside>
    );
};
