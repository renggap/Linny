import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../types';
import { ChevronDown, Check } from 'lucide-react';

interface UserSelectProps {
    users: User[];
    selectedUserIds: string[];
    onSelect: (userId: string) => void;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
}

export const UserSelect: React.FC<UserSelectProps> = ({
    users,
    selectedUserIds,
    onSelect,
    placeholder = "Assign User",
    className,
    readOnly = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const selectedUsers = users.filter(u => (selectedUserIds || []).includes(u.id));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Calculate position
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDropdownStyle({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    minWidth: '200px' // Ensure it's not too narrow
                });
            }
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Update position on scroll/resize if open (optional but good for robustness)
    useEffect(() => {
        if (!isOpen) return;
        const updatePosition = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDropdownStyle({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    minWidth: '200px'
                });
            }
        };
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true); // Capture scroll

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                className={`flex items-center space-x-2 cursor-pointer hover:bg-[#2E3036] p-1.5 -ml-1.5 rounded-md transition-colors w-full ${readOnly ? 'pointer-events-none' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedUsers.length > 0 ? (
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="flex -space-x-1.5">
                            {selectedUsers.slice(0, 3).map((user, i) => (
                                <div
                                    key={user.id}
                                    className="w-5 h-5 rounded-full border border-[#25262B] ring-1 ring-[#363840] bg-[#5E6AD2] flex items-center justify-center text-[8px] font-semibold text-white"
                                    style={{ zIndex: selectedUsers.length - i }}
                                    title={user.name}
                                >
                                    {user.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.name}
                                            className="w-full h-full rounded-full"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                    )}
                                </div>
                            ))}
                            {selectedUsers.length > 3 && (
                                <div className="w-5 h-5 rounded-full bg-[#363840] border border-[#25262B] flex items-center justify-center text-[8px] text-gray-300">
                                    +{selectedUsers.length - 3}
                                </div>
                            )}
                        </div>
                        <span className="text-xs font-medium text-gray-200 truncate">
                            {selectedUsers.length === 1 ? selectedUsers[0].name : `${selectedUsers.length} Assignees`}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs text-gray-400 flex-1">{placeholder}</span>
                )}
                {!readOnly && <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </div>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="absolute z-[9999] bg-[#25262B] border border-[#363840] rounded-md shadow-xl py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
                    style={{ ...dropdownStyle, position: 'absolute' }}
                >
                    {users.map(user => (
                        <div
                            key={user.id}
                            className="flex items-center px-3 py-1.5 cursor-pointer hover:bg-[#5E6AD2] hover:text-white group transition-colors text-xs text-gray-200"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(user.id);
                                // For multi-select, we might not want to close immediately, 
                                // but for now let's keep it behaving like a toggle or single for compatibility if needed.
                                // Actually, in IssueModal we do toggle logic in its handler.
                            }}
                        >
                            <img src={user.avatarUrl} alt={user.name} className="w-4 h-4 rounded-full mr-2" />
                            <span className={`flex-1 ${selectedUserIds.includes(user.id) ? 'font-medium' : ''}`}>
                                {user.name}
                            </span>
                            {selectedUserIds.includes(user.id) && (
                                <Check className="w-3.5 h-3.5" />
                            )}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};
