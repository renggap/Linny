import React, { useState, useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { api } from '../services/api';
import { Project, Issue, User } from '../types';
import { PublicProjectView } from './PublicProjectView';
import { IssueModal } from './IssueModal';

export const PublicViewContainer: React.FC = () => {
    const location = useLocation();
    const [publicProject, setPublicProject] = useState<Project | null>(null);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingIssue, setEditingIssue] = useState<Issue | undefined>(undefined);
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

    useEffect(() => {
        const fetchPublicData = async () => {
            const slug = location.pathname.replace('/public/', '').split('/')[0];
            try {
                const data = await api.projects.getPublicBySlug(slug);
                if (data) {
                    setPublicProject(data.project);
                    setIssues(data.issues);
                    setUsers(data.users);
                }
            } catch (err) {
                console.error('Failed to fetch public project:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPublicData();
    }, [location.pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#1E1F24] text-[#DEDEDE] font-sans flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-[#5E6AD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1E1F24] text-[#DEDEDE] font-sans">
            <PublicProjectView
                project={publicProject}
                issues={issues}
                users={users}
                onViewIssue={async (issue: Issue) => {
                    setEditingIssue(issue);
                    setIsIssueModalOpen(true);
                }}
            />
            <IssueModal
                isOpen={isIssueModalOpen}
                onClose={() => setIsIssueModalOpen(false)}
                onSave={() => { }}
                users={users}
                projects={[]}
                existingIssue={editingIssue}
                currentUser={null}
                issues={issues}
                onCreateSubtask={() => { }}
                onOpenIssue={(issueId: string) => {
                    const issue = issues.find((i: Issue) => i.id === issueId);
                    if (issue) {
                        setEditingIssue(issue);
                    }
                }}
                defaultProjectId={null}
                isPublicView={true}
            />
        </div>
    );
};
