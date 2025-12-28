import React from 'react';
import { Issue, Project, User, Status } from '../types';
import { IssueList } from './IssueList';
import { Link } from 'react-router-dom';
import { ExternalLink, Lock } from 'lucide-react';

interface PublicProjectViewProps {
    project: Project | null;
    issues: Issue[];
    users: User[];
    onViewIssue: (issue: Issue) => void;
}

export const PublicProjectView: React.FC<PublicProjectViewProps> = ({
    project,
    issues,
    users,
    onViewIssue
}) => {
    if (!project) {
        return (
            <div className="min-h-screen bg-[#1E1F24] flex items-center justify-center">
                <div className="text-center">
                    <Lock className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Project Not Found</h1>
                    <p className="text-gray-400 mb-6">This project doesn't exist or is not publicly shared.</p>
                    <Link
                        to="/"
                        className="text-[#5E6AD2] hover:underline"
                    >
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    const projectIssues = issues.filter(i => i.projectId === project.id);

    return (
        <div className="min-h-screen bg-[#1E1F24] text-[#DEDEDE]">
            {/* Header */}
            <header className="h-16 border-b border-[#363840] flex items-center justify-between px-6 bg-[#25262B]">
                <div className="flex items-center space-x-3">
                    <span className="text-2xl">{project.icon}</span>
                    <div>
                        <h1 className="text-lg font-semibold text-white">{project.name}</h1>
                        <p className="text-xs text-gray-500">Public View • Read Only</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <ExternalLink className="w-4 h-4" />
                    <span>Shared publicly</span>
                </div>
            </header>

            {/* Content */}
            <main className="p-6 max-w-5xl mx-auto">
                {project.description && (
                    <div className="mb-6 p-4 bg-[#25262B] rounded-lg border border-[#363840]">
                        <p className="text-sm text-gray-300">{project.description}</p>
                    </div>
                )}

                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-400">
                        Issues ({issues.filter(i => i.projectId === project.id && !i.parentId).length})
                    </h2>
                </div>

                {projectIssues.length > 0 ? (
                    <div className="bg-[#25262B] rounded-lg border border-[#363840] overflow-hidden">
                        <IssueList
                            issues={projectIssues}
                            users={users}
                            onEdit={onViewIssue}
                            onDelete={() => { }} // No-op for public view
                            onStatusChange={() => { }} // No-op for public view
                            isPublicView={true}
                        />
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <p>No issues in this project yet.</p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 h-10 bg-[#25262B] border-t border-[#363840] flex items-center justify-center">
                <p className="text-xs text-gray-500">
                    Powered by Linear Clone • <Link to="/" className="text-[#5E6AD2] hover:underline">Sign in</Link> to manage projects
                </p>
            </footer>
        </div>
    );
};
