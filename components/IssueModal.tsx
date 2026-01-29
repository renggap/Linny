
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, GitMerge, Plus, ArrowUpRight, Clock, Hash, Layout, Eye, Trash2, Calendar, User as UserIcon, Activity, UserCircle } from 'lucide-react';
import { Issue, Priority, Status, User, Project, Comment, PartialIssue, UserRole } from '../types';
import { StatusIcon, PriorityIcon } from './Icons';
import { DatePicker } from './DatePicker';
import { UserSelect } from './UserSelect';
import { PrioritySelect } from './PrioritySelect';
import { MentionInput } from './MentionInput';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { renderMentionsWithBadges } from '../services/mentionUtils';

function formatDateToInput(date: Date | string | undefined): string {
    if (!date) return '';
    if (typeof date === 'string') return date.startsWith('1970') ? '' : date;
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface IssueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (issue: Partial<Issue>) => void;
    users: User[];
    projects: Project[];
    existingIssue?: Issue | PartialIssue;
    comments?: Comment[];
    currentUser?: User | null;
    onAddComment?: (issueId: string, content: string) => void;
    issues?: Issue[];
    onCreateSubtask?: (parentId: string, title: string) => void;
    onOpenIssue?: (issueId: string) => void;
    defaultProjectId?: string | null;
    isPublicView?: boolean;
}

function isFullIssue(issue: Issue | PartialIssue | undefined): issue is Issue {
    return !!issue && 'id' in issue;
}

