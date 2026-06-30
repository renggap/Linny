import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Priority } from '../types';
import { PriorityIcon } from './Icons';
import { ChevronDown, Check } from 'lucide-react';

interface PrioritySelectProps {
    value: Priority;
    onChange: (priority: Priority) => void;
    className?: string;
}

export const PrioritySelect: React.FC<PrioritySelectProps> = ({
    value,
    onChange,
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const priorities = [
        Priority.NoPriority,
        Priority.Urgent,
        Priority.High,
        Priority.Medium,
        Priority.Low,
    ];

    // Compute dropdown position synchronously before paint to avoid flicker.
    // Uses position:fixed with viewport-relative coords (no scrollY/scrollX math).
    // Flips above the trigger if there's no room below.
    const updatePosition = React.useCallback(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const DROPDOWN_HEIGHT_ESTIMATE = 200;
        const MARGIN = 4;
        const viewportH = window.innerHeight;
        const spaceBelow = viewportH - rect.bottom;
        const openAbove = spaceBelow < DROPDOWN_HEIGHT_ESTIMATE && rect.top > DROPDOWN_HEIGHT_ESTIMATE;
        setDropdownStyle({
            position: 'fixed',
            top: openAbove ? Math.max(MARGIN, rect.top - DROPDOWN_HEIGHT_ESTIMATE - MARGIN) : rect.bottom + MARGIN,
            left: rect.left,
            width: rect.width,
            minWidth: 160
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
                className="flex items-center space-x-2 cursor-pointer hover:bg-[#2E3036] p-1.5 -ml-1.5 transition-colors w-full border border-transparent focus:border-accent"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center flex-1">
                    <PriorityIcon priority={value} className="mr-2" />
                    <span className="text-xs font-medium text-gray-200">{value}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed z-[9999] bg-[#25262B] border border-[#363840] shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
                    style={dropdownStyle}
                >
                    {priorities.map(priority => (
                        <div
                            key={priority}
                            className="flex items-center px-3 py-1.5 cursor-pointer hover:bg-accent hover:text-white group transition-colors text-xs text-gray-200"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(priority);
                                setIsOpen(false);
                            }}
                        >
                            <PriorityIcon priority={priority} className="mr-2" />
                            <span className={`flex-1 ${value === priority ? 'font-medium' : ''}`}>
                                {priority}
                            </span>
                            {value === priority && (
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
