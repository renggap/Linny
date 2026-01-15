
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

    const parseDateString = (dateValue: Date | string | undefined): Date => {
        if (!dateValue) return new Date();
        if (dateValue instanceof Date) return dateValue;
        const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        return new Date(dateValue);
    };

    const initialDate = parseDateString(value);
    const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
    const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

    const containerRef = useRef<HTMLDivElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);

    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({ top: rect.bottom + 8, left: rect.left });
        }
    };

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
        onChange(new Date(currentYear, currentMonth, day));
        setIsOpen(false);
    };

    const renderCalendar = () => {
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const days = [];
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`pad-${i}`} className="w-8 h-8"></div>);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const parsedValue = parseDateString(value);
            const isSelected = value && parsedValue.toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();

            days.push(
                <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDate(day)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-[11px] font-bold transition-colors
                        ${isSelected ? 'bg-[#5E6AD2] text-white' : 'hover:bg-[#363840] text-gray-400 hover:text-white'}
                        ${isToday && !isSelected ? 'text-[#5E6AD2]' : ''}
                    `}
                >
                    {day}
                </button>
            );
        }

        return ReactDOM.createPortal(
            <div
                ref={calendarRef}
                className="fixed z-[9999] bg-[#1A1B1F] border border-[#363840]/60 rounded-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] p-4 w-64 animate-in fade-in zoom-in-95 duration-100"
                style={{ top: coords.top, left: coords.left }}
            >
                <div className="flex items-center justify-between mb-4">
                    <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-[#25262B] rounded text-gray-600 hover:text-white transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {monthNames[currentMonth]} {currentYear}
                    </span>
                    <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-[#25262B] rounded text-gray-600 hover:text-white transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={i} className="text-[9px] text-gray-700 font-bold w-8">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days}
                </div>
            </div>,
            document.body
        );
    };

    let displayValue = placeholder;
    if (value) {
        const parsedDate = parseDateString(value);
        if (!isNaN(parsedDate.getTime())) {
            displayValue = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (parsedDate.getFullYear() !== new Date().getFullYear()) displayValue += `, ${parsedDate.getFullYear()}`;
        }
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#25262B]/30 border border-[#363840]/30 hover:border-[#5E6AD2]/30 cursor-pointer text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-all min-w-[120px]"
            >
                <Calendar className="w-3.5 h-3.5" />
                <span className={value ? 'text-gray-300' : 'text-gray-600'}>{displayValue}</span>
            </div>
            {isOpen && renderCalendar()}
        </div>
    );
};
