import { getDatabase } from './database.js';
import { hashPassword } from './auth/password.js';

// Helper to generate UUID using Node.js crypto API
const uuidv4 = () => crypto.randomUUID();

// Helper to generate dates relative to now
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const now = () => new Date().toISOString();

// Helper to insert user with hashed password
async function createUser(db: any, name: string, email: string, password: string, role: string, avatarUrl: string) {
  const id = uuidv4();
  const password_hash = await hashPassword(password);
  await db.run(
    `INSERT INTO users (id, name, email, password_hash, avatar_url, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, email, password_hash, avatarUrl, role, now(), now()]
  );
  return id;
}

// Helper to get a random item from array
const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomSubarray = <T>(arr: T[], min: number, max: number): T[] => {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// Status and Priority options
const statuses = ['Backlog', 'Todo', 'In Progress', 'In Review', 'Done', 'Canceled'] as const;
const priorities = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'] as const;

export async function seedDatabase() {
  const db = await getDatabase();
  console.log('🌱 Starting database seed...');

  // ============================================
  // 1. CREATE USERS (various roles)
  // ============================================
  console.log('  Creating users...');

  const users: any[] = [];

  // Admins
  users.push({ id: await createUser(db, 'Alice Chen', 'alice@example.com', 'Password123!', 'Admin', 'https://i.pravatar.cc/150?u=alice'), name: 'Alice Chen', email: 'alice@example.com' });
  users.push({ id: await createUser(db, 'Bob Smith', 'bob@example.com', 'Password123!', 'Admin', 'https://i.pravatar.cc/150?u=bob'), name: 'Bob Smith', email: 'bob@example.com' });

  // Team Leads
  users.push({ id: await createUser(db, 'Carol Williams', 'carol@example.com', 'Password123!', 'Team Lead', 'https://i.pravatar.cc/150?u=carol'), name: 'Carol Williams', email: 'carol@example.com' });
  users.push({ id: await createUser(db, 'David Johnson', 'david@example.com', 'Password123!', 'Team Lead', 'https://i.pravatar.cc/150?u=david'), name: 'David Johnson', email: 'david@example.com' });
  users.push({ id: await createUser(db, 'Emma Brown', 'emma@example.com', 'Password123!', 'Team Lead', 'https://i.pravatar.cc/150?u=emma'), name: 'Emma Brown', email: 'emma@example.com' });

  // Members
  users.push({ id: await createUser(db, 'Frank Miller', 'frank@example.com', 'Password123!', 'Member', 'https://i.pravatar.cc/150?u=frank'), name: 'Frank Miller', email: 'frank@example.com' });
  users.push({ id: await createUser(db, 'Grace Lee', 'grace@example.com', 'Password123!', 'Member', 'https://i.pravatar.cc/150?u=grace'), name: 'Grace Lee', email: 'grace@example.com' });
  users.push({ id: await createUser(db, 'Henry Wilson', 'henry@example.com', 'Password123!', 'Member', 'https://i.pravatar.cc/150?u=henry'), name: 'Henry Wilson', email: 'henry@example.com' });
  users.push({ id: await createUser(db, 'Ivy Martinez', 'ivy@example.com', 'Password123!', 'Member', 'https://i.pravatar.cc/150?u=ivy'), name: 'Ivy Martinez', email: 'ivy@example.com' });
  users.push({ id: await createUser(db, 'Jack Davis', 'jack@example.com', 'Password123!', 'Member', 'https://i.pravatar.cc/150?u=jack'), name: 'Jack Davis', email: 'jack@example.com' });
  users.push({ id: await createUser(db, 'Kate Taylor', 'kate@example.com', 'Password123!', 'Member', 'https://i.pravatar.cc/150?u=kate'), name: 'Kate Taylor', email: 'kate@example.com' });

  // Viewers
  users.push({ id: await createUser(db, 'Liam Anderson', 'liam@example.com', 'Password123!', 'Viewer', 'https://i.pravatar.cc/150?u=liam'), name: 'Liam Anderson', email: 'liam@example.com' });
  users.push({ id: await createUser(db, 'Mia Thomas', 'mia@example.com', 'Password123!', 'Viewer', 'https://i.pravatar.cc/150?u=mia'), name: 'Mia Thomas', email: 'mia@example.com' });

  console.log(`    ✅ Created ${users.length} users`);

  // ============================================
  // 2. CREATE TEAMS
  // ============================================
  console.log('  Creating teams...');

  const teams: any[] = [];
  const teamData = [
    { name: 'Engineering', icon: '⚙️' },
    { name: 'Design', icon: '🎨' },
    { name: 'Product', icon: '📦' },
    { name: 'Marketing', icon: '📢' },
  ];

  for (const team of teamData) {
    const id = uuidv4();
    await db.run(
      'INSERT INTO teams (id, name, icon, created_at) VALUES (?, ?, ?, ?)',
      [id, team.name, team.icon, now()]
    );
    teams.push({ id, name: team.name, icon: team.icon });
  }

  console.log(`    ✅ Created ${teams.length} teams`);

  // ============================================
  // 3. ADD TEAM MEMBERS
  // ============================================
  console.log('  Adding team members...');

  // Engineering Team (Carol is lead) - admins + 5 other members
  const engineeringTeam = teams[0];
  const engineeringMembers = [users[0], users[1], users[2], users[5], users[6], users[7]]; // Alice, Bob, Carol + others
  for (const user of engineeringMembers) {
    await db.run('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)', [engineeringTeam.id, user.id]);
  }

  // Design Team (David is lead) - admins + 3 other members
  const designTeam = teams[1];
  const designMembers = [users[0], users[1], users[3], users[6], users[7]]; // Alice, Bob, David + others
  for (const user of designMembers) {
    await db.run('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)', [designTeam.id, user.id]);
  }

  // Product Team (Emma is lead) - admins + 4 other members
  const productTeam = teams[2];
  const productMembers = [users[0], users[1], users[4], users[5], users[9]]; // Alice, Bob, Emma + others
  for (const user of productMembers) {
    await db.run('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)', [productTeam.id, user.id]);
  }

  // Marketing Team - admins + 2 other members
  const marketingTeam = teams[3];
  const marketingMembers = [users[0], users[1], users[5], users[11]]; // Alice, Bob + others
  for (const user of marketingMembers) {
    await db.run('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)', [marketingTeam.id, user.id]);
  }

  console.log(`    ✅ Added team members`);

  // ============================================
  // 4. CREATE PROJECTS
  // ============================================
  console.log('  Creating projects...');

  const projects: any[] = [];

  // Engineering Projects
  const engProjects = [
    { name: 'Platform Redesign', identifier: 'PLT', icon: '🚀', description: 'Complete overhaul of the core platform architecture' },
    { name: 'API Performance', identifier: 'API', icon: '⚡', description: 'Optimize API response times and reduce latency' },
    { name: 'Database Migration', identifier: 'DBM', icon: '🗄️', description: 'Migrate legacy database to new infrastructure' },
  ];

  for (const p of engProjects) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO projects (id, name, identifier, icon, team_id, description, lead_id, start_date, target_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, p.name, p.identifier, p.icon, engineeringTeam.id, p.description, users[2].id, daysAgo(30), daysAgo(-30), now(), now()]
    );
    projects.push({ id, ...p, teamId: engineeringTeam.id, leadId: users[2].id });
  }

  // Design Projects
  const designProjects = [
    { name: 'Brand Refresh', identifier: 'BRD', icon: '🎨', description: 'Update visual identity across all touchpoints' },
    { name: 'Mobile App Design', identifier: 'MOB', icon: '📱', description: 'Design new mobile application interface' },
  ];

  for (const p of designProjects) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO projects (id, name, identifier, icon, team_id, description, lead_id, start_date, target_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, p.name, p.identifier, p.icon, designTeam.id, p.description, users[3].id, daysAgo(20), daysAgo(-20), now(), now()]
    );
    projects.push({ id, ...p, teamId: designTeam.id, leadId: users[3].id });
  }

  // Product Projects
  const productProjects = [
    { name: 'Feature Launch Q1', identifier: 'Q1F', icon: '🚀', description: 'Quarter 1 feature releases and improvements' },
    { name: 'User Onboarding', identifier: 'ONB', icon: '👋', description: 'Improve new user experience and onboarding flow' },
  ];

  for (const p of productProjects) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO projects (id, name, identifier, icon, team_id, description, lead_id, start_date, target_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, p.name, p.identifier, p.icon, productTeam.id, p.description, users[4].id, daysAgo(15), daysAgo(-15), now(), now()]
    );
    projects.push({ id, ...p, teamId: productTeam.id, leadId: users[4].id });
  }

  console.log(`    ✅ Created ${projects.length} projects`);

  // ============================================
  // 5. CREATE ISSUES AND SUB-ISSUES
  // ============================================
  console.log('  Creating issues...');

  const issues: any[] = [];
  let issueCounter = 1;

  // Issue templates by project
  const issueTemplates: Record<string, Array<{ title: string; description: string; status: string; priority: string; hasSubtasks: boolean }>> = {
    'PLT': [
      { title: 'Set up new project structure', description: 'Initialize repository and configure build tools', status: 'Done', priority: 'High', hasSubtasks: true },
      { title: 'Design component architecture', description: 'Define reusable components and their relationships', status: 'Done', priority: 'High', hasSubtasks: false },
      { title: 'Implement authentication system', description: 'OAuth integration with multiple providers', status: 'In Progress', priority: 'Urgent', hasSubtasks: true },
      { title: 'Build dashboard layout', description: 'Create responsive grid layout for main dashboard', status: 'In Progress', priority: 'High', hasSubtasks: true },
      { title: 'Add dark mode support', description: 'Implement theme switching functionality', status: 'Todo', priority: 'Medium', hasSubtasks: false },
      { title: 'Performance optimization', description: 'Analyze and fix performance bottlenecks', status: 'Backlog', priority: 'Medium', hasSubtasks: true },
      { title: 'Write unit tests', description: 'Achieve 80% code coverage', status: 'Todo', priority: 'Medium', hasSubtasks: false },
      { title: 'Documentation', description: 'Write technical documentation for API', status: 'Backlog', priority: 'Low', hasSubtasks: false },
      { title: 'Security audit', description: 'Review code for security vulnerabilities', status: 'Backlog', priority: 'Urgent', hasSubtasks: false },
    ],
    'API': [
      { title: 'Profile API endpoints', description: 'Identify slowest endpoints', status: 'Done', priority: 'High', hasSubtasks: true },
      { title: 'Implement caching layer', description: 'Add Redis caching for frequently accessed data', status: 'In Progress', priority: 'High', hasSubtasks: true },
      { title: 'Database query optimization', description: 'Add indexes and optimize complex queries', status: 'In Review', priority: 'High', hasSubtasks: false },
      { title: 'Load balancing setup', description: 'Configure load balancer for horizontal scaling', status: 'Todo', priority: 'Medium', hasSubtasks: false },
      { title: 'Monitor response times', description: 'Set up APM and alerting', status: 'Backlog', priority: 'Low', hasSubtasks: false },
    ],
    'DBM': [
      { title: 'Create migration scripts', description: 'Write SQL scripts for data transfer', status: 'Done', priority: 'Urgent', hasSubtasks: true },
      { title: 'Set up new database servers', description: 'Provision and configure production database', status: 'Done', priority: 'Urgent', hasSubtasks: false },
      { title: 'Data validation', description: 'Verify data integrity after migration', status: 'In Progress', priority: 'Urgent', hasSubtasks: true },
      { title: 'Rollback plan', description: 'Document rollback procedures', status: 'Todo', priority: 'High', hasSubtasks: false },
    ],
    'BRD': [
      { title: 'Competitor analysis', description: 'Research competitor branding strategies', status: 'Done', priority: 'Medium', hasSubtasks: false },
      { title: 'Create mood board', description: 'Visual exploration of brand directions', status: 'Done', priority: 'High', hasSubtasks: false },
      { title: 'Design new logo', description: 'Create logo variations and mockups', status: 'In Review', priority: 'High', hasSubtasks: true },
      { title: 'Update color palette', description: 'Define new brand colors and gradients', status: 'Todo', priority: 'Medium', hasSubtasks: false },
      { title: 'Create style guide', description: 'Document brand usage guidelines', status: 'Backlog', priority: 'Medium', hasSubtasks: false },
    ],
    'MOB': [
      { title: 'User research interviews', description: 'Conduct user interviews for mobile needs', status: 'Done', priority: 'High', hasSubtasks: false },
      { title: 'Wireframe all screens', description: 'Create low-fidelity wireframes', status: 'Done', priority: 'High', hasSubtasks: true },
      { title: 'Design high-fidelity mockups', description: 'Create pixel-perfect designs', status: 'In Progress', priority: 'High', hasSubtasks: true },
      { title: 'Prototype interactions', description: 'Build interactive prototype for testing', status: 'Todo', priority: 'Medium', hasSubtasks: false },
      { title: 'Handoff to development', description: 'Prepare design assets and specifications', status: 'Backlog', priority: 'Medium', hasSubtasks: false },
    ],
    'Q1F': [
      { title: 'Feature requirements gathering', description: 'Collect and prioritize feature requests', status: 'Done', priority: 'High', hasSubtasks: false },
      { title: 'Create product roadmap', description: 'Plan feature release schedule', status: 'Done', priority: 'High', hasSubtasks: false },
      { title: 'Beta testing program', description: 'Set up and manage beta testing', status: 'In Progress', priority: 'High', hasSubtasks: true },
      { title: 'Launch marketing materials', description: 'Prepare launch announcements and content', status: 'Todo', priority: 'Medium', hasSubtasks: false },
    ],
    'ONB': [
      { title: 'User journey mapping', description: 'Map current onboarding experience', status: 'Done', priority: 'Medium', hasSubtasks: false },
      { title: 'Design onboarding flow', description: 'Create improved onboarding screens', status: 'In Progress', priority: 'High', hasSubtasks: true },
      { title: 'A/B testing setup', description: 'Prepare experiments for onboarding variants', status: 'Todo', priority: 'Medium', hasSubtasks: false },
      { title: 'Analytics integration', description: 'Track onboarding funnel metrics', status: 'Backlog', priority: 'Low', hasSubtasks: false },
    ],
  };

  for (const project of projects) {
    const templates = issueTemplates[project.identifier] || [];
    for (const template of templates) {
      const issueId = uuidv4();
      const identifier = `${project.identifier}-${String(issueCounter).padStart(3, '0')}`;
      issueCounter++;

      await db.run(
        `INSERT INTO issues (id, identifier, title, description, status, priority, project_id, start_date, due_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [issueId, identifier, template.title, template.description, template.status, template.priority, project.id, daysAgo(14), daysAgo(Math.random() * 20 - 10), now(), now()]
      );

      // Add assignees (1-3 random team members)
      const teamMemberIds = project.teamId === engineeringTeam.id ? engineeringMembers.map(u => u.id)
        : project.teamId === designTeam.id ? designMembers.map(u => u.id)
        : productMembers.map(u => u.id);
      const assignees = randomSubarray(teamMemberIds, 1, 3);
      for (const assigneeId of assignees) {
        await db.run('INSERT INTO issue_assignees (issue_id, user_id) VALUES (?, ?)', [issueId, assigneeId]);
      }

      issues.push({ id: issueId, identifier, ...template, projectId: project.id, assigneeIds: assignees });

      // Create sub-issues if template has subtasks
      if (template.hasSubtasks) {
        const subtaskCount = Math.floor(Math.random() * 3) + 2; // 2-4 subtasks
        for (let i = 0; i < subtaskCount; i++) {
          const subIssueId = uuidv4();
          const subIdentifier = `${project.identifier}-${String(issueCounter).padStart(3, '0')}`;
          issueCounter++;

          const subtaskTitles = [
            'Research and planning', 'Implementation phase 1', 'Implementation phase 2',
            'Testing and QA', 'Documentation', 'Code review', 'Deployment preparation'
          ];
          const subtaskTitle = subtaskTitles[i % subtaskTitles.length];

          await db.run(
            `INSERT INTO issues (id, identifier, title, description, status, priority, project_id, parent_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [subIssueId, subIdentifier, subtaskTitle, `Subtask for: ${template.title}`, random(statuses.slice(0, 5)), random(priorities), project.id, issueId, now(), now()]
          );

          // Assign subtask to 1-2 people
          const subAssignees = randomSubarray(teamMemberIds, 1, 2);
          for (const assigneeId of subAssignees) {
            await db.run('INSERT INTO issue_assignees (issue_id, user_id) VALUES (?, ?)', [subIssueId, assigneeId]);
          }

          issues.push({ id: subIssueId, identifier: subIdentifier, title: subtaskTitle, projectId: project.id, parentId: issueId });
        }
      }
    }
  }

  console.log(`    ✅ Created ${issues.length} issues (including subtasks)`);

  // ============================================
  // 6. CREATE COMMENTS (with and without mentions)
  // ============================================
  console.log('  Creating comments...');

  const commentTemplates = [
    'I think this looks good overall. Just a few minor suggestions.',
    'Can we discuss this in the next standup?',
    'Great progress! @Alice Chen what do you think about this approach?',
    'I have some concerns about the timeline here.',
    '@Bob Smith @Carol Williams can you review this when you get a chance?',
    'This matches what we discussed in the planning meeting.',
    'Should we add this to the backlog for now?',
    'Excellent work on this! Ready for review.',
    '@David Johnson I need your input on the technical approach here.',
    'Let\'s make sure we have test coverage before merging.',
    'I\'ll handle this, ETA end of week.',
    '@Emma Brown can we prioritize this for the next sprint?',
    'Documentation has been updated.',
    'Blocking issue resolved, we can proceed.',
    'Question: should we consider alternative approaches here?'
  ];

  const comments: any[] = [];
  let commentCount = 0;

  // Add 2-5 comments to about 60% of issues
  for (const issue of issues) {
    if (Math.random() > 0.4) {
      const numComments = Math.floor(Math.random() * 4) + 2; // 2-5 comments
      const teamMembers = projectTeamsMembers(issue.projectId);

      for (let i = 0; i < numComments; i++) {
        const commentId = uuidv4();
        const author = random(teamMembers);
        const content = random(commentTemplates);

        await db.run(
          'INSERT INTO comments (id, content, issue_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
          [commentId, content, issue.id, author.id, daysAgo(Math.floor(Math.random() * 10))]
        );
        comments.push({ id: commentId, content, issueId: issue.id, userId: author.id });
        commentCount++;
      }
    }
  }

  // Helper function to get team members for a project
  function projectTeamsMembers(projectId: string): any[] {
    const project = projects.find(p => p.id === projectId);
    if (project?.teamId === engineeringTeam.id) return engineeringMembers;
    if (project?.teamId === designTeam.id) return designMembers;
    if (project?.teamId === productTeam.id) return productMembers;
    return users;
  }

  console.log(`    ✅ Created ${commentCount} comments`);

  // ============================================
  // 7. CREATE NOTIFICATIONS
  // ============================================
  console.log('  Creating notifications...');

  const mentionNotifications: any[] = [];
  const dueDateNotifications: any[] = [];

  // Process comments to find @mentions
  for (const comment of comments) {
    const mentionRegex = /@([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g;
    let match;
    const content = comment.content;

    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedName = match[1];
      const mentionedUser = users.find(u => u.name === mentionedName);

      if (mentionedUser && mentionedUser.id !== comment.userId) {
        const notifId = uuidv4();
        const issue = issues.find(i => i.id === comment.issueId);
        const actor = users.find(u => u.id === comment.userId);

        await db.run(
          `INSERT INTO notifications (id, user_id, type, message, issue_id, actor_id, is_read, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [notifId, mentionedUser.id, 'mention', `${actor?.name || 'Someone'} mentioned you in a comment`, comment.issueId, comment.userId, 0, daysAgo(Math.random() * 5)]
        );
        mentionNotifications.push({ id: notifId, userId: mentionedUser.id, issueId: comment.issueId });
      }
    }
  }

  // Create due date notifications for issues due soon
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  for (const issue of issues.filter(i => i.dueDate)) {
    if (issue.assigneeIds && issue.assigneeIds.length > 0) {
      for (const assigneeId of issue.assigneeIds) {
        // Randomly assign some as due date notifications
        if (Math.random() > 0.7) {
          const notifId = uuidv4();
          await db.run(
            `INSERT INTO notifications (id, user_id, type, message, issue_id, is_read, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [notifId, assigneeId, 'dueDate', `Issue "${issue.title}" is due soon`, issue.id, 0, daysAgo(Math.random() * 2)]
          );
          dueDateNotifications.push({ id: notifId, userId: assigneeId, issueId: issue.id });
        }
      }
    }
  }

  console.log(`    ✅ Created ${mentionNotifications.length + dueDateNotifications.length} notifications`);

  // ============================================
  // 8. CREATE ACTIVITIES
  // ============================================
  console.log('  Creating activities...');

  const activityTypes = ['created', 'updated', 'commented', 'status_changed', 'assigned'];
  let activityCount = 0;

  for (const issue of issues.slice(0, 20)) { // Add activities for first 20 issues
    const project = projects.find(p => p.id === issue.projectId);
    const teamMembers = projectTeamsMembers(issue.projectId);
    const numActivities = Math.floor(Math.random() * 3) + 1; // 1-3 activities per issue

    for (let i = 0; i < numActivities; i++) {
      const activityId = uuidv4();
      const actor = random(teamMembers);
      const activityType = random(activityTypes);
      let description = '';

      switch (activityType) {
        case 'created':
          description = `created this issue`;
          break;
        case 'updated':
          description = `updated this issue`;
          break;
        case 'commented':
          description = `added a comment`;
          break;
        case 'status_changed':
          description = `changed status to ${random(statuses)}`;
          break;
        case 'assigned':
          description = `assigned this issue`;
          break;
      }

      await db.run(
        `INSERT INTO activities (id, user_id, type, project_id, issue_id, entity_title, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [activityId, actor.id, activityType, issue.projectId, issue.id, issue.title, description, daysAgo(Math.random() * 14)]
      );
      activityCount++;
    }
  }

  console.log(`    ✅ Created ${activityCount} activities`);

  // Save database
  (db as any).save();

  console.log('');
  console.log('✨ Database seeded successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Users: ${users.length}`);
  console.log(`   Teams: ${teams.length}`);
  console.log(`   Projects: ${projects.length}`);
  console.log(`   Issues: ${issues.length}`);
  console.log(`   Comments: ${commentCount}`);
  console.log(`   Notifications: ${mentionNotifications.length + dueDateNotifications.length}`);
  console.log(`   Activities: ${activityCount}`);
  console.log('');
  console.log('🔐 Test credentials (all passwords: Password123!):');
  console.log('   Admin: alice@example.com');
  console.log('   Team Lead: carol@example.com (Engineering)');
  console.log('   Team Lead: david@example.com (Design)');
  console.log('   Team Lead: emma@example.com (Product)');
  console.log('   Member: frank@example.com');
  console.log('');
}

// Run the seed function
seedDatabase().catch(console.error);
