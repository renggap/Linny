import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { UserAvatar } from './UserAvatar';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  users: User[];
  placeholder?: string;
  className?: string;
  onSubmit?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  onBlur?: () => void;
  autoSaveOnBlur?: boolean;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  users,
  placeholder = "Add a comment...",
  className = "",
  onSubmit,
  disabled = false,
  readOnly = false,
  onBlur,
  autoSaveOnBlur = false,
}) => {
  const [isMentioning, setIsMentioning] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  // Show all users when @ is typed, filter as they type
  const filteredUsers = isMentioning
    ? mentionQuery
      ? users.filter(user =>
          user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          user.name.replace(/\s+/g, '_').toLowerCase().includes(mentionQuery.toLowerCase())
        )
      : users  // Show all users when @ is first typed
    : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Check if user is typing @ to trigger mention (only if not read-only)
    if (!readOnly) {
      checkForMentionTrigger(newValue, e.target.selectionStart, e.target);
    }
  };

  const checkForMentionTrigger = (text: string, cursorPosition: number, textarea: HTMLTextAreaElement) => {
    if (cursorPosition === 0) return;

    // Check if the character before cursor is @
    const charBeforeCursor = text[cursorPosition - 1];
    if (charBeforeCursor === '@') {
      // Immediately show all users when @ is typed
      setMentionQuery("");
      setIsMentioning(true);
      setSelectedMentionIndex(0);

      // Calculate position for mention dropdown
      calculateMentionPosition(textarea, cursorPosition);
    } else if (isMentioning) {
      // Update mention query as user types
      const textBeforeCursor = text.substring(0, cursorPosition);
      const atIndex = textBeforeCursor.lastIndexOf('@');

      if (atIndex !== -1) {
        const query = textBeforeCursor.substring(atIndex + 1);
        // Close dropdown if they type space or special character
        if (/[\s@]/.test(query)) {
          setIsMentioning(false);
        } else {
          setMentionQuery(query);
          calculateMentionPosition(textarea, cursorPosition);
        }
      } else {
        setIsMentioning(false);
      }
    }
  };

  const calculateMentionPosition = (textarea: HTMLTextAreaElement, cursorPosition: number) => {
    // Calculate approximate line height
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseInt(computedStyle.lineHeight);
    const paddingTop = parseInt(computedStyle.paddingTop);

    // Calculate which line the cursor is on
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length;

    // Position dropdown below the current line
    setMentionPosition({
      top: paddingTop + (currentLine * lineHeight) + 35, // Position below cursor line
      left: 10 // Always show at left edge of textarea
    });
  };

  const handleMentionSelect = (user: User) => {
    if (!inputRef.current) return;

    const cursorPosition = inputRef.current.selectionStart;
    if (cursorPosition === null) return;

    const textBeforeCursor = value.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      // Replace @query with @username
      const newText = (
        textBeforeCursor.substring(0, atIndex) +
        `@${user.name.replace(/\s+/g, '_')} ` +
        value.substring(cursorPosition)
      );

      onChange(newText);

      // Move cursor to end of mention + space
      const newCursorPosition = atIndex + user.name.replace(/\s+/g, '_').length + 2;

      // Use setTimeout to ensure the textarea updates first
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = newCursorPosition;
          inputRef.current.selectionEnd = newCursorPosition;
          inputRef.current.focus();
        }
      }, 10);
    }

    setIsMentioning(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isMentioning) return;

    // Handle keyboard navigation in mention dropdown
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex(prev =>
        filteredUsers.length > 0 ? (prev + 1) % filteredUsers.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex(prev =>
        filteredUsers.length > 0 ? (prev - 1 + filteredUsers.length) % filteredUsers.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredUsers.length > 0) {
        handleMentionSelect(filteredUsers[selectedMentionIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsMentioning(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (filteredUsers.length > 0) {
        handleMentionSelect(filteredUsers[selectedMentionIndex]);
      }
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (
      mentionListRef.current &&
      !mentionListRef.current.contains(e.target as Node) &&
      inputRef.current &&
      !inputRef.current.contains(e.target as Node)
    ) {
      setIsMentioning(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Scroll selected item into view
    if (mentionListRef.current && isMentioning) {
      const selectedItems = mentionListRef.current.querySelectorAll('.bg-\\[\\#5E6AD2\\]');
      const selectedItem = selectedItems[selectedMentionIndex];
      if (selectedItem) {
        selectedItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [selectedMentionIndex, isMentioning]);

  const handleSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMentioning) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          handleKeyDown(e);
          handleSubmit(e);
        }}
        onBlur={() => {
          if (autoSaveOnBlur) {
            onBlur?.();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full min-h-[100px] max-h-[200px] resize-none bg-[#14151A] border border-[#25262B] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] focus:outline-none focus:ring-1 focus:ring-[#5E6AD2] transition-all ${disabled || readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      />

      {/* Mention Dropdown */}
      {isMentioning && filteredUsers.length > 0 && (
        <div
          ref={mentionListRef}
          className="absolute z-50 bg-[#25262B] border border-[#363840] rounded-md shadow-2xl overflow-hidden max-h-60 w-64"
          style={{
            top: `${mentionPosition.top}px`,
            left: `${mentionPosition.left}px`
          }}
        >
          {filteredUsers.map((user, index) => (
            <div
              key={user.id}
              className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[#363840] transition-colors ${index === selectedMentionIndex ? 'bg-[#5E6AD2]' : ''}`}
              onClick={() => handleMentionSelect(user)}
            >
              <UserAvatar
                name={user.name}
                size="sm"
                className="mr-2"
              />
              <span className={`text-sm ${index === selectedMentionIndex ? 'text-white font-medium' : 'text-[#E8E8E8]'}`}>
                {user.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};