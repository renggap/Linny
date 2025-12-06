
import React, { useMemo } from 'react';
import { Issue, User } from '../types';
import { StatusIcon } from './Icons';

interface TimelineViewProps {
  issues: Issue[];
  users: User[];
  onEdit: (issue: Issue) => void;
}

const CELL_WIDTH = 50; // Pixels per day
const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 44;
const SIDEBAR_WIDTH = 250;

export const TimelineView: React.FC<TimelineViewProps> = ({ issues, users, onEdit }) => {
  
  // 1. Calculate Date Range
  const { startDate, totalDays, dates } = useMemo(() => {
    if (issues.length === 0) {
        const now = new Date();
        const dates = Array.from({ length: 14 }, (_, i) => {
            const d = new Date(now);
            d.setDate(d.getDate() + i - 2);
            return d;
        });
        return { startDate: dates[0], endDate: dates[dates.length-1], totalDays: 14, dates };
    }

    // Initialize with extreme values
    let min = new Date(8640000000000000); 
    let max = new Date(-8640000000000000);

    issues.forEach(i => {
      // Determine effective start date (StartDate -> CreatedAt)
      let start = i.startDate ? new Date(i.startDate) : new Date(i.createdAt);
      if (isNaN(start.getTime())) start = new Date(); // Fallback

      // Determine effective end date (DueDate -> Start + 1 day)
      let end = i.dueDate ? new Date(i.dueDate) : new Date(start.getTime() + 86400000);
      if (isNaN(end.getTime())) end = new Date(start.getTime() + 86400000); // Fallback

      if (start < min) min = new Date(start);
      if (end > max) max = new Date(end);
    });

    // Add padding (2 days before, 7 days after)
    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 7);

    // Normalize to start of day
    min.setHours(0, 0, 0, 0);
    max.setHours(0, 0, 0, 0);

    const dayCount = Math.max(7, Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));
    
    const dateArray = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(min);
      d.setDate(d.getDate() + i);
      return d;
    });

    return { startDate: min, endDate: max, totalDays: dayCount, dates: dateArray };
  }, [issues]);

  // 2. Organize Issues (Hierarchy)
  const sortedIssues = useMemo(() => {
    const issueMap = new Map(issues.map(i => [i.id, i]));
    const organized: { issue: Issue; level: number }[] = [];

    // Identify "Roots" for the current view:
    // 1. Issues with no parent
    // 2. Issues whose parent is NOT in the current visible list (Orphaned in view)
    const visibleRoots = issues.filter(i => !i.parentId || !issueMap.has(i.parentId));

    visibleRoots.forEach(root => {
      organized.push({ issue: root, level: 0 });
      // Find direct children that ARE in the visible list
      const children = issues.filter(i => i.parentId === root.id);
      children.forEach(child => organized.push({ issue: child, level: 1 }));
    });

    return organized;
  }, [issues]);

  // Helper to get position
  const getPosition = (date: Date) => {
    // Normalize date to start of day for comparison
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const s = new Date(startDate);
    s.setHours(0,0,0,0);

    const diffTime = d.getTime() - s.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays * CELL_WIDTH;
  };

  // Helper to get bar style
  const getBarStyle = (issue: Issue) => {
    let start = issue.startDate ? new Date(issue.startDate) : new Date(issue.createdAt);
    if (isNaN(start.getTime())) start = new Date();
    
    let end = issue.dueDate ? new Date(issue.dueDate) : new Date(start.getTime() + 86400000); 
    if (isNaN(end.getTime())) end = new Date(start.getTime() + 86400000);

    const left = getPosition(start);
    const right = getPosition(end);
    let width = right - left;
    
    // Minimum width of half a cell for visibility
    if (width < CELL_WIDTH / 2) width = CELL_WIDTH / 2;

    return {
      left: `${left}px`,
      width: `${width}px`,
    };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1E1F24] overflow-hidden text-sm">
      
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        <div className="flex relative min-h-full">
          
          {/* 1. Sidebar (Fixed Left) */}
          <div 
             className="sticky left-0 z-20 bg-[#1E1F24] border-r border-[#363840] flex-shrink-0"
             style={{ width: SIDEBAR_WIDTH, marginTop: HEADER_HEIGHT }}
          >
            {sortedIssues.map(({ issue, level }) => (
              <div 
                key={issue.id} 
                onClick={() => onEdit(issue)}
                className="flex items-center px-4 border-b border-[#2E3036] hover:bg-[#2E3036] cursor-pointer transition-colors text-gray-300 group"
                style={{ height: ROW_HEIGHT, paddingLeft: `${16 + level * 20}px` }}
              >
                <StatusIcon status={issue.status} className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                <span className={`truncate text-xs ${level === 0 ? 'font-medium group-hover:text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                   {issue.identifier} {issue.title}
                </span>
              </div>
            ))}
          </div>

          {/* 2. Timeline Grid */}
          <div className="flex-1 relative">
            
            {/* Header Dates */}
            <div 
                className="flex sticky top-0 z-30 bg-[#1E1F24] border-b border-[#363840]"
                style={{ height: HEADER_HEIGHT, width: `${totalDays * CELL_WIDTH}px` }}
            >
              {dates.map(date => {
                 const isToday = new Date().toDateString() === date.toDateString();
                 return (
                    <div 
                        key={date.toISOString()} 
                        className={`flex-shrink-0 border-r border-[#2E3036] flex flex-col items-center justify-center text-[10px] ${isToday ? 'bg-[#5E6AD2]/10' : ''}`}
                        style={{ width: CELL_WIDTH }}
                    >
                        <span className={`font-semibold ${isToday ? 'text-[#5E6AD2]' : 'text-gray-400'}`}>{date.getDate()}</span>
                        <span className="text-gray-600 uppercase">{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                    </div>
                 );
              })}
            </div>

            {/* Rows & Bars */}
            <div className="relative" style={{ width: `${totalDays * CELL_WIDTH}px` }}>
              
              {/* Vertical Grid Lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {dates.map((d, i) => (
                  <div key={i} className="border-r border-[#2E3036]/50 h-full" style={{ width: CELL_WIDTH }}></div>
                ))}
              </div>

              {/* Task Bars */}
              {sortedIssues.map(({ issue }, index) => {
                 const style = getBarStyle(issue);
                 const assignee = users.find(u => u.id === issue.assigneeId);
                 
                 // Color coding based on status
                 let barColor = 'bg-[#5E6AD2] border-[#5E6AD2]'; // Default Blue
                 if (issue.status === 'Done') barColor = 'bg-[#5E6AD2]/60 border-[#5E6AD2]/60';
                 if (issue.status === 'Canceled') barColor = 'bg-gray-600 border-gray-600';
                 if (issue.status === 'In Progress') barColor = 'bg-orange-500 border-orange-500';
                 
                 return (
                   <div 
                      key={issue.id} 
                      className="relative border-b border-[#2E3036]/30 group"
                      style={{ height: ROW_HEIGHT }}
                   >
                      <div 
                        className={`absolute top-[10px] bottom-[10px] rounded-[4px] border shadow-sm flex items-center px-2 overflow-hidden transition-all whitespace-nowrap z-10 cursor-pointer hover:brightness-110 ${barColor}`}
                        style={style}
                        onClick={() => onEdit(issue)}
                      >
                         {issue.blockedBy && issue.blockedBy.length > 0 && (
                             <span className="mr-1 text-white/80 text-[10px]" title="Blocked">🔒</span>
                         )}
                         <span className="text-[10px] font-medium text-white truncate drop-shadow-md">{issue.title}</span>
                      </div>
                   </div>
                 );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
