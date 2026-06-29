import React, { useState, useRef, useEffect } from 'react';
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
                    minWidth: '160px'
                });
            }
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Update position on scroll/resize
    useEffect(() => {
        if (!isOpen) return;
        const updatePosition = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDropdownStyle({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    minWidth: '160px'
                });
            }
        };
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);


    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                className="flex items-center space-x-2 cursor-pointer hover:bg-[#2E3036] p-1.5 -ml-1.5 rounded-md transition-colors w-full border border-transparent focus:border-accent"
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
                    className="absolute z-[9999] bg-[#25262B] border border-[#363840] rounded-md shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
                    style={{ ...dropdownStyle, position: 'absolute' }}
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
