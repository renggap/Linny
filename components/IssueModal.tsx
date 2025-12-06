
import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Calendar, Send, MessageSquare, GitMerge, Lock, Plus, Trash2, ArrowUpRight } from 'lucide-react';
import { Issue, Priority, Status, User, Project, Comment } from '../types';
import { PriorityIcon, StatusIcon } from './Icons';

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (issue: Partial<Issue>) => void;
  users: User[];
  projects: Project[];
  existingIssue?: Issue; // If provided, we are editing
  comments?: Comment[];
  currentUser?: User | null;
  onAddComment?: (issueId: string, content: string) => void;
  issues?: Issue[]; // All issues needed for dependencies/subtasks
  onCreateSubtask?: (parentId: string, title: string) => void;
  onOpenIssue?: (issueId: string) => void;
  defaultProjectId?: string | null;
}

// Better Renderer
const SmartText: React.FC<{ text: string, users: User[] }> = ({ text, users }) => {
    let content = [text];
    
    users.forEach(user => {
        const pattern = `@${user.name}`;
        const newContent: any[] = [];
        
        content.forEach((part) => {
            if (typeof part === 'string') {
                const split = part.split(pattern);
                split.forEach((s, i) => {
                    newContent.push(s);
                    if (i < split.length - 1) {
                        newContent.push(
                            <span key={`${user.id}-${i}`} className="text-[#5E6AD2] bg-[#5E6AD2]/10 px-1 rounded font-medium inline-block mx-0.5">
                                @{user.name}
                            </span>
                        );
                    }
                });
            } else {
                newContent.push(part);
            }
        });
        content = newContent;
    });

    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
};


