import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
    value?: Date | string;
    onChange: (date: Date) => void;
    placeholder?: string;
    className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, placeholder = "Select date", className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    // Parse initial date
    const initialDate = value ? new Date(value) : new Date();
    const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
    const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

    const containerRef = useRef<HTMLDivElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);

    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + 4,
                left: rect.left
            });
        }
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node) &&
                calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            updateCoords();
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            const handleScroll = () => updateCoords();
            window.addEventListener('resize', handleScroll);
            window.addEventListener('scroll', handleScroll, true);
            return () => {
                window.removeEventListener('resize', handleScroll);
                window.removeEventListener('scroll', handleScroll, true);
            };
        }
    }, [isOpen]);

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleSelectDate = (day: number) => {
        const newDate = new Date(currentYear, currentMonth, day);
        onChange(newDate);
        setIsOpen(false);
    };

    const renderCalendar = () => {
        const days = [];
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        // Padding for first week
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`pad-${i}`} className="w-8 h-8"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const isSelected = value && new Date(value).toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();

            days.push(
                <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDate(day)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md text-xs transition-colors
                        ${isSelected ? 'bg-[#5E6AD2] text-white font-bold' : 'hover:bg-[#363840] text-gray-300'}
                        ${isToday && !isSelected ? 'text-[#5E6AD2] font-semibold' : ''}
                    `}
                >
                    {day}
                </button>
            );
        }

        // Render using portal to avoid overflow issues
        return ReactDOM.createPortal(
            <div
                ref={calendarRef}
                className="fixed z-[9999] bg-[#25262B] border border-[#363840] rounded-lg shadow-xl p-3 w-64 animate-in fade-in zoom-in-95 duration-100"
                style={{ top: coords.top, left: coords.left }}
            >
                <div className="flex items-center justify-between mb-3 px-1">
                    <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-[#363840] rounded text-gray-400 hover:text-white">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold text-gray-200">
                        {monthNames[currentMonth]} {currentYear}
                    </span>
                    <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-[#363840] rounded text-gray-400 hover:text-white">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={i} className="text-[10px] text-gray-500 font-medium w-8">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days}
                </div>
            </div>,
            document.body
        );
    };

    // Formatting for display
    let displayValue = placeholder;
    if (value) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
            displayValue = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (d.getFullYear() !== new Date().getFullYear()) {
                displayValue += `, ${d.getFullYear()}`;
            }
        }
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#363840] cursor-pointer text-xs text-gray-400 border border-transparent hover:border-[#464852] transition-all whitespace-nowrap min-w-[100px]"
            >
                <Calendar className="w-3.5 h-3.5" />
                <span className={value ? 'text-gray-200' : 'text-gray-500'}>{displayValue}</span>
            </div>
            {isOpen && renderCalendar()}
        </div>
    );
};
