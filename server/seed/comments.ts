/**
 * Comment data for seed script
 * Includes @mentions for collaboration features
 */

import { generateId, toISOString, randomDateLastDays, randomItem } from './helpers';

export interface CommentSeed {
  id: string;
  content: string;
  issue_id: string;
  user_id: string;
  created_at: string;
}

// Comment templates in Bahasa Indonesia with @mentions
const commentTemplates: string[] = [
  "@{name} tolong review ya, ini task frontend yang penting",
  "Sudah fix bug di API, coba test lagi @{name}",
  "@{name} bisa bantu jelasin requirement ini?",
  "Deploy ke staging sudah berhasil ✅",
  "Ada edge case yang perlu ditangin di sini @{name}",
  "@{name} update: progress 80%, on track untuk target tanggal 15",
  "Saya buatkan PR, tolong review @{name}",
  "Bug ini reproducible di Chrome tapi tidak di Firefox",
  "Scaling issue di product list, butuh pagination",
  "Design sudah approved klien, mulai coding bisa",
  "@{name} apakah ini sudah ready untuk QA?",
  "Nice work! tinggal sedikit lagi",
  " @{name} kira-kira kapan bisa deploy?",
  "Note untuk @{name}: Pastikan handle error dengan baik",
  "Documentation sudah diupdate, cek docs folder",
  "Saya stuck di bagian authentication, ada yang bisa help?",
  "@{name} ini urgent ya, deadline minggu ini",
  "Test cases sudah passing, ready untuk merge",
  "Performance improvement dari 3s ke 500ms 🚀",
  "@{name} tolong tambahkan unit test untuk function ini",
];

const resolutionComments: string[] = [
  "Issue resolved dengan PR #123. Close!",
  "Sudah fix di production. Verified working ✅",
  "Deployed ke staging. Awaiting QA signoff.",
  "Done! Closure documentation ditambahkan.",
  "Completed per requirements. Marking as done.",
];

const questionComments: string[] = [
  "Ada yang tau kenapa error ini muncul?",
  "Best approach untuk ini apa ya?",
  "@{name} punya saran?",
  "Kira-kira should we use Redux or Context API?",
  "Ada alternative library yang lebih baik?",
];

const updateComments: string[] = [
  "Update: Sudah fix critical bug, tinggal edge cases",
  "Progress: 50% done, estimate complete besok",
  "Status: Menunggu feedback dari team lain",
  "FYI: Requirement change dari klien",
  "Timeline adjust karena adding new feature",
];

/**
 * Generate comments for issues
 */
export function generateComments(
  issues: Array<{ id: string; status: string }>,
  userIds: string[],
  userNames: Map<string, string>
): CommentSeed[] {
  const comments: CommentSeed[] = [];

  // Filter issues that should have comments
  const issuesWithComments = issues.filter(issue => {
    // 60% of issues have at least one comment
    return Math.random() < 0.6;
  });

  for (const issue of issuesWithComments) {
    // Determine comment count based on status
    let commentCount = 1;
    if (issue.status === 'In Progress') {
      commentCount = 2 + Math.floor(Math.random() * 4); // 2-5 comments
    } else if (issue.status === 'In Review') {
      commentCount = 3 + Math.floor(Math.random() * 3); // 3-5 comments
    } else if (issue.status === 'Done') {
      commentCount = 2 + Math.floor(Math.random() * 2); // 2-3 comments (including resolution)
    } else {
      commentCount = 1 + Math.floor(Math.random() * 2); // 1-2 comments
    }

    // Generate comments
    const issueCreated = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
    let commentTime = new Date(issueCreated.getTime() + 60 * 60 * 1000); // 1 hour after issue created

    for (let i = 0; i < commentCount; i++) {
      let content: string;

      // Last comment for Done issues is a resolution comment
      if (issue.status === 'Done' && i === commentCount - 1) {
        content = randomItem(resolutionComments);
      } else if (i === 0) {
        // First comment
        content = randomItem([...commentTemplates, ...questionComments]);
      } else {
        // Subsequent comments
        content = randomItem([...commentTemplates, ...updateComments, ...questionComments]);
      }

      // Replace @{name} with actual @mentions
      const mentionedUserId = randomItem(userIds);
      const mentionedUserName = userNames.get(mentionedUserId);
      if (mentionedUserName && content.includes('@{name}')) {
        content = content.replace('@{name}', `@${mentionedUserName}`);
      }

      // Random author (different from mentioned user)
      let authorId = randomItem(userIds);
      if (authorId === mentionedUserId && userIds.length > 1) {
        authorId = userIds.find(id => id !== mentionedUserId) || authorId;
      }

      comments.push({
        id: generateId('cmt'),
        content,
        issue_id: issue.id,
        user_id: authorId,
        created_at: toISOString(commentTime),
      });

      // Next comment 1-24 hours later
      commentTime = new Date(commentTime.getTime() + (1 + Math.random() * 23) * 60 * 60 * 1000);
    }
  }

  return comments;
}

/**
 * Extract @mentions from comment content
 * Returns array of mentioned usernames
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@([A-Za-z\s]+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1].trim());
  }

  return mentions;
}
