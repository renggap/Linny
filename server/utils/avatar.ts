/**
 * Avatar Utility Functions
 * Consistent avatar generation across the application
 */

const COLORS = [
  '5E6AD2', // Purple
  'E54D2E', // Red
  '2E9E4E', // Green
  'E5A02E', // Orange
  '2E8FE5', // Blue
  '9B2EE5', // Violet
  'E52E8A', // Pink
  '2EE5B8', // Teal
  'E5B82E', // Yellow
  '2EE5E5', // Cyan
];

/**
 * Generate a consistent color from a string
 * Uses a simple hash function to map the same string to the same color
 */
function getColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * Generate avatar URL from a name
 * Uses ui-avatars.com with consistent color based on name
 */
export function generateAvatarUrl(name: string, size: number = 128): string {
  const color = getColorFromString(name);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=${size}`;
}

/**
 * Get avatar URL for a user, with fallback to initials if avatarUrl is not set
 * Normalizes old-format avatars with background=random to use consistent colors
 */
export function getUserAvatarUrl(user: { name: string; avatar_url?: string }): string {
  // If no avatar_url set, generate consistent one
  if (!user.avatar_url) {
    return generateAvatarUrl(user.name);
  }

  // Normalize old-format avatars with background=random
  // Check if it's a ui-avatars.com URL with background=random
  if (user.avatar_url.includes('ui-avatars.com') && user.avatar_url.includes('background=random')) {
    return generateAvatarUrl(user.name);
  }

  // Return custom avatar URL (e.g., from pravatar.cc or uploaded images)
  return user.avatar_url;
}
