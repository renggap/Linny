import React from 'react';
import { cn } from '../lib/utils';

function hashName(name: string): number {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h) + name.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function identiconGrid(hash: number): boolean[][] {
  const grid: boolean[][] = [];
  for (let row = 0; row < 5; row++) {
    grid[row] = [];
    for (let col = 0; col < 5; col++) {
      const sourceCol = col < 3 ? col : 4 - col;
      const bit = (hash >> (row * 3 + sourceCol)) & 1;
      grid[row][col] = bit === 1;
    }
  }
  return grid;
}

function identiconColor(hash: number): string {
  const hue = hash % 360;
  const sat = 55 + (hash % 20);
  const light = 50 + ((hash >> 8) % 15);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showRing?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className,
  showRing = false,
}) => {
  const safeName = name || 'unknown';
  const hash = hashName(safeName);
  const grid = identiconGrid(hash);
  const color = identiconColor(hash);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={safeName}
        className={cn(
          'rounded-full object-cover shrink-0',
          sizeClasses[size],
          showRing && 'ring-1 ring-[#363840]/50',
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden shrink-0 bg-[#1A1C23]',
        sizeClasses[size],
        showRing && 'ring-1 ring-[#363840]/50',
        className
      )}
      title={safeName}
    >
      <svg viewBox="0 0 5 5" className="w-full h-full block" aria-label={safeName}>
        {grid.map((row, r) =>
          row.map((on, c) =>
            on ? (
              <rect
                key={`${r}-${c}`}
                x={c + 0.1}
                y={r + 0.1}
                width="0.8"
                height="0.8"
                fill={color}
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};
