
import React, { useState } from 'react';
import { Project, ResourceLink } from '../types';
import { Plus, Link2, X, Trash2, ExternalLink } from 'lucide-react';

interface ProjectOverviewHeaderProps {
    project: Project;
    onUpdate: (project: Project) => void;
}

export const ProjectOverviewHeader: React.FC<ProjectOverviewHeaderProps> = ({ project, onUpdate }) => {
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [descValue, setDescValue] = useState(project.description || "");

    const [newLinkTitle, setNewLinkTitle] = useState("");
    const [newLinkUrl, setNewLinkUrl] = useState("");
    const [isAddingLink, setIsAddingLink] = useState(false);

    const handleDescBlur = () => {
        setIsEditingDesc(false);
        if (descValue !== project.description) {
            onUpdate({ ...project, description: descValue });
        }
    };

    const handleAddLink = () => {
        if (!newLinkTitle || !newLinkUrl) return;
        const newLink: ResourceLink = {
            id: Math.random().toString(36).substr(2, 9),
            title: newLinkTitle,
            url: newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`
        };

        const links = project.links || [];
        onUpdate({ ...project, links: [...links, newLink] });

        setNewLinkTitle("");
        setNewLinkUrl("");
        setIsAddingLink(false);
    };

    const handleDeleteLink = (linkId: string) => {
        const links = project.links || [];
        onUpdate({ ...project, links: links.filter(l => l.id !== linkId) });
    };

    return (
        <div className="px-8 pb-6 border-b border-[#363840] mb-4">

            {/* Description */}
            <div className="mb-6">
                <h2 className="text-lg font-medium text-white mb-2">{project.name}</h2>
                {isEditingDesc ? (
                    <textarea
                        className="w-full bg-[#1E1F24] border border-[#363840] rounded-md p-2 text-sm text-gray-300 focus:ring-1 focus:ring-[#5E6AD2] outline-none min-h-[80px]"
                        value={descValue}
                        onChange={(e) => setDescValue(e.target.value)}
                        onBlur={handleDescBlur}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                handleDescBlur();
                            }
                        }}
                        autoFocus
                        placeholder="Add a description..."
                    />
                ) : (
                    <div
                        className="text-sm text-gray-400 cursor-text hover:text-gray-300 min-h-[24px]"
                        onClick={() => setIsEditingDesc(true)}
                    >
                        {project.description || <span className="italic opacity-50">Add project description...</span>}
                    </div>
                )}
            </div>

            {/* Resource Links */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase">Resources</h3>
                    <div className="flex items-center space-x-2">
                        {project.isPublic && project.publicSlug && (
                            <a
                                href={`/public/${project.publicSlug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#5E6AD2] hover:text-[#4b55aa] flex items-center border border-[#5E6AD2]/30 px-2 py-1 rounded"
                            >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Public Link
                            </a>
                        )}
                        {!isAddingLink && (
                            <button
                                onClick={() => setIsAddingLink(true)}
                                className="text-xs text-[#5E6AD2] hover:text-[#4b55aa] flex items-center"
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add Link
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    {/* Existing Links */}
                    {(project.links || []).map(link => (
                        <div key={link.id} className="flex items-center justify-between group py-1">
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-300 hover:text-[#5E6AD2] hover:underline">
                                <Link2 className="w-4 h-4 mr-2 text-gray-500" />
                                {link.title}
                                <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-50" />
                            </a>
                            <button
                                onClick={() => handleDeleteLink(link.id)}
                                className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}

                    {/* Add Link Form */}
                    {isAddingLink && (
                        <div className="flex items-center space-x-2 bg-[#2E3036] p-2 rounded-md animate-in fade-in slide-in-from-top-1">
                            <Link2 className="w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Title"
                                className="bg-transparent border-none text-xs text-white focus:ring-0 w-24 px-1"
                                value={newLinkTitle}
                                onChange={(e) => setNewLinkTitle(e.target.value)}
                                autoFocus
                            />
                            <div className="h-4 w-[1px] bg-gray-600"></div>
                            <input
                                type="text"
                                placeholder="URL"
                                className="bg-transparent border-none text-xs text-white focus:ring-0 flex-1 px-1"
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                            />
                            <div className="flex items-center space-x-1">
                                <button onClick={handleAddLink} className="p-1 hover:bg-[#3E4049] rounded text-green-500"><Plus className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setIsAddingLink(false)} className="p-1 hover:bg-[#3E4049] rounded text-gray-400"><X className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
