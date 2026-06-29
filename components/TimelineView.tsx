
import React, { useMemo } from 'react';
import { Issue, User, Status } from '../types';
import { StatusIcon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TimelineViewProps {
  issues: Issue[];
  users: User[];
  onEdit: (issue: Issue) => void;
  statusFilter?: Status | null;
}

const CELL_WIDTH = 56;
const HEADER_HEIGHT = 56;
const ROW_HEIGHT = 48;
const SIDEBAR_WIDTH = 280;

export const TimelineView: React.FC<TimelineViewProps> = ({ issues, users, onEdit, statusFilter }) => {
  // When statusFilter is set, only show issues with that status
  const filteredIssues = useMemo(() => {
    return statusFilter ? issues.filter(i => i.status === statusFilter) : issues;
  }, [issues, statusFilter]);

  // Debug log to track filtering
  console.log('[TimelineView] statusFilter:', statusFilter, 'filtered issues count:', filteredIssues.length);

  const { startDate, totalDays, dates } = useMemo(() => {
    if (issues.length === 0) {
      const now = new Date();
      const dates = Array.from({ length: 20 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() + i - 5);
        return d;
      });
      return { startDate: dates[0], endDate: dates[dates.length - 1], totalDays: dates.length, dates };
    }

    let min = new Date(8640000000000000);
    let max = new Date(-8640000000000000);

    issues.forEach(i => {
      let start = i.startDate ? new Date(i.startDate) : new Date(i.createdAt);
      if (isNaN(start.getTime())) start = new Date();
      let end = i.dueDate ? new Date(i.dueDate) : new Date(start.getTime() + 86400000);
      if (isNaN(end.getTime())) end = new Date(start.getTime() + 86400000);

      if (start < min) min = new Date(start);
      if (end > max) max = new Date(end);
    });

    min.setDate(min.getDate() - 4);
    max.setDate(max.getDate() + 14);
    min.setHours(0, 0, 0, 0);
    max.setHours(0, 0, 0, 0);

    const dayCount = Math.max(20, Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));
    const dateArray = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(min);
      d.setDate(d.getDate() + i);
      return d;
    });

    return { startDate: min, endDate: max, totalDays: dayCount, dates: dateArray };
  }, [issues]);

  const sortedIssues = useMemo(() => {
    const issueMap = new Map(filteredIssues.map(i => [i.id, i]));
    const organized: { issue: Issue; level: number }[] = [];
    const visibleRoots = filteredIssues.filter(i => !i.parentId || !issueMap.has(i.parentId));

    visibleRoots.forEach(root => {
      organized.push({ issue: root, level: 0 });
      const children = filteredIssues.filter(i => i.parentId === root.id);
      children.forEach(child => organized.push({ issue: child, level: 1 }));
    });

    return organized;
  }, [filteredIssues]);

  const getPosition = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    return Math.floor((d.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) * CELL_WIDTH;
  };

  const getBarStyle = (issue: Issue) => {
    let start = issue.startDate ? new Date(issue.startDate) : new Date(issue.createdAt);
    if (isNaN(start.getTime())) start = new Date();
    let end = issue.dueDate ? new Date(issue.dueDate) : new Date(start.getTime() + 86400000);
    if (isNaN(end.getTime())) end = new Date(start.getTime() + 86400000);

    const left = getPosition(start);
    const right = getPosition(end);
    let width = right - left;
    if (width < CELL_WIDTH) width = CELL_WIDTH;

    return { left: `${left}px`, width: `${width}px` };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0F1014] overflow-hidden border-t border-[#22242A]">
      <div className="flex-1 overflow-auto scroll-smooth">
        <div className="flex relative min-h-full" style={{ width: SIDEBAR_WIDTH + (totalDays * CELL_WIDTH) }}>

          {/* Locked Sidebar Column */}
          <div
            className="sticky left-0 z-30 bg-[#0F1014] border-r border-[#22242A] flex-shrink-0 shadow-[10px_0_20px_rgba(0,0,0,0.3)]"
            style={{ width: SIDEBAR_WIDTH }}
          >
            {/* Corner header element */}
            <div className="bg-[#14151A] border-b border-[#22242A] flex items-center px-6" style={{ height: HEADER_HEIGHT }}>
              <span className="text-[11px] font-semibold text-[#5E6068] uppercase tracking-wider">Issue Description</span>
            </div>
            {sortedIssues.map(({ issue, level }) => (
              <div
                key={issue.id}
                onClick={() => onEdit(issue)}
                className={cn(
                  "flex items-center px-6 border-b border-[#1A1C23] hover:bg-[#1A1C23] cursor-pointer transition-all group",
                  level > 0 && "bg-[#101114]/50"
                )}
                style={{ height: ROW_HEIGHT, paddingLeft: `${24 + level * 20}px` }}
              >
                <div className="p-0.5 rounded bg-[#1A1C23] border border-[#2C2D35] mr-3 group-hover:border-accent/50 transition-colors">
                  <StatusIcon status={issue.status} className="w-2.5 h-2.5" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-[12px] font-medium text-[#C0C4CC] group-hover:text-[#E8E8E8]">
                    {issue.title}
                  </span>
                  <span className="text-[9px] font-mono text-[#5E6068] tracking-widest">{issue.identifier}</span>
                </div>

                {/* Assignee Avatar */}
                <div className="ml-2 flex-shrink-0">
                  {issue.assigneeIds.length > 0 ? (
                    <div className="flex -space-x-1">
                      {users.filter(u => issue.assigneeIds.includes(u.id)).slice(0, 3).map(u => (
                        <UserAvatar
                          key={u.id}
                          name={u.name}
                          avatarUrl={u.avatarUrl}
                          size="sm"
                          className="ring-1 ring-[#22242A]"
                        />
                      ))}
                    </div>
                  ) : (
                    <UserCircle className="w-4 h-4 text-[#2C2D35]" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Grid Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-visible relative">

            {/* Sticky Timeline Header */}
            <div
              className="flex sticky top-0 z-20 bg-[#14151A] border-b border-[#22242A]"
              style={{ height: HEADER_HEIGHT, width: totalDays * CELL_WIDTH }}
            >
              {dates.map(date => {
                const isToday = new Date().toDateString() === date.toDateString();
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      "flex-shrink-0 border-r border-[#22242A]/50 flex flex-col items-center justify-center transition-colors",
                      isToday ? "bg-accent/10" : isWeekend ? "bg-[#101114]/30" : ""
                    )}
                    style={{ width: CELL_WIDTH }}
                  >
                    <span className={cn(
                      "text-[12px] font-bold leading-none mb-1",
                      isToday ? "text-accent" : "text-[#E8E8E8]"
                    )}>{date.getDate()}</span>
                    <span className="text-[9px] text-[#5E6068] font-bold uppercase tracking-tighter">{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                  </div>
                );
              })}
            </div>

            {/* Grid Body */}
            <div className="relative flex-1" style={{ width: totalDays * CELL_WIDTH }}>

              {/* Background Vertical Guidelines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {dates.map((d, i) => (
                  <div key={i} className={cn("border-r border-[#22242A]/30 h-full", d.getDay() === 0 || d.getDay() === 6 ? "bg-[#101114]/10" : "")} style={{ width: CELL_WIDTH }}></div>
                ))}
              </div>

              {/* Row content (Bars) */}
              {sortedIssues.map(({ issue }, idx) => {
                const style = getBarStyle(issue);
                const isDone = issue.status === 'Done' || issue.status === 'Canceled';

                return (
                  <div
                    key={issue.id}
                    className="relative border-b border-[#1A1C23] group"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <motion.div
                      layoutId={`timeline-bar-${issue.id}`}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={cn(
                        "absolute top-[10px] bottom-[10px] rounded-lg border px-3 flex items-center overflow-hidden transition-all z-10 cursor-pointer shadow-lg hover:brightness-110",
                        isDone
                          ? "bg-[#1A1C23] border-[#2C2D35] text-[#5E6068]"
                          : "bg-accent border-accent text-white shadow-accent/10"
                      )}
                      style={style}
                      onClick={() => onEdit(issue)}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider truncate prose-invert">{issue.title}</span>

                      {/* Gradient Shine */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shine_1.5s_infinite] pointer-events-none" />
                    </motion.div>
                  </div>
                );
              })}

              {/* Today line indicator */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-accent z-20 pointer-events-none"
                style={{ left: getPosition(new Date()) + (CELL_WIDTH / 2) }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_var(--accent-color)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
