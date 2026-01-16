/**
 * Activity log data for seed script
 * Audit trail for user actions
 */

import { generateId, toISOString, randomDateLastDays, randomItem } from './helpers';

export interface ActivitySeed {
  id: string;
  user_id: string;
  type: string;
  project_id: string | null;
  issue_id: string | null;
  entity_title: string | null;
  description: string;
  created_at: string;
}

/**
 * Generate activities from issues, comments, and projects
 */
export function generateActivities(
  users: Array<{ id: string; name: string }>,
  projects: Array<{ id: string; name: string }>,
  issues: Array<{ id: string; identifier: string; title: string; status: string; project_id: string; created_at: string }>,
  comments: Array<{ id: string; user_id: string; issue_id: string; created_at: string }>
): ActivitySeed[] {
  const activities: ActivitySeed[] = [];

  // Activity types
  const issueCreatedTypes = ['created', 'created_issue', 'create_issue'];
  const statusChangeTypes = ['updated', 'status_changed', 'moved', 'in_progress', 'completed'];
  const commentTypes = ['commented', 'replied'];
  const projectTypes = ['created_project', 'created', 'updated_project'];

  // Project creation activities
  for (const project of projects) {
    // Find team lead or random user
    const actor = randomItem(users);
    const createdDate = randomDateLastDays(90);

    activities.push({
      id: generateId('act'),
      user_id: actor.id,
      type: randomItem(projectTypes),
      project_id: project.id,
      issue_id: null,
      entity_title: project.name,
      description: `Created project "${project.name}"`,
      created_at: toISOString(createdDate),
    });
  }

  // Issue creation activities
  for (const issue of issues) {
    // Skip subtasks for simplicity (parent covers it)
    if (issue.title.startsWith('Subtask:')) continue;

    const actor = randomItem(users);

    activities.push({
      id: generateId('act'),
      user_id: actor.id,
      type: randomItem(issueCreatedTypes),
      project_id: issue.project_id,
      issue_id: issue.id,
      entity_title: `${issue.identifier}: ${issue.title}`,
      description: `Created issue ${issue.identifier}`,
      created_at: issue.created_at,
    });

    // Status change activities (for issues not in Backlog)
    if (issue.status !== 'Backlog' && issue.status !== 'Canceled') {
      const statusChangeDate = new Date(new Date(issue.created_at).getTime() + 60 * 60 * 1000); // 1 hour after creation

      activities.push({
        id: generateId('act'),
        user_id: actor.id,
        type: randomItem(statusChangeTypes),
        project_id: issue.project_id,
        issue_id: issue.id,
        entity_title: `${issue.identifier}: ${issue.title}`,
        description: `Moved ${issue.identifier} to ${issue.status}`,
        created_at: toISOString(statusChangeDate),
      });
    }

    // Additional status updates for In Progress and Done issues
    if (issue.status === 'In Progress') {
      const updateDate = new Date(new Date(issue.created_at).getTime() + 24 * 60 * 60 * 1000); // 1 day after

      activities.push({
        id: generateId('act'),
        user_id: actor.id,
        type: 'updated',
        project_id: issue.project_id,
        issue_id: issue.id,
        entity_title: `${issue.identifier}: ${issue.title}`,
        description: `Updated ${issue.identifier}`,
        created_at: toISOString(updateDate),
      });
    } else if (issue.status === 'Done') {
      const completionDate = new Date(new Date(issue.created_at).getTime() + 48 * 60 * 60 * 1000); // 2 days after

      activities.push({
        id: generateId('act'),
        user_id: actor.id,
        type: 'completed',
        project_id: issue.project_id,
        issue_id: issue.id,
        entity_title: `${issue.identifier}: ${issue.title}`,
        description: `Completed ${issue.identifier}`,
        created_at: toISOString(completionDate),
      });
    }
  }

  // Comment activities
  for (const comment of comments) {
    // Only add activity for some comments (not all, to reduce noise)
    if (Math.random() > 0.4) {
      const issue = issues.find(i => i.id === comment.issue_id);
      if (issue) {
        activities.push({
          id: generateId('act'),
          user_id: comment.user_id,
          type: randomItem(commentTypes),
          project_id: issue.project_id,
          issue_id: issue.id,
          entity_title: `${issue.identifier}: ${issue.title}`,
          description: `Commented on ${issue.identifier}`,
          created_at: comment.created_at,
        });
      }
    }
  }

  // Sort by created_at
  return activities.sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}
