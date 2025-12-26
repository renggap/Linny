
import React, { useState } from 'react';
import { Issue, Status, User } from '../types';
import { PriorityIcon, StatusIcon, Trash2, Edit2, GripVertical } from './Icons';

interface IssueListProps {
  issues: Issue[];
  users: User[];
  onEdit: (issue: Issue) => void;
  onDelete: (issueId: string) => void;
  onStatusChange: (issueId: string, status: Status) => void;
}

const IssueRow: React.FC<{
  issue: Issue;
  users: User[];
  onEdit: (i: Issue) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onDragStart: (e: React.DragEvent, issueId: string) => void;
  isDragging: boolean;
}> = ({ issue, users, onEdit, onDelete, onStatusChange, onDragStart, isDragging }) => {

  const assignee = users.find(u => u.id === issue.assigneeId);

  const handleAdvanceStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      className={`group flex items-center py-2.5 px-4 hover:bg-[#2E3036] border-b border-[#363840] cursor-pointer transition-colors bg-[#1E1F24] ${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, issue.id)}
    >
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

      <div className="min-w-[60px] text-xs font-mono text-gray-500 mr-4">
        {issue.identifier}
      </div>

      <div className="flex-1 text-sm font-medium text-[#E5E7EB] group-hover:text-white truncate pr-4" onClick={() => onEdit(issue)}>
        <span className={issue.status === Status.Done || issue.status === Status.Canceled ? "line-through text-gray-500" : ""}>{issue.title}</span>
      </div>

      {/* Action Buttons (Visible on Hover) */}
      <div className="hidden group-hover:flex items-center space-x-2 mr-4">
        <button onClick={(e) => { e.stopPropagation(); onEdit(issue); }} className="text-gray-500 hover:text-white">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(issue.id); }} className="text-gray-500 hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Date / Meta */}
      <div className="text-xs text-gray-600 w-24 text-right">
        {issue.dueDate ? (
          <span className="text-orange-400">{new Date(issue.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        ) : (
          <span>{new Date(issue.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="w-8 ml-4 flex justify-end">
        {assignee ? (
          <img src={assignee.avatarUrl} alt={assignee.name} className="w-4 h-4 rounded-full border border-[#2E3036]" />
        ) : (
          <div className="w-4 h-4 rounded-full border border-gray-700 border-dashed" />
        )}
      </div>

    </div>
  );
};

export const IssueList: React.FC<IssueListProps> = ({ issues, users, onEdit, onDelete, onStatusChange }) => {
  const statusOrder = [Status.Backlog, Status.Todo, Status.InProgress, Status.InReview, Status.Done, Status.Canceled];
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null);

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    setDraggedIssueId(issueId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedIssueId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    if (draggedIssueId) {
      onStatusChange(draggedIssueId, status);
    }
    setDraggedIssueId(null);
    setDragOverStatus(null);
  };

  const renderGroup = (status: Status) => {
    const groupIssues = issues.filter(i => i.status === status);
    if (groupIssues.length === 0 && dragOverStatus !== status) return null;

    const isDropTarget = dragOverStatus === status;

    return (
      <div
        key={status}
        className={`mb-6 transition-colors rounded-lg ${isDropTarget ? 'bg-[#5E6AD2]/10 ring-2 ring-[#5E6AD2]/30' : ''}`}
        onDragOver={(e) => handleDragOver(e, status)}
        onDragLeave={() => setDragOverStatus(null)}
        onDrop={(e) => handleDrop(e, status)}
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
        <div className="flex flex-col" onDragEnd={handleDragEnd}>
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
    <div className="flex-1 overflow-y-auto pb-20" onDragEnd={handleDragEnd}>
      {statusOrder.map(status => renderGroup(status))}
    </div>
  );
};
