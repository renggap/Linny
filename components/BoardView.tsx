
import React, { useState } from 'react';
import { Issue, Status, User, Priority } from '../types';
import { StatusIcon, PriorityIcon, Trash2, Calendar, Plus } from './Icons';
import { UserCircle } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BoardViewProps {
  issues: Issue[];
  users: User[];
  onEdit: (issue: Issue) => void;
  onDelete: (issueId: string) => void;
  onStatusChange: (issueId: string, status: Status) => void;
  onCreateIssue?: (_status: Status) => void;
  isPublicView?: boolean;
  canEdit?: boolean;
  statusFilter?: Status | null;
}

const BoardCard = ({ issue, users, onEdit, onDelete, onDragStart, isDragging, canInteract, delay = 0 }: {
  issue: Issue;
  users: User[];
  onEdit: (i: Issue) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  isDragging: boolean;
  canInteract?: boolean;
  delay?: number;
}) => {
  const assignees = users.filter(u => issue.assigneeIds?.includes(u.id));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay }}
      draggable={canInteract}
      onDragStart={(e) => canInteract && onDragStart(e as any, issue.id)}
      onClick={() => onEdit(issue)}
      className={cn(
        "group relative bg-[#14151A] border border-[#22242A] hover:border-[#2C2D35] p-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-xl hover:shadow-black/20",
        isDragging && "opacity-40 grayscale"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono text-[#5E6068] tracking-widest uppercase font-bold">{issue.identifier}</span>
        </div>
        {issue.priority !== Priority.NoPriority && (
          <div className="p-1 rounded bg-[#0F1014] border border-[#22242A]">
            <PriorityIcon priority={issue.priority} className="w-3 h-3" />
          </div>
        )}
      </div>

      <h4 className="text-[13px] font-medium text-[#C0C4CC] mb-4 line-clamp-2 leading-relaxed group-hover:text-[#E8E8E8] transition-colors">
        {issue.title}
      </h4>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center space-x-2">
          {issue.dueDate ? (
            <div className="flex items-center space-x-1.5 text-[#5E6068] bg-[#0F1014] px-2 py-0.5 rounded border border-[#22242A]">
              <Calendar className="w-2.5 h-2.5" />
              <span className="text-[9px] font-mono tracking-tighter">
                {new Date(issue.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ) : (
            <div className="w-4 h-4" /> // maintain height
          )}
        </div>

        <div className="flex -space-x-1.5">
          {assignees.length > 0 ? (
            assignees.slice(0, 3).map((u, i) => (
              <div key={u.id} style={{ zIndex: 3 - i }}>
                <UserAvatar
                  name={u.name}
                  size="sm"
                  className="border border-[#14151A] ring-1 ring-[#22242A]"
                />
              </div>
            ))
          ) : (
            <div className="w-5 h-5 rounded-full border border-dashed border-[#22242A] flex items-center justify-center">
              <UserCircle className="w-3 h-3 text-[#2C2D35]" />
            </div>
          )}
        </div>
      </div>

      {canInteract && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(issue.id); }}
          className="absolute top-2 right-2 p-1 text-[#2C2D35] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
};

export const BoardView: React.FC<BoardViewProps> = ({ issues, users, onEdit, onDelete, onStatusChange, onCreateIssue, isPublicView = false, canEdit = true, statusFilter }) => {
  // Combine public view and edit permissions
  const canInteract = !isPublicView && canEdit;
  const allStatuses = [Status.Backlog, Status.Todo, Status.InProgress, Status.InReview, Status.Done, Status.Canceled];
  // When statusFilter is set, only show that status column. Otherwise show all.
  const statuses = statusFilter ? [statusFilter] : allStatuses;

  // Debug log to track filtering
  console.log('[BoardView] statusFilter:', statusFilter, 'statuses to render:', statuses);
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      // Only scroll horizontally if we're not scrolling a column vertically
      const target = e.target as HTMLElement;
      const isColumnContent = target.closest('.column-content');
      if (isColumnContent) {
        const column = isColumnContent as HTMLElement;
        const isAtTop = column.scrollTop === 0 && e.deltaY < 0;
        const isAtBottom = column.scrollHeight - column.scrollTop === column.clientHeight && e.deltaY > 0;

        if (!isAtTop && !isAtBottom) return; // Let the column scroll vertically
      }
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    if (!canInteract) return;
    setDraggedIssueId(issueId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: Status) => {
    if (!canInteract) return;
    e.preventDefault();
    if (dragOverColumn !== status) setDragOverColumn(status);
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    if (!canInteract) return;
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedIssueId) {
      console.log('[BoardView] Dropping issue', draggedIssueId, 'to status', status);
      onStatusChange(draggedIssueId, status);
      setDraggedIssueId(null);
    }
  };

  const handleDragLeave = (e: React.DragEvent, _status: Status) => {
    if (!canInteract) return;
    // Only clear dragOverColumn if leaving the column itself, not entering a child element
    if (e.currentTarget === e.target) {
      setDragOverColumn(null);
    }
  };

  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      className="h-full w-full overflow-x-auto overflow-y-hidden bg-[#0F1014] scrollbar-thin"
    >
      <div className="flex h-full p-6 space-x-6 min-w-max pb-10">
        {statuses.map(status => {
          const columnIssues = issues.filter(i => i.status === status);

          return (
            <div
              key={status}
              className={cn(
                "flex-shrink-0 w-[300px] flex flex-col transition-all duration-300",
                dragOverColumn === status ? "bg-[#1A1C23]/30 scale-[1.01]" : ""
              )}
              onDragOver={(e) => handleDragOver(e, status)}
              onDrop={(e) => handleDrop(e, status)}
              onDragLeave={(e) => handleDragLeave(e, status)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-2 group/header">
                <div className="flex items-center space-x-3">
                  <div className="p-1 rounded bg-[#1A1C23] border border-[#2C2D35]">
                    <StatusIcon status={status} className="w-3 h-3" />
                  </div>
                  <span className="text-[12px] font-semibold text-[#E8E8E8] tracking-tight">{status}</span>
                  <span className="text-[10px] bg-[#1A1C23] px-2 py-0.5 rounded-full text-[#5E6068] font-mono font-bold border border-[#22242A]">{columnIssues.length}</span>
                </div>
                {canInteract && onCreateIssue && (
                  <button
                    onClick={() => onCreateIssue(status)}
                    className="p-1 text-[#5E6068] hover:text-[#E8E8E8] hover:bg-[#1A1C23] rounded transition-all opacity-0 group-hover/header:opacity-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Column Body */}
              <div className="flex-1 overflow-y-auto space-y-3 px-1 no-scrollbar pb-10 column-content">
                <AnimatePresence>
                  {columnIssues.map((issue, idx) => (
                    <BoardCard
                      key={issue.id}
                      issue={issue}
                      users={users}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onDragStart={handleDragStart}
                      isDragging={draggedIssueId === issue.id}
                      canInteract={canInteract}
                      delay={idx * 0.05}
                    />
                  ))}
                </AnimatePresence>

                {columnIssues.length === 0 && (
                  <div className="h-24 border border-dashed border-[#22242A] flex items-center justify-center">
                    <span className="text-[11px] text-[#2C2D35] italic">No active issues</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
