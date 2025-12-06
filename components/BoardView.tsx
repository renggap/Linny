
import React, { useState } from 'react';
import { Issue, Status, User, Priority } from '../types';
import { StatusIcon, PriorityIcon, Plus, Trash2, Calendar } from './Icons';

interface BoardViewProps {
  issues: Issue[];
  users: User[];
  onEdit: (issue: Issue) => void;
  onDelete: (issueId: string) => void;
  onStatusChange: (issueId: string, status: Status) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({ issues, users, onEdit, onDelete, onStatusChange }) => {
  // Ensure strict order of columns
  const statuses = [Status.Backlog, Status.Todo, Status.InProgress, Status.InReview, Status.Done, Status.Canceled];
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    setDraggedIssueId(issueId);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image or default
  };

  const handleDragOver = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
        setDragOverColumn(status);
    }
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedIssueId) {
      onStatusChange(draggedIssueId, status);
      setDraggedIssueId(null);
    }
  };

  const handleDragLeave = () => {
      // Optional: clear drag over if leaving container
  }

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden h-full">
      <div className="flex h-full p-6 space-x-5 min-w-max">
        {statuses.map(status => {
          const columnIssues = issues.filter(i => i.status === status);
          
          return (
            <div 
                key={status} 
                className={`flex-shrink-0 w-[300px] flex flex-col rounded-lg transition-colors ${dragOverColumn === status ? 'bg-[#2E3036]/50' : ''}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDrop={(e) => handleDrop(e, status)}
                onDragLeave={() => setDragOverColumn(null)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center space-x-2">
                  <StatusIcon status={status} className="w-3.5 h-3.5" />
                  <span className="text-sm font-semibold text-gray-300">{status}</span>
                  <span className="text-xs text-gray-500 font-mono">{columnIssues.length}</span>
                </div>
                <div className="flex space-x-1">
                   <Plus className="w-4 h-4 text-gray-600 hover:text-gray-400 cursor-pointer" />
                </div>
              </div>

              {/* Column Body */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pb-10 scrollbar-hide">
                {columnIssues.map(issue => {
                   const assignee = users.find(u => u.id === issue.assigneeId);
                   
                   return (
                    <div 
                        key={issue.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, issue.id)}
                        onClick={() => onEdit(issue)}
                        className="group relative bg-[#25262B] border border-[#363840] hover:border-[#52545E] rounded-md p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-gray-500">{issue.identifier}</span>
                            <div className="flex items-center space-x-2">
                               {issue.priority !== Priority.NoPriority && <PriorityIcon priority={issue.priority} />}
                            </div>
                        </div>
                        
                        <h4 className="text-sm font-medium text-[#E5E7EB] mb-3 line-clamp-2 leading-snug group-hover:text-white">
                            {issue.title}
                        </h4>

                        <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center space-x-2">
                                {issue.dueDate && (
                                    <div className="flex items-center text-[10px] text-gray-500 bg-[#1E1F24] px-1.5 py-0.5 rounded border border-[#363840]">
                                        <Calendar className="w-2.5 h-2.5 mr-1" />
                                        {new Date(issue.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                                    </div>
                                )}
                            </div>
                            
                            {assignee ? (
                                <img src={assignee.avatarUrl} alt={assignee.name} className="w-5 h-5 rounded-full border border-[#2E3036]" />
                            ) : (
                                <div className="w-5 h-5 rounded-full border border-gray-700 border-dashed flex items-center justify-center">
                                    <span className="text-[8px] text-gray-600">?</span>
                                </div>
                            )}
                        </div>

                        {/* Hover Actions */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(issue.id); }}
                            className="absolute top-2 right-2 p-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-[#25262B]/80 rounded"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                   );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
