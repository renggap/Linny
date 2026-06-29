import React from 'react';
import { cn } from '../lib/utils';

// Consistent color palette for avatars
const AVATAR_COLORS = [
  'bg-accent', // Purple
  'bg-[#E54D2E]', // Red
  'bg-[#2E9E4E]', // Green
  'bg-[#E5A02E]', // Orange
  'bg-[#2E8FE5]', // Blue
  'bg-[#9B2EE5]', // Violet
  'bg-[#E52E8A]', // Pink
  'bg-[#2EE5B8]', // Teal
  'bg-[#E5B82E]', // Yellow
  'bg-[#2EE5E5]', // Cyan
];

/**
 * Generate a consistent color from a string using hash
 */
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Get initials from a name (always 2 letters)
 */
function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    // For single name, take first 2 characters
    const namePart = parts[0].toUpperCase();
    return namePart.substring(0, 2);
  }
  // For multiple names, take first letter of first and last name
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface UserAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showRing?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4 text-[8px]',
  md: 'w-6 h-6 text-[10px]',
  lg: 'w-8 h-8 text-[12px]',
  xl: 'w-12 h-12 text-[16px]',
};

/**
 * Consistent UserAvatar component that displays 2-letter initials
 * with a consistent background color based on the name.
 *
 * All avatars use initials only for a unified, consistent appearance.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  size = 'md',
  className,
  showRing = false,
}) => {
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white shrink-0',
        sizeClasses[size],
        bgColor,
        showRing && 'ring-1 ring-[#363840]/50',
        className
      )}
    >
      <span>{initials}</span>
    </div>
  );
};
