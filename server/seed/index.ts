/**
 * Linear Clone - Seed Script
 * Populates database with mock data for a digital agency
 *
 * Usage:
 *   npm run seed          - Seed data (warns if database exists)
 *   npm run seed:force    - Seed data (clears existing data first)
 */

import { existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../linear_clone.db');

// Import seed data modules
import { generateUsers, type UserSeed } from './users';
import { generateTeams, generateTeamMembers, type TeamSeed, type TeamMemberSeed } from './teams';
import { generateProjects, type ProjectSeed } from './projects';
import { generateIssues, type IssueSeed, type IssueAssigneeSeed } from './issues';
import { generateComments, type CommentSeed } from './comments';
import { generateMentionNotifications, generateDueDateNotifications, limitNotificationsPerUser, type NotificationSeed } from './notifications';
import { generateActivities, type ActivitySeed } from './activities';

// Import database manager
import { DatabaseManager } from '../database';

/**
 * Clear existing database file
 */
function clearDatabase(): void {
  if (existsSync(dbPath)) {
    console.log(`🗑️  Removing existing database: ${dbPath}`);
    unlinkSync(dbPath);
  }
}

/**
 * Seed all data
 */
async function seedData(force = false): Promise<void> {
  const startTime = Date.now();
  console.log('🌱 Starting seed process...\n');

  // Check if database exists
  if (existsSync(dbPath) && !force) {
    console.warn('⚠️  Database already exists!');
    console.warn('   Use --force to clear existing data and re-seed.');
    console.warn('   Skipping seed.\n');
    return;
  }

  if (force) {
    clearDatabase();
  }

  // Initialize database (will create new one if missing)
  const db = new DatabaseManager('./linear_clone.db');
  await db.ready();
  console.log('✅ Database initialized\n');

  // ===== GENERATE DATA =====

  console.log('📊 Generating data...');

  // 1. Users
  console.log('  👥 Generating users...');
  const users = await generateUsers();
  const userNameToId = new Map<string, string>();
  const userIdToName = new Map<string, string>();
  for (const user of users) {
    userNameToId.set(user.name, user.id);
    userIdToName.set(user.id, user.name);
  }

  // 2. Teams
  console.log('  🏢 Generating teams...');
  const teams = generateTeams();

  // 3. Team members
  console.log('  🔗 Linking users to teams...');
  const teamMembers = generateTeamMembers(teams, userNameToId);

  // 4. Projects
  console.log('  📁 Generating projects...');
  const teamLeadIds: Map<string, string> = new Map();
  for (const user of users) {
    if (user.role === 'Team Lead') {
      teamLeadIds.set(user.name, user.id);
    }
  }
  const teamIdentifiers = new Map<string, string>();
  const teamIdsByName = new Map<string, string>();
  for (const team of teams) {
    const identifier = team.name === 'Engineering' ? 'ENG' : team.name === 'Design' ? 'DES' : 'MKT';
    teamIdentifiers.set(team.id, identifier);
    teamIdsByName.set(team.name, team.id);
  }
  const projects = generateProjects(teams, teamLeadIds, teamIdentifiers, teamIdsByName);

  // 5. Issues
  console.log('  🎫 Generating issues...');
  const allIssues: IssueSeed[] = [];
  const allAssignees: IssueAssigneeSeed[] = [];
  const issueNumber: { [key: string]: number } = {};

  // Create a set of Guest user IDs to exclude from issue assignments
  const guestUserIds = new Set(users.filter(u => u.role === 'Guest').map(u => u.id));

  for (const team of teams) {
    // Get team member IDs, excluding Guests (Guests cannot be assigned to issues)
    const memberIds = teamMembers
      .filter(tm => tm.team_id === team.id)
      .map(tm => tm.user_id)
      .filter(userId => !guestUserIds.has(userId));

    const { issues, assignees } = generateIssues(
      projects,
      team.name,
      memberIds,
      issueNumber
    );

    allIssues.push(...issues);
    allAssignees.push(...assignees);
  }

  // 6. Comments
  console.log('  💬 Generating comments...');
  const teamMemberIds = users
    .filter(u => u.role === 'Team Lead' || u.role === 'Member')
    .map(u => u.id);
  const comments = generateComments(allIssues, teamMemberIds, userIdToName);

  // 7. Notifications
  console.log('  🔔 Generating notifications...');
  const issueIdentifiers = new Map<string, string>();
  for (const issue of allIssues) {
    issueIdentifiers.set(issue.id, issue.identifier);
  }

  let notifications = [
    ...generateMentionNotifications(comments, teamMemberIds, userNameToId, issueIdentifiers),
    ...generateDueDateNotifications(allIssues, allAssignees),
  ];
  notifications = limitNotificationsPerUser(notifications, 5, 15);

  // 8. Activities
  console.log('  📜 Generating activities...');
  const activities = generateActivities(
    users.map(u => ({ id: u.id, name: u.name })),
    projects.map(p => ({ id: p.id, name: p.name })),
    allIssues,
    comments
  );

  console.log('✅ Data generation complete\n');

  // ===== INSERT INTO DATABASE =====

  console.log('💾 Inserting data into database...');

  // Helper function to batch insert
  async function batchInsert<T>(
    items: T[],
    tableName: string,
    insertFn: (item: T) => Promise<void>,
    batchSize: number = 50
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      for (const item of batch) {
        await insertFn(item);
      }
      if ((i + batchSize) % 100 === 0 || i + batchSize >= items.length) {
        process.stdout.write(`\r    ${tableName}: ${Math.min(i + batchSize, items.length)}/${items.length}`);
      }
    }
    console.log(); // New line after progress
  }

  // Insert users
  console.log('  👥 Inserting users...');
  for (const user of users) {
    await db.run(
      `INSERT INTO users (id, name, email, password_hash, avatar_url, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.name, user.email, user.password_hash, user.avatar_url, user.role, user.created_at, user.updated_at]
    );
  }
  console.log(`    ✅ Inserted ${users.length} users`);

  // Insert teams
  console.log('  🏢 Inserting teams...');
  for (const team of teams) {
    await db.run(
      'INSERT INTO teams (id, name, icon, created_at) VALUES (?, ?, ?, ?)',
      [team.id, team.name, team.icon, team.created_at]
    );
  }
  console.log(`    ✅ Inserted ${teams.length} teams`);

  // Insert team members
  console.log('  🔗 Linking team members...');
  for (const member of teamMembers) {
    await db.run(
      'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
      [member.team_id, member.user_id]
    );
  }
  console.log(`    ✅ Linked ${teamMembers.length} team members`);

  // Insert projects
  console.log('  📁 Inserting projects...');
  for (const project of projects) {
    await db.run(
      `INSERT INTO projects (id, name, identifier, icon, team_id, description, is_public, public_slug, lead_id, start_date, target_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project.id, project.name, project.identifier, project.icon, project.team_id,
        project.description ?? null, project.is_public, project.public_slug ?? null, project.lead_id ?? null,
        project.start_date ?? null, project.target_date ?? null, project.created_at, project.updated_at
      ]
    );
  }
  console.log(`    ✅ Inserted ${projects.length} projects`);

  // Insert issues
  console.log('  🎫 Inserting issues...');
  for (const issue of allIssues) {
    await db.run(
      `INSERT INTO issues (id, identifier, title, description, status, priority, project_id, parent_id, start_date, due_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        issue.id, issue.identifier, issue.title, issue.description ?? null,
        issue.status, issue.priority, issue.project_id, issue.parent_id ?? null,
        issue.start_date ?? null, issue.due_date ?? null, issue.created_at, issue.updated_at
      ]
    );
  }
  console.log(`    ✅ Inserted ${allIssues.length} issues`);

  // Insert issue assignees
  console.log('  👤 Assigning issues to users...');
  for (const assignee of allAssignees) {
    await db.run(
      'INSERT INTO issue_assignees (issue_id, user_id) VALUES (?, ?)',
      [assignee.issue_id, assignee.user_id]
    );
  }
  console.log(`    ✅ Created ${allAssignees.length} issue assignments`);

  // Insert comments
  console.log('  💬 Inserting comments...');
  for (const comment of comments) {
    await db.run(
      'INSERT INTO comments (id, content, issue_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [comment.id, comment.content, comment.issue_id, comment.user_id, comment.created_at]
    );
  }
  console.log(`    ✅ Inserted ${comments.length} comments`);

  // Insert notifications
  console.log('  🔔 Inserting notifications...');
  for (const notif of notifications) {
    await db.run(
      `INSERT INTO notifications (id, user_id, type, message, issue_id, is_read, actor_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [notif.id, notif.user_id, notif.type, notif.message, notif.issue_id, notif.is_read, notif.actor_id ?? null, notif.created_at]
    );
  }
  console.log(`    ✅ Inserted ${notifications.length} notifications`);

  // Insert activities
  console.log('  📜 Inserting activities...');
  for (const activity of activities) {
    await db.run(
      `INSERT INTO activities (id, user_id, type, project_id, issue_id, entity_title, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [activity.id, activity.user_id, activity.type, activity.project_id ?? null, activity.issue_id ?? null, activity.entity_title ?? null, activity.description ?? null, activity.created_at]
    );
  }
  console.log(`    ✅ Inserted ${activities.length} activities`);

  // Save database
  db.save();
  db.close();

  // ===== SUMMARY =====

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Seed complete!');
  console.log('='.repeat(50));
  console.log(`⏱️  Time: ${elapsed}s`);
  console.log(`📊 Database: server/linear_clone.db`);
  console.log('');
  console.log('Summary:');
  console.log(`  👥 Users:      ${users.length}`);
  console.log(`  🏢 Teams:      ${teams.length}`);
  console.log(`  🔗 Members:    ${teamMembers.length}`);
  console.log(`  📁 Projects:   ${projects.length}`);
  console.log(`  🎫 Issues:     ${allIssues.length}`);
  console.log(`  👤 Assignments: ${allAssignees.length}`);
  console.log(`  💬 Comments:   ${comments.length}`);
  console.log(`  🔔 Notifs:     ${notifications.length}`);
  console.log(`  📜 Activities: ${activities.length}`);
  console.log('');
  console.log('🔐 Admin credentials:');
  console.log('   Email:    rengga@neodigital.co.id');
  console.log('   Password: Pen16paght!');
  console.log('');
  console.log('   Default user password: password123');
  console.log('='.repeat(50));
}

// Main entry point
(async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');

  try {
    await seedData(force);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
})();