export const IssueModal: React.FC<IssueModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  users, 
  projects, 
  existingIssue,
  comments = [],
  currentUser,
  onAddComment,
  issues = [],
  onCreateSubtask,
  onOpenIssue,
  defaultProjectId
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.NoPriority);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  
  // Dependency State
  const [blockedBy, setBlockedBy] = useState<string[]>([]);
  const [showDependencySelect, setShowDependencySelect] = useState(false);

  // Subtask State
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  
  // Comment State
  const [newComment, setNewComment] = useState('');
  const issueComments = existingIssue ? comments.filter(c => c.issueId === existingIssue.id) : [];
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mention State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeTextArea, setActiveTextArea] = useState<'desc' | 'comment' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  // Computed filtered users
  const filteredUsers = mentionQuery !== null 
    ? users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];

  // Derived Data
  const parentIssue = existingIssue?.parentId ? issues.find(i => i.id === existingIssue.parentId) : null;
  const subtasks = existingIssue ? issues.filter(i => i.parentId === existingIssue.id) : [];
  const blockingIssues = existingIssue ? issues.filter(i => (existingIssue.blockedBy || []).includes(i.id)) : [];
  // For new blocking selection (exclude self, existing blocks, and parent)
  const availableDependencies = issues.filter(i => 
    i.id !== existingIssue?.id && 
    !(existingIssue?.blockedBy || []).includes(i.id) && 
    i.id !== existingIssue?.parentId
  );


  // Reset or Load state
  useEffect(() => {
    if (isOpen) {
      if (existingIssue) {
        setTitle(existingIssue.title);
        setDescription(existingIssue.description);
        setPriority(existingIssue.priority);
        setAssigneeId(existingIssue.assigneeId || '');
        setProjectId(existingIssue.projectId);
        setStartDate(existingIssue.startDate ? new Date(existingIssue.startDate).toISOString().split('T')[0] : '');
        setDueDate(existingIssue.dueDate ? new Date(existingIssue.dueDate).toISOString().split('T')[0] : '');
        setBlockedBy(existingIssue.blockedBy || []);
      } else {
        setTitle('');
        setDescription('');
        setPriority(Priority.NoPriority);
        setAssigneeId('');
        // Use defaultProjectId if available, otherwise first project
        setProjectId(defaultProjectId || projects[0]?.id || '');
        setStartDate('');
        setDueDate('');
        setBlockedBy([]);
      }
      setNewComment('');
      setMentionQuery(null);
      setNewSubtaskTitle('');
      setShowDependencySelect(false);
    }
  }, [isOpen, existingIssue, projects, defaultProjectId]);

  useEffect(() => {
     if (isOpen && existingIssue) {
         bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
     }
  }, [isOpen, issueComments.length, existingIssue]);

  // Reset selection index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionQuery]);

  const handleSubmit = () => {
    if (!title || !projectId) return; // Project is required
    
    onSave({
      ...(existingIssue ? { id: existingIssue.id } : {}),
      title,
      description,
      priority,
      assigneeId: assigneeId || undefined,
      projectId,
      startDate: startDate ? new Date(startDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: existingIssue ? existingIssue.status : Status.Backlog,
      blockedBy: blockedBy
    });
    onClose();
  };

  const submitComment = () => {
      if (!newComment.trim() || !existingIssue || !onAddComment) return;
      onAddComment(existingIssue.id, newComment);
      setNewComment('');
  };

  const handleCreateSubtaskLocal = () => {
      if (!newSubtaskTitle.trim() || !existingIssue || !onCreateSubtask) return;
      onCreateSubtask(existingIssue.id, newSubtaskTitle);
      setNewSubtaskTitle('');
  };

  const addDependency = (dependencyId: string) => {
      if (!dependencyId) return;
      const newBlockedBy = [...blockedBy, dependencyId];
      setBlockedBy(newBlockedBy);
      // Auto-save dependency change for smoother UX, or wait for save?
      // Let's just update local state, user must hit Save/Update.
      setShowDependencySelect(false);
  };
  
  const removeDependency = (depId: string) => {
      setBlockedBy(prev => prev.filter(id => id !== depId));
  }


  // --- MENTION LOGIC ---
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>, field: 'desc' | 'comment') => {
      const val = e.target.value;
      if (field === 'desc') setDescription(val);
      else setNewComment(val);

      const cursor = e.target.selectionStart;
      const textBeforeCursor = val.slice(0, cursor);
      const lastAt = textBeforeCursor.lastIndexOf('@');
      
      if (lastAt !== -1) {
          const query = textBeforeCursor.slice(lastAt + 1);
          // Check if query contains newline or is too long (likely not a mention)
          if (!query.includes('\n') && query.length < 20) {
              setMentionQuery(query);
              setActiveTextArea(field);
              return;
          }
      }
      setMentionQuery(null);
  };

  const insertMention = (userName: string) => {
      const isDesc = activeTextArea === 'desc';
      const text = isDesc ? description : newComment;
      const inputRef = isDesc ? descRef.current : commentRef.current;
      
      if (!inputRef) return;

      const cursor = inputRef.selectionStart;
      const textBeforeCursor = text.slice(0, cursor);
      const lastAt = textBeforeCursor.lastIndexOf('@');
      const textAfterCursor = text.slice(cursor);
      
      const newText = textBeforeCursor.slice(0, lastAt) + `@${userName} ` + textAfterCursor;
      
      if (isDesc) setDescription(newText);
      else setNewComment(newText);
      
      setMentionQuery(null);
      setActiveTextArea(null);
      
      // Focus back
      setTimeout(() => {
          inputRef.focus();
          const newCursorPos = lastAt + userName.length + 2; // @ + name + space
          inputRef.setSelectionRange(newCursorPos, newCursorPos);
      }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'desc' | 'comment') => {
      // Handle Mention Navigation
      if (mentionQuery !== null && filteredUsers.length > 0) {
          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
              return;
          }
          if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
              return;
          }
          if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              insertMention(filteredUsers[selectedIndex].name);
              return;
          }
          if (e.key === 'Escape') {
              e.preventDefault();
              setMentionQuery(null);
              return;
          }
      }

      // Handle Comment Submit
      if (field === 'comment') {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitComment();
          }
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#25262B] w-[900px] h-[90vh] rounded-xl shadow-2xl border border-[#363840] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#363840] bg-[#25262B] shrink-0">
          <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
             {parentIssue && onOpenIssue && (
                 <button 
                    onClick={() => onOpenIssue(parentIssue.id)}
                    className="flex items-center hover:text-white transition-colors mr-2"
                 >
                     <GitMerge className="w-3.5 h-3.5 mr-1" />
                     <span className="font-mono">{parentIssue.identifier}</span>
                     <ArrowUpRight className="w-3 h-3 ml-1" />
                 </button>
             )}
             <span className="bg-[#363840] px-1.5 py-0.5 rounded text-gray-300">{existingIssue ? existingIssue.identifier : 'New Issue'}</span>
          </div>
          <div className="flex items-center space-x-2">
             <button className="p-1 hover:bg-[#363840] rounded text-gray-500 hover:text-gray-300">
                <Maximize2 className="w-4 h-4" />
             </button>
             <button onClick={onClose} className="p-1 hover:bg-[#363840] rounded text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
             </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
                {/* Main Issue Fields */}
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="Issue title" 
                        className="w-full bg-transparent text-xl font-semibold text-white placeholder-gray-600 focus:outline-none"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        autoFocus
                    />

                    <div className="relative group">
                        <textarea 
                            ref={descRef}
                            placeholder="Add description... (Type @ to mention)" 
                            className="w-full h-48 bg-transparent text-sm text-gray-300 placeholder-gray-600 focus:outline-none resize-none leading-relaxed pb-16"
                            value={description}
                            onChange={(e) => handleInput(e, 'desc')}
                            onKeyDown={(e) => handleKeyDown(e, 'desc')}
                        />
                        
                        {/* Meta Controls (Moved from Footer) */}
                        <div className="absolute bottom-2 left-0 flex items-center space-x-2 overflow-x-auto no-scrollbar max-w-[70%]">
                            
                            {/* Project Selector */}
                            <div className="relative group">
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                >
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id} className="bg-[#25262B] text-white">
                                            {p.icon} {p.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#363840] cursor-pointer text-xs text-gray-400 border border-transparent hover:border-[#464852] transition-all whitespace-nowrap">
                                    <span>{projectId ? projects.find(p => p.id === projectId)?.icon : '📂'}</span>
                                    <span>{projectId ? projects.find(p => p.id === projectId)?.name : 'Select Project'}</span>
                                </div>
                            </div>

                            {/* Priority Selector */}
                            <div className="relative group">
                                <select 
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as Priority)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                >
                                    {Object.values(Priority).map(p => (
                                    <option key={p} value={p} className="bg-[#25262B] text-white">{p}</option>
                                    ))}
                                </select>
                                <div className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#363840] cursor-pointer text-xs text-gray-400 border border-transparent hover:border-[#464852] transition-all whitespace-nowrap">
                                    <PriorityIcon priority={priority} className="w-3.5 h-3.5" />
                                    <span>{priority}</span>
                                </div>
                            </div>

                            {/* Assignee Selector */}
                            <div className="relative group">
                                <select
                                    value={assigneeId}
                                    onChange={(e) => setAssigneeId(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                >
                                    <option value="" className="bg-[#25262B] text-white">Unassigned</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id} className="bg-[#25262B] text-white">{u.name}</option>
                                    ))}
                                </select>
                                <div className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#363840] cursor-pointer text-xs text-gray-400 border border-transparent hover:border-[#464852] transition-all whitespace-nowrap">
                                    <span className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[8px]">
                                        {assigneeId ? users.find(u => u.id === assigneeId)?.name[0] : '?'}
                                    </span>
                                    <span>{assigneeId ? users.find(u => u.id === assigneeId)?.name : 'Assignee'}</span>
                                </div>
                            </div>
                                
                            {/* Start Date */}
                            <div className="relative group flex items-center">
                                <Calendar className="w-3.5 h-3.5 text-gray-500 absolute left-2 pointer-events-none" />
                                <span className="text-[9px] text-gray-500 absolute left-6 pointer-events-none">Start</span>
                                <input 
                                    type="date" 
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="pl-14 pr-2 py-1 bg-transparent text-xs text-gray-400 hover:bg-[#363840] rounded border border-transparent focus:outline-none transition-colors cursor-pointer w-[140px]"
                                />
                            </div>

                            {/* Due Date */}
                            <div className="relative group flex items-center">
                                <Calendar className="w-3.5 h-3.5 text-gray-500 absolute left-2 pointer-events-none" />
                                <span className="text-[9px] text-gray-500 absolute left-6 pointer-events-none">Due</span>
                                <input 
                                    type="date" 
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="pl-12 pr-2 py-1 bg-transparent text-xs text-gray-400 hover:bg-[#363840] rounded border border-transparent focus:outline-none transition-colors cursor-pointer w-[130px]"
                                />
                            </div>
                        </div>
                        
                        {/* Save Button */}
                        <button 
                            onClick={handleSubmit}
                            disabled={!title || !projectId}
                            className={`absolute bottom-2 right-0 px-3 py-1.5 bg-[#5E6AD2] hover:bg-[#4b55aa] text-white text-xs font-semibold rounded shadow-lg shadow-purple-900/20 transition-all whitespace-nowrap ${(!title || !projectId) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {existingIssue ? 'Update Issue' : 'Save Issue'}
                        </button>
                    </div>
                </div>

                {/* --- Subtasks Section --- */}
                {existingIssue && (
                    <div className="pt-6 border-t border-[#363840]">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                            <GitMerge className="w-3.5 h-3.5 mr-2" />
                            Subtasks
                        </h3>
                        <div className="space-y-1 mb-3">
                            {subtasks.map(subtask => {
                                const subAssignee = users.find(u => u.id === subtask.assigneeId);
                                return (
                                    <div 
                                        key={subtask.id} 
                                        className="flex items-center px-3 py-2 bg-[#1E1F24] border border-[#363840] rounded hover:border-[#52545E] cursor-pointer group"
                                        onClick={() => onOpenIssue && onOpenIssue(subtask.id)}
                                    >
                                        <StatusIcon status={subtask.status} className="w-3.5 h-3.5 mr-3" />
                                        <span className="text-xs text-gray-500 font-mono mr-3">{subtask.identifier}</span>
                                        <span className="text-sm text-gray-300 flex-1 truncate">{subtask.title}</span>
                                        {subAssignee && (
                                            <img src={subAssignee.avatarUrl} className="w-4 h-4 rounded-full ml-2" />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex items-center space-x-2">
                             <Plus className="w-4 h-4 text-gray-500" />
                             <input 
                                type="text"
                                placeholder="Add subtask..."
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateSubtaskLocal()}
                                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                             />
                             <button 
                                onClick={handleCreateSubtaskLocal}
                                disabled={!newSubtaskTitle.trim()}
                                className="text-xs text-[#5E6AD2] hover:text-white disabled:opacity-50"
                             >
                                 Create
                             </button>
                        </div>
                    </div>
                )}

                {/* --- Dependencies Section --- */}
                {existingIssue && (
                    <div className="pt-6 border-t border-[#363840]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                                <Lock className="w-3.5 h-3.5 mr-2" />
                                Blocking
                            </h3>
                            <button 
                                onClick={() => setShowDependencySelect(!showDependencySelect)}
                                className="text-xs text-gray-500 hover:text-white flex items-center"
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add Dependency
                            </button>
                        </div>

                        {showDependencySelect && (
                            <div className="mb-3">
                                <select 
                                    className="w-full bg-[#1E1F24] border border-[#363840] text-sm text-white rounded p-2 focus:outline-none focus:border-[#5E6AD2]"
                                    onChange={(e) => addDependency(e.target.value)}
                                    value=""
                                >
                                    <option value="">Select issue blocking this one...</option>
                                    {availableDependencies.map(i => (
                                        <option key={i.id} value={i.id} className="bg-[#25262B] text-white">
                                            {i.identifier} {i.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-1">
                            {blockingIssues.map(issue => (
                                <div 
                                    key={issue.id} 
                                    className="flex items-center justify-between px-3 py-2 bg-[#1E1F24] border border-[#363840] rounded hover:border-[#52545E] cursor-pointer group"
                                    onClick={() => onOpenIssue && onOpenIssue(issue.id)}
                                >
                                    <div className="flex items-center flex-1 min-w-0">
                                        <Lock className="w-3 h-3 text-red-400 mr-3" />
                                        <span className="text-xs text-gray-500 font-mono mr-3">{issue.identifier}</span>
                                        <span className="text-sm text-gray-300 truncate">{issue.title}</span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeDependency(issue.id); }}
                                        className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {blockingIssues.length === 0 && !showDependencySelect && (
                                <div className="text-xs text-gray-600 italic">No dependencies.</div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Comments Section */}
                {existingIssue && (
                    <div className="pt-6 border-t border-[#363840]">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Activity</h3>
                        
                        <div className="space-y-6">
                            {issueComments.map(comment => {
                                const user = users.find(u => u.id === comment.userId);
                                return (
                                    <div key={comment.id} className="flex space-x-3 group">
                                        <div className="flex-shrink-0">
                                            {user ? (
                                                <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gray-700" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-baseline space-x-2 mb-1">
                                                <span className="text-xs font-medium text-gray-200">{user?.name || 'Unknown User'}</span>
                                                <span className="text-[10px] text-gray-500">{new Date(comment.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                            </div>
                                            <div className="text-sm text-gray-300">
                                                <SmartText text={comment.content} users={users} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {issueComments.length === 0 && (
                                <div className="text-center py-6 text-gray-600 text-sm">
                                    No comments yet. Start the conversation!
                                </div>
                            )}
                            <div ref={bottomRef}></div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Mention Suggestion Popover */}
            {mentionQuery !== null && filteredUsers.length > 0 && (
                <div 
                    className="absolute z-50 w-64 bg-[#25262B] border border-[#363840] rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ 
                        bottom: activeTextArea === 'comment' ? '90px' : 'auto', 
                        top: activeTextArea === 'desc' ? '200px' : 'auto',
                        left: '40px' 
                    }}
                >
                    <div className="px-3 py-1.5 bg-[#202126] text-[10px] font-semibold text-gray-500 uppercase">Suggested Users</div>
                    {filteredUsers.map((user, idx) => (
                        <div 
                            key={user.id} 
                            onClick={() => insertMention(user.name)}
                            className={`flex items-center px-3 py-2 cursor-pointer transition-colors ${idx === selectedIndex ? 'bg-[#5E6AD2] text-white' : 'hover:bg-[#5E6AD2] hover:text-white text-gray-300'}`}
                        >
                            <img src={user.avatarUrl} className="w-5 h-5 rounded-full mr-2" />
                            <span className="text-sm">{user.name}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* New Comment Input */}
            {existingIssue && onAddComment && (
                <div className="p-4 bg-[#25262B] border-t border-[#363840] shrink-0">
                    <div className="flex space-x-3">
                        <div className="flex-shrink-0 pt-1">
                            {currentUser ? (
                                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-6 h-6 rounded-full" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-700" />
                            )}
                        </div>
                        <div className="flex-1 relative">
                            <textarea
                                ref={commentRef}
                                value={newComment}
                                onChange={(e) => handleInput(e, 'comment')}
                                onKeyDown={(e) => handleKeyDown(e, 'comment')}
                                placeholder="Leave a comment... (Enter to send)"
                                className="w-full bg-[#1E1F24] border border-[#363840] rounded-md p-3 text-sm text-white focus:outline-none focus:border-[#5E6AD2] resize-none h-20 transition-colors"
                            />
                            <div className="absolute bottom-2 right-2 flex items-center space-x-2">
                                <button 
                                    onClick={submitComment}
                                    disabled={!newComment.trim()}
                                    className={`p-1.5 rounded-md transition-all ${newComment.trim() ? 'bg-[#5E6AD2] text-white' : 'bg-[#363840] text-gray-500 cursor-not-allowed'}`}
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};
