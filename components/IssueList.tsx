
import React, { useState } from 'react';
import { Issue, Status, User } from '../types';
import { PriorityIcon, StatusIcon, Trash2, Edit2, GripVertical, CornerDownRight } from './Icons';

interface IssueListProps {
  issues: Issue[];
  users: User[];
  onEdit: (issue: Issue) => void;
  onDelete: (issueId: string) => void;
  onStatusChange: (issueId: string, status: Status) => void;
  isPublicView?: boolean;
}

const IssueRow: React.FC<{
  issue: Issue;
  users: User[];
  onEdit: (i: Issue) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onDragStart: (e: React.DragEvent, issueId: string) => void;
  isDragging: boolean;
  issues: Issue[]; // Add issues prop to access parent issue
  isPublicView?: boolean;
}> = ({ issue, users, onEdit, onDelete, onStatusChange, onDragStart, isDragging, issues, isPublicView }) => {

  const assignees = users.filter(u =>
    (issue.assigneeIds && issue.assigneeIds.includes(u.id)) ||
    (issue.assigneeId && u.id === issue.assigneeId)
  );

  const isSubtask = !!issue.parentId;
  const parentIssue = isSubtask ? issues.find(i => i.id === issue.parentId) : null;

  const handleAdvanceStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPublicView) return;
    let nextStatus = Status.Todo;
    switch (issue.status) {
      case Status.Backlog: nextStatus = Status.Todo; break;
      case Status.Todo: nextStatus = Status.InProgress; break;
      case Status.InProgress: nextStatus = Status.InReview; break;
      case Status.InReview: nextStatus = Status.Done; break;
      case Status.Done: nextStatus = Status.Backlog; break;
      case Status.Canceled: nextStatus = Status.Backlog; break;
      default: nextStatus = Status.Todo;
    }
    onStatusChange(issue.id, nextStatus);
  };

  return (
    <div
      className={`group flex items-center py-2.5 px-4 hover:bg-[#2E3036] border-b border-[#363840] cursor-pointer transition-colors bg-[#1E1F24] min-w-[600px] md:min-w-0 ${isDragging ? 'opacity-50' : ''} ${isSubtask ? 'pl-12 bg-[#1E1F24]/50' : ''}`}
      draggable={!isPublicView}
      onDragStart={(e) => !isPublicView && onDragStart(e, issue.id)}
      onClick={() => onEdit(issue)}
    >
      {/* Subtask Hierarchy Indicator */}
      {isSubtask && (
        <div className="absolute left-4 top-0 bottom-0 flex items-center justify-center">
          <div className="w-4 h-full border-b border-gray-700 rounded-bl-lg -mt-4 mb-4" style={{ height: '50%', width: '12px' }}></div>
        </div>
      )}
      {/* Or simpler icon */}
      {isSubtask && <div className="mr-3 text-gray-600"><CornerDownRight className="w-3.5 h-3.5" /></div>}


      {/* Drag Handle */}
      <div className="mr-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity">
        <GripVertical className="w-3.5 h-3.5 text-gray-500" />
      </div>

      {/* Interactive Status Icon (Replaces Checkbox) */}
      <div
        className="w-5 mr-3 flex justify-center items-center cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleAdvanceStatus}
        title={`Current: ${issue.status}. Click to advance.`}
      >
        <StatusIcon status={issue.status} />
      </div>

      <div className="mr-3 text-gray-500">
        <PriorityIcon priority={issue.priority} />
      </div>

      <div className="hidden md:block min-w-[60px] text-xs font-mono text-gray-500 mr-4">
        {issue.identifier}
      </div>

      {isSubtask && parentIssue && (
        <div className="hidden md:block mr-3 text-xs text-gray-600">
          ← {parentIssue.identifier}
        </div>
      )}

      <div className="flex-1 text-sm font-medium text-[#E5E7EB] group-hover:text-white truncate pr-4">
        <span className={issue.status === Status.Done || issue.status === Status.Canceled ? "line-through text-gray-500" : ""}>{issue.title}</span>
      </div>

      {/* Action Buttons (Visible on Hover) */}
      {!isPublicView && (
        <div className="hidden group-hover:flex items-center space-x-2 mr-4">
          <button onClick={(e) => { e.stopPropagation(); onEdit(issue); }} className="text-gray-500 hover:text-white">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(issue.id); }} className="text-gray-500 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Date / Meta */}
      <div className="text-xs text-gray-600 w-24 text-right">
        {issue.dueDate ? (
          <span className="text-orange-400">{new Date(issue.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        ) : (
          <span>{new Date(issue.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        )}
      </div>

      {/* Avatars (Stacked) */}
      <div className="relative min-w-[24px] h-6 ml-4 flex justify-end items-center mr-2">
        {assignees.length > 0 ? (
          <div className="flex -space-x-1.5 direction-rtl">
            {assignees.slice(0, 3).map((u, i) => (
              <img
                key={u.id}
                src={u.avatarUrl}
                alt={u.name}
                className="w-5 h-5 rounded-full border border-[#1E1F24] ring-1 ring-[#2E3036] z-[1]"
                style={{ zIndex: 3 - i }}
              />
            ))}
            {assignees.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-gray-700 border border-[#1E1F24] flex items-center justify-center text-[8px] text-white z-0">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full border border-gray-700 border-dashed" />
        )}
      </div>

    </div>
  );
};

export const IssueList: React.FC<IssueListProps> = ({ issues, users, onEdit, onDelete, onStatusChange, isPublicView }) => {
  const statusOrder = [Status.Backlog, Status.Todo, Status.InProgress, Status.InReview, Status.Done, Status.Canceled];
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null);

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    if (isPublicView) return;
    setDraggedIssueId(issueId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedIssueId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, status: Status) => {
    if (isPublicView) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    if (isPublicView) return;
    e.preventDefault();
    if (draggedIssueId) {
      onStatusChange(draggedIssueId, status);
    }
    setDraggedIssueId(null);
    setDragOverStatus(null);
  };

  const renderGroup = (status: Status) => {
    const groupIssues = issues.filter(i => i.status === status);

    // Always render render the status group
    // if (groupIssues.length === 0 && dragOverStatus !== status) return null;

    const isDropTarget = dragOverStatus === status;

    return (
      <div
        key={status}
        className={`mb-6 transition-colors rounded-lg ${isDropTarget ? 'bg-[#5E6AD2]/10 ring-2 ring-[#5E6AD2]/30' : ''}`}
        onDragOver={(e) => !isPublicView && handleDragOver(e, status)}
        onDragLeave={() => !isPublicView && setDragOverStatus(null)}
        onDrop={(e) => !isPublicView && handleDrop(e, status)}
      >
        <div className="flex items-center px-4 mb-2 py-2 group">
          <div className="bg-[#2E3036] hover:bg-[#3A3C45] transition-colors rounded px-2 py-0.5 flex items-center space-x-2 cursor-pointer">
            <StatusIcon status={status} className="w-3.5 h-3.5" />
            <span className="text-sm font-semibold text-gray-300">{status}</span>
            <span className="text-xs text-gray-500 font-mono ml-2">{groupIssues.length}</span>
          </div>
          <div className="flex-1 h-[1px] bg-[#2E3036] ml-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          {isDropTarget && (
            <span className="text-xs text-[#5E6AD2] ml-2 animate-pulse">Drop here</span>
          )}
        </div>
        <div className="flex flex-col" onDragEnd={() => !isPublicView && handleDragEnd()}>
          {groupIssues.map(issue => (
            <IssueRow
              key={issue.id}
              issue={issue}
              users={users}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onDragStart={handleDragStart}
              isDragging={draggedIssueId === issue.id}
              issues={issues}
              isPublicView={isPublicView}
            />
          ))}
          {groupIssues.length === 0 && isDropTarget && (
            <div className="py-4 text-center text-sm text-gray-500 border-2 border-dashed border-[#363840] rounded-md mx-4">
              Drop issue here to move to {status}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:overflow-x-visible overflow-x-auto" onDragEnd={() => !isPublicView && handleDragEnd()}>
      {statusOrder.map(status => renderGroup(status))}
    </div>
  );
};
