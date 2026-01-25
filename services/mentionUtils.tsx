import { User } from '../types';

/**
 * Extracts mentioned usernames from content
 * Returns array of mentioned usernames
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@([A-Za-z0-9_]+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return Array.from(new Set(mentions)); // Remove duplicates
}

/**
 * Converts a username to a display name (handles spaces in names)
 */
export function usernameToDisplay(username: string): string {
  // Replace underscores with spaces for display
  return username.replace(/_/g, ' ').trim();
}

/**
 * Renders content with mention badges
 * @param content - The text content with @mentions
 * @param users - Available users to match mentions against
 * @param onMentionClick - Optional callback when a mention badge is clicked
 * @returns React elements with styled mention badges
 */
export function renderMentionsWithBadges(
  content: string,
  users: User[],
  onMentionClick?: (userId: string) => void
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Find each mention in the content
  const mentionRegex = /@([A-Za-z0-9_]+)/g;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionText = match[1].trim();
    const mentionStart = match.index;
    const mentionEnd = mentionStart + match[0].length;

    // Add text before the mention
    if (mentionStart > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex, mentionStart)}</span>);
    }

    // Find the user for this mention
    const displayUsername = usernameToDisplay(mentionText);
    const user = users.find(u =>
      u.name.toLowerCase() === displayUsername.toLowerCase() ||
      u.name.replace(/\s+/g, '_').toLowerCase() === mentionText.toLowerCase()
    );

    if (user) {
      // Render styled mention badge
      parts.push(
        <span
          key={`mention-${mentionStart}`}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${onMentionClick
              ? 'bg-purple-600 text-white hover:bg-purple-500'
              : 'bg-purple-600 text-white'
            }`}
          onClick={() => onMentionClick?.(user.id)}
          title={`Tagged: ${user.name}`}
        >
          @{user.name}
        </span>
      );
    } else {
      // User not found - still render as badge but with different styling
      parts.push(
        <span
          key={`mention-${mentionStart}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-gray-600 text-gray-200"
        >
          @{displayUsername}
        </span>
      );
    }

    lastIndex = mentionEnd;
  }

  // Add remaining text after the last mention
  if (lastIndex < content.length) {
    parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key="pure-text">{content}</span>];
}

/**
 * Parses content and returns list of mentioned user IDs
 * @param content - The text content with @mentions
 * @param users - Available users to match mentions against
 * @returns Array of user IDs who are mentioned
 */
export function getMentionedUserIds(content: string, users: User[]): string[] {
  const mentions = extractMentions(content);
  const userIds: string[] = [];

  for (const mention of mentions) {
    const displayUsername = usernameToDisplay(mention);
    const user = users.find(u =>
      u.name.toLowerCase() === displayUsername.toLowerCase() ||
      u.name.replace(/\s+/g, '_').toLowerCase() === mention.toLowerCase()
    );
    if (user && !userIds.includes(user.id)) {
      userIds.push(user.id);
    }
  }

  return userIds;
}

/**
 * Returns true if content contains @mentions
 */
export function hasMentions(content: string): boolean {
  return /@([A-Za-z0-9_]+)/.test(content);
}
