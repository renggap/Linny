
import React, { useState, useMemo } from 'react';
import { Issue, Status, User } from '../types';
import {
  PriorityIcon,
  StatusIcon,
} from './Icons'; // Custom icons
import {
  Trash2,
  Edit2,
  GripVertical,
  CornerDownRight,
  Layers,
  Calendar,
  UserCircle,
  ArrowRight
} from 'lucide-react'; // Standard icons from lucide-react
import { UserAvatar } from './UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface IssueListProps {
  issues: Issue[];
  users: User[];
  onEdit: (issue: Issue) => void;
  onDelete: (issueId: string) => void;
  onStatusChange: (issueId: string, status: Status) => void;
  isPublicView?: boolean;
  canEdit?: boolean;
  statusFilter?: Status | null;
}

const IssueRow: React.FC<{
  issue: Issue;
  users: User[];
  onEdit: (i: Issue) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onDragStart: (e: React.DragEvent, issueId: string) => void;
  isDragging: boolean;
  canInteract?: boolean;
  delay?: number;
}> = ({ issue, users, onEdit, onDelete, onStatusChange, onDragStart, isDragging, canInteract = true, delay = 0 }) => {

  const assignees = users.filter((u: User) =>
    issue.assigneeIds.includes(u.id)
  );

  const isSubtask = !!issue.parentId;

  // Next status calculation for quick action
  const getNextStatus = (current: Status): Status => {
    const flow = [Status.Backlog, Status.Todo, Status.InProgress, Status.InReview, Status.Done, Status.Canceled];
    const idx = flow.indexOf(current);
    return flow[(idx + 1) % flow.length];
  };

  const handleAdvanceStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canInteract) return;
    onStatusChange(issue.id, getNextStatus(issue.status));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, delay }}
      className={cn(
        "group flex items-center py-2.5 px-4 bg-[#0F1014] hover:bg-[#1A1C23] border-b border-[#22242A] cursor-pointer transition-colors relative overflow-hidden",
        isDragging && "opacity-40 bg-[#1A1C23] border-[#363840]",
        isSubtask && "pl-12 bg-[#14151A]/50"
      )}
      draggable={canInteract}
      onDragStart={(e) => canInteract && onDragStart(e as any, issue.id)}
      onClick={() => onEdit(issue)}
    >
      {/* Selection/Hover Indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Drag Handle */}
      {canInteract && (
        <div className="mr-3 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="w-3.5 h-3.5 text-[#5E6068]" />
        </div>
      )}

      {/* Status */}
      <div
        className="mr-3 flex-shrink-0 relative group/status"
        onClick={handleAdvanceStatus}
      >
        <StatusIcon status={issue.status} className="w-4 h-4 hover:scale-110 transition-transform" />
      </div>

      {/* Priority */}
      <div className="mr-3 flex-shrink-0" title={`Priority: ${issue.priority}`}>
        <PriorityIcon priority={issue.priority} className="w-3.5 h-3.5" />
      </div>

      {/* ID */}
      <div className="mr-4 min-w-[60px] hidden sm:block">
        <span className="text-[11px] font-mono text-[#5E6068] group-hover:text-[#8A8F98] transition-colors">{issue.identifier}</span>
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center">
          {isSubtask && <CornerDownRight className="w-3 h-3 text-[#5E6068] mr-2" />}
          <span className={cn(
            "text-[13px] font-medium truncate transition-colors",
            issue.status === Status.Done || issue.status === Status.Canceled
              ? "text-[#5E6068] line-through decoration-[#363840]"
              : "text-[#C0C4CC] group-hover:text-[#E8E8E8]"
          )}>
            {issue.title}
          </span>
        </div>
      </div>

      {/* Meta Infos (Right Side) */}
      <div className="flex items-center space-x-4">

        {/* Due Date (Optional - just mocking logic if field existed or visually) */}
        {issue.dueDate && (
          <div className="hidden md:flex items-center space-x-1.5 text-[#5E6068] group-hover:text-[#8A8F98]">
            <Calendar className="w-3 h-3" />
            <span className="text-[10px] font-mono">{new Date(issue.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        )}

        {/* Assignees */}
        <div className="flex -space-x-1.5 min-w-[24px]">
          {assignees.slice(0, 3).map((u) => (
            <UserAvatar
              key={u.id}
              name={u.name}
              size="sm"
              className="border border-[#0F1014] ring-1 ring-[#26272F]"
              showRing
            />
          ))}
          {assignees.length === 0 && (
            <div className="w-5 h-5 rounded-full border border-[#26272F] border-dashed flex items-center justify-center group-hover:border-[#5E6068] transition-colors">
              <UserCircle className="w-3 h-3 text-[#5E6068]" />
            </div>
          )}
        </div>
      </div>

      {/* Hover Actions */}
      {canInteract && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all bg-[#0F1014]/80 backdrop-blur-sm pl-2 rounded-l-lg border-l border-[#22242A]">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(issue); }}
            className="p-1.5 text-[#5E6068] hover:text-accent hover:bg-[#1A1C23] rounded-md transition-colors"
            title="Edit Issue"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(issue.id); }}
            className="p-1.5 text-[#5E6068] hover:text-red-400 hover:bg-[#1A1C23] rounded-md transition-colors"
            title="Delete Issue"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </motion.div>
  );
};

export const IssueList: React.FC<IssueListProps> = ({ issues, users, onEdit, onDelete, onStatusChange, isPublicView = false, canEdit = true, statusFilter }) => {
  const statusOrder = [Status.Backlog, Status.Todo, Status.InProgress, Status.InReview, Status.Done, Status.Canceled];

  // Combine public view and edit permissions
  const canInteract = !isPublicView && canEdit;

  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null);

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    if (!canInteract) return;
    setDraggedIssueId(issueId);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image hack if desired, but native is fine
  };

  const handleDragEnd = () => {
    setDraggedIssueId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, status: Status) => {
    if (!canInteract) return;
    e.preventDefault();
    if (dragOverStatus !== status) setDragOverStatus(status);
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    if (!canInteract) return;
    e.preventDefault();
    if (draggedIssueId) onStatusChange(draggedIssueId, status);
    setDraggedIssueId(null);
    setDragOverStatus(null);
  };

  const renderGroup = (status: Status) => {
    const groupIssues = issues.filter((i: Issue) => i.status === status);
    const isDropTarget = dragOverStatus === status;

    // Don't render empty groups in public view usually, but assuming we keep structure
    // If list is fully empty, we show empty state below.
    if (groupIssues.length === 0 && !isDropTarget && isPublicView) return null;
    if (groupIssues.length === 0 && !isDropTarget && !canInteract && status === Status.Canceled) return null; // Hide cancelled if empty

    return (
      <div
        key={status}
        className={cn(
          "mb-6 transition-all duration-300 rounded-lg border border-transparent",
          isDropTarget ? "bg-[#1A1C23]/50 border-accent/30" : ""
        )}
        onDragOver={(e) => canInteract && handleDragOver(e, status)}
        onDrop={(e) => canInteract && handleDrop(e, status)}
      >
        <div className="flex items-center px-4 py-2 border-b border-[#22242A] mb-0 rounded-t-lg bg-[#0F1014]/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center space-x-2">
            <div className="p-0.5 rounded bg-[#1A1C23] border border-[#2C2D35]">
              <StatusIcon status={status} className="w-3 h-3" />
            </div>
            <span className="text-[12px] font-semibold text-[#E8E8E8] tracking-tight">{status}</span>
            <span className="text-[10px] font-mono text-[#5E6068] bg-[#1A1C23] px-1.5 py-0.5 rounded-md border border-[#22242A] ml-2">
              {groupIssues.length}
            </span>
          </div>
          {/* Action to create new in this status could go here */}
        </div>

        <div className="flex flex-col relative min-h-[10px]" onDragEnd={() => canInteract && handleDragEnd()}>
          <AnimatePresence>
            {groupIssues.map((issue: Issue, idx) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                users={users}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onDragStart={handleDragStart}
                isDragging={draggedIssueId === issue.id}
                canInteract={canInteract}
                delay={idx * 0.03}
              />
            ))}
          </AnimatePresence>

          {groupIssues.length === 0 && isDropTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-20 border-2 border-dashed border-[#2C2D35] m-2 rounded-lg flex items-center justify-center bg-[#1A1C23]/20"
            >
              <div className="flex items-center text-[#5E6068]">
                <span className="text-[11px] font-medium mr-2">Move to {status}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </motion.div>
          )}

          {groupIssues.length === 0 && !isDropTarget && !isPublicView && (
            <div className="py-3 px-4 text-[11px] text-[#2C2D35] italic select-none">No issues</div>
          )}
        </div>
      </div>
    );
  };

  // When statusFilter is set, only show that status group. Otherwise show all.
  const renderedStatuses = useMemo(() => {
    return statusFilter ? [statusFilter] : statusOrder;
  }, [statusFilter]);

  // Debug log to track filtering
  console.log('[IssueList] statusFilter:', statusFilter, 'statuses to render:', renderedStatuses);

  return (
    <div className="flex-1 pb-20 no-scrollbar scroll-smooth bg-[#0F1014] px-6 py-6" onDragEnd={() => !isPublicView && handleDragEnd()}>
      {renderedStatuses.map(status => renderGroup(status))}

      {issues.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-32 text-center"
        >
          <div className="w-16 h-16 bg-[#1A1C23] border border-[#2C2D35] rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-black/50">
            <Layers className="w-8 h-8 text-[#5E6068]" />
          </div>
          <h3 className="text-[#E8E8E8] font-semibold mb-2 text-lg tracking-tight">Scope Empty</h3>
          <p className="text-sm text-[#8A8F98] max-w-xs leading-relaxed">
            No active issues found in this context. Create a new issue to initialize the workflow.
          </p>
        </motion.div>
      )}
    </div>
  );
};
