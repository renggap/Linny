import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, UserRole } from '../types';
import { UserAvatar } from './UserAvatar';
import { ChevronDown, Check } from 'lucide-react';

interface UserSelectProps {
    users: User[];
    selectedUserIds: string[];
    onSelect: (userId: string) => void;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
    /**
     * Optional pre-filtered users to use instead of internal filtering.
     * When provided, this takes precedence over the default guest filtering.
     * Use this to pass users filtered by a centralized hook like useWorkspaceMembers.
     */
    filteredUsers?: User[];
}

export const UserSelect: React.FC<UserSelectProps> = ({
    users,
    selectedUserIds,
    onSelect,
    placeholder = "Assign User",
    className,
    readOnly = false,
    filteredUsers,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const selectedUsers = users.filter(u => (selectedUserIds || []).includes(u.id));

    // Use filteredUsers if provided, otherwise filter out Guests from the available users
    // Guests cannot be assigned to issues
    const assignableUsers = filteredUsers || users.filter(u => u.role !== UserRole.Guest);

    // Compute dropdown position synchronously before paint to avoid flicker.
    // Uses position:fixed with viewport-relative coords (no scrollY/scrollX math).
    // Flips above the trigger if there's no room below.
    const updatePosition = React.useCallback(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const DROPDOWN_HEIGHT_ESTIMATE = 240;
        const MARGIN = 4;
        const viewportH = window.innerHeight;
        const spaceBelow = viewportH - rect.bottom;
        const openAbove = spaceBelow < DROPDOWN_HEIGHT_ESTIMATE && rect.top > DROPDOWN_HEIGHT_ESTIMATE;
        setDropdownStyle({
            position: 'fixed',
            top: openAbove ? Math.max(MARGIN, rect.top - DROPDOWN_HEIGHT_ESTIMATE - MARGIN) : rect.bottom + MARGIN,
            left: rect.left,
            width: rect.width,
            minWidth: 200
        });
    }, []);

    useLayoutEffect(() => {
        if (!isOpen) return;
        updatePosition();
    }, [isOpen, updatePosition]);

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
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, updatePosition]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                className={`flex items-center space-x-2 cursor-pointer hover:bg-[#2E3036] p-1.5 -ml-1.5 transition-colors w-full ${readOnly ? 'pointer-events-none' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedUsers.length > 0 ? (
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="flex -space-x-1.5">
                            {selectedUsers.slice(0, 3).map((user, i) => (
                                <div
                                    key={user.id}
                                    className="relative"
                                    style={{ zIndex: selectedUsers.length - i, width: '20px', height: '20px' }}
                                    title={user.name}
                                >
                                    <UserAvatar
                                        name={user.name}
                                        size="sm"
                                        className="border-2 border-[#25262B] rounded-full"
                                    />
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
                    className="fixed z-[9999] bg-[#25262B] border border-[#363840] shadow-xl py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
                    style={dropdownStyle}
                >
                    {assignableUsers.map(user => (
                        <div
                            key={user.id}
                            className="flex items-center px-3 py-1.5 cursor-pointer hover:bg-accent hover:text-white group transition-colors text-xs text-gray-200"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(user.id);
                            }}
                        >
                            <UserAvatar name={user.name} size="sm" className="mr-2" />
                            <span className={`flex-1 ${(selectedUserIds || []).includes(user.id) ? 'font-medium' : ''}`}>
                                {user.name}
                            </span>
                            {(selectedUserIds || []).includes(user.id) && (
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
