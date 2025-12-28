
import React from 'react';
import {
  CheckCircle2,
  Circle,
  HelpCircle,
  Layout,
  List,
  MoreHorizontal,
  Plus,
  Search,
  SignalHigh,
  SignalLow,
  SignalMedium,
  X,
  Inbox,
  Layers,
  Users,
  Bell,
  Sidebar,
  Sparkles,
  LogOut,
  Calendar,
  Trash2,
  Edit2,
  ChevronDown,
  Briefcase,
  Shield,
  Settings,
  UserCog,
  CircleDashed,
  CircleDot,
  Link,
  Copy,
  Send,
  MessageSquare,
  GanttChart,
  GitMerge,
  Lock,
  Link2,
  ArrowUpRight,
  GripVertical,
  AlertCircle,
  CornerDownRight
} from 'lucide-react';
import { Priority, Status } from '../types';

export const StatusIcon: React.FC<{ status: Status; className?: string }> = ({ status, className = "w-4 h-4" }) => {
  switch (status) {
    case Status.Backlog: return <CircleDashed className={`${className} text-gray-500`} />;
    case Status.Todo: return <Circle className={`${className} text-gray-400`} />;
    case Status.InProgress: return <div className={`${className} rounded-full border-2 border-[#F2C94C] border-r-transparent border-b-transparent rotate-45`} />;
    case Status.InReview: return <CircleDot className={`${className} text-[#F2C94C]`} />;
    case Status.Done: return <CheckCircle2 className={`${className} text-[#5E6AD2]`} />;
    case Status.Canceled: return <X className={`${className} text-gray-500`} />;
    default: return <Circle className={className} />;
  }
};

export const PriorityIcon: React.FC<{ priority: Priority; className?: string }> = ({ priority, className = "w-4 h-4" }) => {
  switch (priority) {
    case Priority.Urgent: return <div className={`${className} bg-red-500/10 rounded flex items-center justify-center`}><AlertCircle className="w-3.5 h-3.5 text-red-500" /></div>;
    case Priority.High: return <SignalHigh className={`${className} text-orange-500`} />;
    case Priority.Medium: return <SignalMedium className={`${className} text-yellow-500`} />;
    case Priority.Low: return <SignalLow className={`${className} text-gray-500`} />;
    default: return <MoreHorizontal className={`${className} text-gray-600`} />;
  }
};

export {
  Plus,
  Search,
  X,
  Inbox,
  Layers,
  Users,
  Bell,
  Sidebar,
  Sparkles,
  Layout,
  List,
  LogOut,
  Calendar,
  Trash2,
  Edit2,
  ChevronDown,
  Briefcase,
  Shield,
  Settings,
  UserCog,
  CircleDashed,
  CircleDot,
  Link,
  Copy,
  Send,
  MessageSquare,
  GanttChart,
  GitMerge,
  Lock,
  Link2,
  ArrowUpRight,
  GripVertical,
  CornerDownRight
};