export const IssueModal: React.FC<IssueModalProps> = ({
    isOpen,
    onClose,
    onSave,
    users,
    projects,
    existingIssue,
    comments = [],
    onAddComment,
    issues = [],
    onCreateSubtask,
    onOpenIssue,
    defaultProjectId,
    isPublicView = false,
    currentUser
}) => {
    // Guest users are read-only, same as public view
    const canEdit = !isPublicView && currentUser?.role !== UserRole.Guest;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.NoPriority);
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [projectId, setProjectId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>('');
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [newComment, setNewComment] = useState('');
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [activeTextArea, setActiveTextArea] = useState<'desc' | 'comment' | null>(null);

    const descRef = useRef<HTMLTextAreaElement>(null);
    const commentRef = useRef<HTMLTextAreaElement>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Track if we've already initialized state for this issue or new issue form
    const initializedIssueIdRef = useRef<string | null>(null);
    const initializedNewIssueRef = useRef(false);

    const filteredUsers = mentionQuery !== null
        ? users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
        : [];

    const hasExistingIssueId = isFullIssue(existingIssue);
    const subtasks = hasExistingIssueId ? issues.filter(i => i.parentId === (existingIssue as Issue).id) : [];

    useEffect(() => {
        if (!isOpen) {
            // Reset initialization when modal closes
            initializedIssueIdRef.current = null;
            initializedNewIssueRef.current = false;
            return;
        }

        if (existingIssue) {
            const issueId = (existingIssue as Issue).id;
            // Only initialize if we haven't initialized this issue yet
            if (initializedIssueIdRef.current !== issueId) {
                const issueData = existingIssue as Partial<Issue>;
                setTitle(issueData.title || '');
                setDescription(issueData.description || '');
                setPriority(issueData.priority || Priority.NoPriority);
                setAssigneeIds(issueData.assigneeIds || []);
                setProjectId(issueData.projectId || (defaultProjectId || projects[0]?.id || ''));
                setStartDate(formatDateToInput(issueData.startDate));
                setDueDate(formatDateToInput(issueData.dueDate));
                initializedIssueIdRef.current = issueId;
                initializedNewIssueRef.current = false;
            }
        } else if (!initializedNewIssueRef.current) {
            // New issue - reset state only ONCE when first opening
            setTitle('');
            setDescription('');
            setPriority(Priority.NoPriority);
            setAssigneeIds([]);
            setProjectId(defaultProjectId || projects[0]?.id || '');
            setStartDate('');
            setDueDate('');
            initializedIssueIdRef.current = null;
            initializedNewIssueRef.current = true;
        }
    }, [isOpen, existingIssue, projects, defaultProjectId]);

    const saveField = async (field: keyof Issue, value: any) => {
        if (!existingIssue || !('id' in existingIssue)) return;
        setSaveStatus('saving');
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        try {
            const result = await onSave({ id: (existingIssue as Issue).id, [field]: value });

            // Update local state immediately to reflect changes
            if (field === 'priority') {
                setPriority(value);
            }
            if (field === 'assigneeIds') {
                setAssigneeIds(value);
            }
            if (field === 'startDate') {
                setStartDate(formatDateToInput(value));
            }
            if (field === 'dueDate') {
                setDueDate(formatDateToInput(value));
            }

            setSaveStatus('saved');
            saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
            console.error('[IssueModal saveField] Save failed:', error);
            setSaveStatus('error');
            saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 5000);
        }
    };

    const handleTitleBlur = () => {
        if (existingIssue && isFullIssue(existingIssue) && title.trim() && title !== (existingIssue as Issue).title) {
            saveField('title', title);
        }
    };

    const handleDescriptionSave = () => {
        if (existingIssue && isFullIssue(existingIssue) && description !== (existingIssue as Issue).description) {
            saveField('description', description);
        }
    };

    const handleCreateIssue = async () => {
        if (!title || !projectId) return;
        setIsCreating(true);
        try {
            await onSave({
                title, description, priority, assigneeIds, projectId,
                startDate: startDate ? new Date(startDate) : undefined,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                status: existingIssue?.status ?? Status.Backlog
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsCreating(false);
        }
    };

    const submitComment = () => {
        if (!newComment.trim() || !existingIssue || !('id' in existingIssue) || !onAddComment) return;
        onAddComment((existingIssue as Issue).id, newComment);
        setNewComment('');
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>, field: 'desc' | 'comment') => {
        const val = e.target.value;
        if (field === 'desc') setDescription(val);
        else setNewComment(val);
        const cursor = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursor);
        const lastAt = textBeforeCursor.lastIndexOf('@');
        if (lastAt !== -1) {
            const query = textBeforeCursor.slice(lastAt + 1);
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
        setTimeout(() => {
            inputRef.focus();
            const newCursorPos = lastAt + userName.length + 2;
            inputRef.setSelectionRange(newCursorPos, newCursorPos);
        }, 10);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-[#070809]/80 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    className="bg-[#0F1014] w-full max-w-[1000px] h-[85vh] rounded-2xl shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)] border border-[#22242A] flex flex-col overflow-hidden relative z-10"
                >
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-6 h-14 border-b border-[#1A1C23] bg-[#14151A]/30 shrink-0">
                        <div className="flex items-center space-x-4 text-[11px] font-bold uppercase tracking-widest text-[#5E6068]">
                            <div className="flex items-center space-x-2">
                                <span className="p-1 rounded bg-[#1A1C23] border border-[#2C2D35]">
                                    <Hash className="w-2.5 h-2.5" />
                                </span>
                                <span className="font-mono text-[#8A8F98]">{hasExistingIssueId ? (existingIssue as Issue).identifier : 'Unassigned'}</span>
                            </div>
                            <span className="text-[#2C2D35]">/</span>
                            <div className="flex items-center space-x-2">
                                <Layout className="w-3 h-3" />
                                <span className="text-[#C0C4CC]">
                                    {projectId && projects.find(p => p.id === projectId)?.name}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            {saveStatus !== 'idle' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={cn(
                                        "flex items-center space-x-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border",
                                        saveStatus === 'saving' ? "bg-[#5E6AD2]/5 border-[#5E6AD2]/20 text-[#5E6AD2]" : "bg-green-500/5 border-green-500/20 text-green-500"
                                    )}
                                >
                                    <div className={cn("w-1 h-1 rounded-full", saveStatus === 'saving' ? "bg-[#5E6AD2] animate-pulse" : "bg-green-500")} />
                                    <span>{saveStatus === 'saving' ? 'Syncing' : 'Synced'}</span>
                                </motion.div>
                            )}
                            <button onClick={onClose} className="p-1.5 hover:bg-[#1C1D24] rounded-lg text-[#5E6068] hover:text-[#E8E8E8] transition-all">
                                <X className="w-4.5 h-4.5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Main Editor */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-[#0F1014]">
                            <div className="flex-1 overflow-y-auto no-scrollbar py-10 px-12 space-y-10">

                                <div className="space-y-6">
                                    <input
                                        type="text"
                                        placeholder="Issue title"
                                        className="w-full bg-transparent text-3xl font-bold text-[#E8E8E8] placeholder-[#2C2D35] focus:outline-none tracking-tight leading-tight disabled:opacity-50 disabled:cursor-not-allowed"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        onBlur={handleTitleBlur}
                                        autoFocus={!hasExistingIssueId}
                                        disabled={!canEdit}
                                        readOnly={!canEdit}
                                    />
                                    <textarea
                                        ref={descRef}
                                        placeholder="Describe the objective..."
                                        className="w-full h-auto min-h-[160px] bg-transparent border-none p-0 text-[15px] text-[#C0C4CC] placeholder-[#2C2D35] focus:outline-none resize-none leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
                                        value={description}
                                        onChange={(e) => handleInput(e, 'desc')}
                                        onBlur={handleDescriptionSave}
                                        disabled={!canEdit}
                                        readOnly={!canEdit}
                                    />
                                </div>

                                {/* Mention Dropdown Overlay Logic */}
                                <AnimatePresence>
                                    {canEdit && mentionQuery !== null && filteredUsers.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="fixed z-50 bg-[#14151A] border border-[#22242A] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-2 w-64 overflow-hidden"
                                        >
                                            {filteredUsers.map((u) => (
                                                <div
                                                    key={u.id}
                                                    onClick={() => insertMention(u.name)}
                                                    className="px-4 py-2.5 text-xs text-[#C0C4CC] cursor-pointer hover:bg-[#5E6AD2] hover:text-white transition-colors flex items-center space-x-3"
                                                >
                                                    <img src={u.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                                                    <span className="font-semibold">{u.name}</span>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!(existingIssue as Issue | PartialIssue)?.parentId && (
                                    <div className="space-y-12 pt-10 border-t border-[#1A1C23]">
                                        {/* Subtasks Section - Only shown for parent issues, not subtasks */}
                                        <section className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-bold text-[#5E6068] uppercase tracking-widest flex items-center">
                                                    <GitMerge className="w-3.5 h-3.5 mr-2" /> Sub-objectives
                                                </h4>
                                                <span className="text-[9px] font-mono text-[#3A3C46] tracking-tighter bg-[#14151A] px-2 py-0.5 rounded border border-[#22242A]">
                                                    {subtasks.length} ENTRIES
                                                </span>
                                            </div>
                                            <div className="grid gap-2">
                                                {subtasks.map(s => (
                                                    <motion.div
                                                        key={s.id}
                                                        whileHover={{ x: 4 }}
                                                        onClick={() => onOpenIssue?.(s.id)}
                                                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#14151A]/30 border border-[#1A1C23] hover:border-[#2C2D35] transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center space-x-4">
                                                            <div className="p-1 rounded bg-[#0F1014] border border-[#1A1C23]">
                                                                <StatusIcon status={s.status} className="w-3 h-3" />
                                                            </div>
                                                            <span className="text-[10px] text-[#5E6068] font-mono tracking-widest uppercase">{s.identifier}</span>
                                                            <span className="text-[13px] text-[#C0C4CC] font-medium group-hover:text-white transition-colors">{s.title}</span>
                                                        </div>
                                                        <ArrowUpRight className="w-3.5 h-3.5 text-[#2C2D35] group-hover:text-[#5E6AD2] transition-colors" />
                                                    </motion.div>
                                                ))}
                                                {hasExistingIssueId ? (
                                                    // Existing issue: show the input
                                                    canEdit && (
                                                        <div className="flex items-center space-x-3 px-4 py-2 border border-dashed border-[#1A1C23] rounded-xl hover:border-[#2C2D35] transition-colors">
                                                            <Plus className="w-4 h-4 text-[#3A3C46]" />
                                                            <input
                                                                type="text"
                                                                placeholder="Add sub-objective..."
                                                                className="flex-1 bg-transparent text-[13px] text-[#8A8F98] placeholder-[#3A3C46] focus:outline-none"
                                                                value={newSubtaskTitle}
                                                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                                                onKeyDown={async (e) => {
                                                                    if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                                                                        await onCreateSubtask?.((existingIssue as Issue).id, newSubtaskTitle);
                                                                        setNewSubtaskTitle('');
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    )
                                                ) : (
                                                    // New issue: show a message
                                                    <div className="px-4 py-3 border border-dashed border-[#1A1C23] rounded-xl">
                                                        <p className="text-[11px] text-[#3A3C46] italic text-center">
                                                            Sub-objectives can be added after creating this issue
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>

                                        {/* Activity/Comments Section */}
                                        <section className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-[#5E6068] uppercase tracking-widest flex items-center">
                                                <MessageSquare className="w-3.5 h-3.5 mr-2" /> Communications
                                            </h4>
                                            <div className="space-y-8 pl-1 relative">
                                                <div className="absolute left-[3px] top-2 bottom-2 w-px bg-[#1A1C23]" />
                                                {comments.map((c, idx) => {
                                                    const u = users.find(user => user.id === c.userId);
                                                    return (
                                                        <motion.div
                                                            key={c.id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="relative pl-8"
                                                        >
                                                            <div className="absolute left-[-2px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#14151A] border-2 border-[#5E6AD2] shadow-[0_0_8px_rgba(94,106,210,0.4)]" />
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[11px] font-bold text-[#E8E8E8]">{u?.name || 'Unknown User'}</span>
                                                                <span className="text-[9px] font-bold text-[#5E6068] uppercase tracking-tighter">{new Date(c.createdAt).toLocaleString()}</span>
                                                            </div>
                                                            <div className="bg-[#14151A]/40 border border-[#1A1C23] rounded-xl p-3.5">
                                                                <p className="text-[13px] text-[#C0C4CC] leading-relaxed">
                                                                    {renderMentionsWithBadges(c.content, users)}
                                                                </p>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>

                            {/* Comment Input Sticky */}
                            {hasExistingIssueId && canEdit && (
                                <div className="p-6 bg-[#0F1014] border-t border-[#1A1C23] shrink-0">
                                    <div className="flex items-end gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#1A1C23] border border-[#2C2D35] flex items-center justify-center shrink-0">
                                            <UserCircle className="w-4 h-4 text-[#5E6068]" />
                                        </div>
                                        <div className="flex-1">
                                            <MentionInput
                                                value={newComment}
                                                onChange={setNewComment}
                                                users={users}
                                                placeholder="Add a comment..."
                                                onSubmit={submitComment}
                                                autoSaveOnBlur={false}
                                                className="min-h-[60px]"
                                            />
                                        </div>
                                        <button
                                            onClick={submitComment}
                                            disabled={!newComment.trim()}
                                            className="w-10 h-10 flex items-center justify-center bg-[#5E6AD2] hover:bg-[#4b55aa] disabled:opacity-20 disabled:grayscale text-white rounded-xl transition-all shadow-lg shadow-[#5E6AD2]/20 group"
                                        >
                                            <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Metadata Panel */}
                        <div className="w-72 bg-[#14151A]/40 border-l border-[#1A1C23] py-10 px-8 space-y-10 shrink-0 overflow-y-auto no-scrollbar">

                            {!hasExistingIssueId && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.2em] flex items-center">
                                        <Layout className="w-3 h-3 mr-2" /> Destination
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={projectId}
                                            onChange={(e) => setProjectId(e.target.value)}
                                            className="w-full bg-[#0F1014] border border-[#22242A] rounded-xl px-4 py-2.5 text-xs text-[#C0C4CC] font-medium focus:outline-none hover:border-[#2C2D35] transition-all appearance-none cursor-pointer"
                                        >
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#3A3C46]">
                                            <Plus className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className={`space-y-4 ${!canEdit ? 'pointer-events-none opacity-60' : ''}`}>
                                <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.2em] flex items-center">
                                    <PriorityIcon priority={priority} className="w-3 h-3 mr-2" /> Criticality
                                </label>
                                <div className="bg-[#0F1014] rounded-xl border border-[#22242A] p-0.5">
                                    <PrioritySelect
                                        value={priority}
                                        onChange={(p) => hasExistingIssueId ? saveField('priority', p) : setPriority(p)}
                                    />
                                </div>
                            </div>

                            <div className={`space-y-4 ${!canEdit ? 'pointer-events-none opacity-60' : ''}`}>
                                <label className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.2em] flex items-center">
                                    <UserIcon className="w-3 h-3 mr-2" /> Personnel
                                </label>
                                <div className="bg-[#0F1014] rounded-xl border border-[#22242A] p-0.5">
                                    <UserSelect
                                        users={users}
                                        selectedUserIds={assigneeIds}
                                        onSelect={(id) => {
                                            const next = assigneeIds.includes(id) ? assigneeIds.filter(x => x !== id) : [...assigneeIds, id];
                                            setAssigneeIds(next);
                                            if (hasExistingIssueId) saveField('assigneeIds', next);
                                        }}
                                        readOnly={!canEdit}
                                    />
                                </div>
                            </div>

                            <div className={`space-y-4 ${!canEdit ? 'pointer-events-none opacity-60' : ''}`}>
                                <h5 className="text-[10px] font-bold text-[#5E6068] uppercase tracking-[0.2em] flex items-center justify-between">
                                    <span>Schedule</span>
                                    <Clock className="w-3 h-3" />
                                </h5>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-black uppercase text-[#3A3C46] ml-1">Activation</span>
                                        <DatePicker
                                            value={startDate}
                                            onChange={(d) => {
                                                // Use local date components to avoid timezone issues
                                                const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                                setStartDate(s);
                                                if (hasExistingIssueId) saveField('startDate', s);
                                            }}
                                            placeholder="Assign start"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-black uppercase text-[#3A3C46] ml-1">Deadline</span>
                                        <DatePicker
                                            value={dueDate}
                                            onChange={(d) => {
                                                // Use local date components to avoid timezone issues
                                                const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                                setDueDate(s);
                                                if (hasExistingIssueId) saveField('dueDate', s);
                                            }}
                                            placeholder="Assign target"
                                        />
                                    </div>
                                </div>
                            </div>

                            {!hasExistingIssueId && (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCreateIssue}
                                    disabled={isCreating || !title || !projectId}
                                    className="w-full bg-[#5E6AD2] hover:bg-[#4b55aa] text-white py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center space-x-2 disabled:opacity-20 shadow-xl shadow-[#5E6AD2]/20"
                                >
                                    {isCreating ? <Activity className="w-4 h-4 animate-spin" /> : <span>Execute Creation</span>}
                                </motion.button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
