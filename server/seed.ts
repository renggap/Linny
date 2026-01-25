import { PrismaClient } from '@prisma/client';
import { hashPassword } from './auth/password.js';

const prisma = new PrismaClient();

// Helper to generate dates relative to now
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const now = () => new Date();

// Helper to get a random item from array (with non-null assertion for seeding purposes)
const random = <T>(arr: readonly T[]): T => {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index] as T;
};
const randomSubarray = <T>(arr: readonly T[], min: number, max: number): T[] => {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// Status and Priority options
const statuses: readonly string[] = ['Backlog', 'Todo', 'InProgress', 'InReview', 'Done', 'Canceled'];
const priorities: readonly string[] = ['NoPriority', 'Urgent', 'High', 'Medium', 'Low'];

export async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  // ============================================
  // 1. CREATE USERS (various roles)
  // ============================================
  console.log('  Creating users...');

  const users: any[] = [];

  // Admins
  const alicePassword = await hashPassword('Password123!');
  const alice = await prisma.user.create({
    data: {
      name: 'Alice Chen',
      email: 'alice@example.com',
      passwordHash: alicePassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=alice',
      role: 'Administrator',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: alice.id, name: alice.name, email: alice.email });

  const bobPassword = await hashPassword('Password123!');
  const bob = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      passwordHash: bobPassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=bob',
      role: 'Administrator',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: bob.id, name: bob.name, email: bob.email });

  // Team Leads
  const carolPassword = await hashPassword('Password123!');
  const carol = await prisma.user.create({
    data: {
      name: 'Carol Williams',
      email: 'carol@example.com',
      passwordHash: carolPassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=carol',
      role: 'TeamLead',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: carol.id, name: carol.name, email: carol.email });

  const davidPassword = await hashPassword('Password123!');
  const david = await prisma.user.create({
    data: {
      name: 'David Johnson',
      email: 'david@example.com',
      passwordHash: davidPassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=david',
      role: 'TeamLead',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: david.id, name: david.name, email: david.email });

  const emmaPassword = await hashPassword('Password123!');
  const emma = await prisma.user.create({
    data: {
      name: 'Emma Brown',
      email: 'emma@example.com',
      passwordHash: emmaPassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=emma',
      role: 'TeamLead',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: emma.id, name: emma.name, email: emma.email });

  // Members
  const frankPassword = await hashPassword('Password123!');
  const frank = await prisma.user.create({
    data: {
      name: 'Frank Miller',
      email: 'frank@example.com',
      passwordHash: frankPassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=frank',
      role: 'Member',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: frank.id, name: frank.name, email: frank.email });

  const gracePassword = await hashPassword('Password123!');
  const grace = await prisma.user.create({
    data: {
      name: 'Grace Lee',
      email: 'grace@example.com',
      passwordHash: gracePassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=grace',
      role: 'Member',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: grace.id, name: grace.name, email: grace.email });

  const henryPassword = await hashPassword('Password123!');
  const henry = await prisma.user.create({
    data: {
      name: 'Henry Wilson',
      email: 'henry@example.com',
      passwordHash: henryPassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=henry',
      role: 'Member',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: henry.id, name: henry.name, email: henry.email });

  const ivyPassword = await hashPassword('Password123!');
  const ivy = await prisma.user.create({
    data: {
      name: 'Ivy Martinez',
      email: 'ivy@example.com',
      passwordHash: ivyPassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=ivy',
      role: 'Member',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: ivy.id, name: ivy.name, email: ivy.email });

  const jackPassword = await hashPassword('Password123!');
  const jack = await prisma.user.create({
    data: {
      name: 'Jack Davis',
      email: 'jack@example.com',
      passwordHash: jackPassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=jack',
      role: 'Member',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: jack.id, name: jack.name, email: jack.email });

  const katePassword = await hashPassword('Password123!');
  const kate = await prisma.user.create({
    data: {
      name: 'Kate Taylor',
      email: 'kate@example.com',
      passwordHash: katePassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=kate',
      role: 'Member',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: kate.id, name: kate.name, email: kate.email });

  // Viewers
  const liamPassword = await hashPassword('Password123!');
  const liam = await prisma.user.create({
    data: {
      name: 'Liam Anderson',
      email: 'liam@example.com',
      passwordHash: liamPassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=liam',
      role: 'Guest',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: liam.id, name: liam.name, email: liam.email });

  const miaPassword = await hashPassword('Password123!');
  const mia = await prisma.user.create({
    data: {
      name: 'Mia Thomas',
      email: 'mia@example.com',
      passwordHash: miaPassword,
      avatarUrl: 'https://i.pravatar.cc/150?u=mia',
      role: 'Guest',
      emailVerified: true,
      createdAt: now(),
      updatedAt: now()
    }
  });
  users.push({ id: mia.id, name: mia.name, email: mia.email });

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
    const created = await prisma.team.create({
      data: {
        name: team.name,
        icon: team.icon
      }
    });
    teams.push({ id: created.id, name: created.name, icon: created.icon });
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
    await prisma.teamMember.create({
      data: {
        teamId: engineeringTeam.id,
        userId: user.id
      }
    }).catch(() => { }); // Ignore duplicates
  }

  // Design Team (David is lead) - admins + 3 other members
  const designTeam = teams[1];
  const designMembers = [users[0], users[1], users[3], users[6], users[7]]; // Alice, Bob, David + others
  for (const user of designMembers) {
    await prisma.teamMember.create({
      data: {
        teamId: designTeam.id,
        userId: user.id
      }
    }).catch(() => { });
  }

  // Product Team (Emma is lead) - admins + 4 other members
  const productTeam = teams[2];
  const productMembers = [users[0], users[1], users[4], users[5], users[9]]; // Alice, Bob, Emma + others
  for (const user of productMembers) {
    await prisma.teamMember.create({
      data: {
        teamId: productTeam.id,
        userId: user.id
      }
    }).catch(() => { });
  }

  // Marketing Team - admins + 2 other members
  const marketingTeam = teams[3];
  const marketingMembers = [users[0], users[1], users[5], users[11]]; // Alice, Bob + others
  for (const user of marketingMembers) {
    await prisma.teamMember.create({
      data: {
        teamId: marketingTeam.id,
        userId: user.id
      }
    }).catch(() => { });
  }

  console.log(`    ✅ Added team members`);

  // Helper function to get team members for a project
  function projectTeamsMembers(projectId: string): any[] {
    const project = projects.find((p: any) => p.id === projectId);
    if (project?.teamId === engineeringTeam.id) return engineeringMembers;
    if (project?.teamId === designTeam.id) return designMembers;
    if (project?.teamId === productTeam.id) return productMembers;
    return users;
  }

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
    const created = await prisma.project.create({
      data: {
        name: p.name,
        identifier: p.identifier.toLowerCase(),
        icon: p.icon,
        teamId: engineeringTeam.id,
        description: p.description,
        isPublic: false,
        leadId: users[2].id,
        startDate: daysAgo(30),
        targetDate: daysAgo(-30),
        createdAt: now(),
        updatedAt: now()
      }
    });
    projects.push({ id: created.id, ...p, teamId: engineeringTeam.id, leadId: users[2].id });
  }

  // Design Projects
  const designProjects = [
    { name: 'Brand Refresh', identifier: 'BRD', icon: '🎨', description: 'Update visual identity across all touchpoints' },
    { name: 'Mobile App Design', identifier: 'MOB', icon: '📱', description: 'Design new mobile application interface' },
  ];

  for (const p of designProjects) {
    const created = await prisma.project.create({
      data: {
        name: p.name,
        identifier: p.identifier.toLowerCase(),
        icon: p.icon,
        teamId: designTeam.id,
        description: p.description,
        isPublic: false,
        leadId: users[3].id,
        startDate: daysAgo(20),
        targetDate: daysAgo(-20),
        createdAt: now(),
        updatedAt: now()
      }
    });
    projects.push({ id: created.id, ...p, teamId: designTeam.id, leadId: users[3].id });
  }

  // Product Projects
  const productProjects = [
    { name: 'Feature Launch Q1', identifier: 'Q1F', icon: '🚀', description: 'Quarter 1 feature releases and improvements' },
    { name: 'User Onboarding', identifier: 'ONB', icon: '👋', description: 'Improve new user experience and onboarding flow' },
  ];

  for (const p of productProjects) {
    const created = await prisma.project.create({
      data: {
        name: p.name,
        identifier: p.identifier.toLowerCase(),
        icon: p.icon,
        teamId: productTeam.id,
        description: p.description,
        isPublic: false,
        leadId: users[4].id,
        startDate: daysAgo(15),
        targetDate: daysAgo(-15),
        createdAt: now(),
        updatedAt: now()
      }
    });
    projects.push({ id: created.id, ...p, teamId: productTeam.id, leadId: users[4].id });
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
      { title: 'Implement authentication system', description: 'OAuth integration with multiple providers', status: 'InProgress', priority: 'Urgent', hasSubtasks: true },
      { title: 'Build dashboard layout', description: 'Create responsive grid layout for main dashboard', status: 'InProgress', priority: 'High', hasSubtasks: true },
      { title: 'Add dark mode support', description: 'Implement theme switching functionality', status: 'Todo', priority: 'Medium', hasSubtasks: false },
      { title: 'Performance optimization', description: 'Analyze and fix performance bottlenecks', status: 'Backlog', priority: 'Medium', hasSubtasks: true },
      { title: 'Write unit tests', description: 'Achieve 80% code coverage', status: 'Todo', priority: 'Medium', hasSubtasks: false },
      { title: 'Documentation', description: 'Write technical documentation for API', status: 'Backlog', priority: 'Low', hasSubtasks: false },
      { title: 'Security audit', description: 'Review code for security vulnerabilities', status: 'Backlog', priority: 'Urgent', hasSubtasks: false },
    ],
    'API': [
      { title: 'Profile API endpoints', description: 'Identify slowest endpoints', status: 'Done', priority: 'High', hasSubtasks: true },
      { title: 'Implement caching layer', description: 'Add Redis caching for frequently accessed data', status: 'InProgress', priority: 'High', hasSubtasks: true },
      { title: 'Database query optimization', description: 'Add indexes and optimize complex queries', status: 'InReview', priority: 'High', hasSubtasks: false },
      { title: 'Load balancing setup', description: 'Configure load balancer for horizontal scaling', status: 'Todo', priority: 'Medium', hasSubtasks: false },
      { title: 'Monitor response times', description: 'Set up APM and alerting', status: 'Backlog', priority: 'Low', hasSubtasks: false },
    ],
    'DBM': [
      { title: 'Create migration scripts', description: 'Write SQL scripts for data transfer', status: 'Done', priority: 'Urgent', hasSubtasks: true },
      { title: 'Set up new database servers', description: 'Provision and configure production database', status: 'Done', priority: 'Urgent', hasSubtasks: false },
      { title: 'Data validation', description: 'Verify data integrity after migration', status: 'InProgress', priority: 'Urgent', hasSubtasks: true },
      { title: 'Rollback plan', description: 'Document rollback procedures', status: 'Todo', priority: 'High', hasSubtasks: false },
    ],
    'BRD': [
      { title: 'Competitor analysis', description: 'Research competitor branding strategies', status: 'Done', priority: 'Medium', hasSubtasks: false },
      { title: 'Create mood board', description: 'Visual exploration of brand directions', status: 'Done', priority: 'High', hasSubtasks: false },
      { title: 'Design new logo', description: 'Create logo variations and mockups', status: 'InReview', priority: 'High', hasSubtasks: true },
      { title: 'Update color palette', description: 'Define new brand colors and gradients', status: 'Todo', priority: 'Medium', hasSubtasks: false },
      { title: 'Create style guide', description: 'Document brand usage guidelines', status: 'Backlog', priority: 'Medium', hasSubtasks: false },
    ],
    'MOB': [
      { title: 'User research interviews', description: 'Conduct user interviews for mobile needs', status: 'Done', priority: 'High', hasSubtasks: false },
      { title: 'Wireframe all screens', description: 'Create low-fidelity wireframes', status: 'Done', priority: 'High', hasSubtasks: true },
      { title: 'Design high-fidelity mockups', description: 'Create pixel-perfect designs', status: 'InProgress', priority: 'High', hasSubtasks: true },
      { title: 'Prototype interactions', description: 'Build interactive prototype for testing', status: 'Todo', priority: 'Medium', hasSubtasks: false },
      { title: 'Handoff to development', description: 'Prepare design assets and specifications', status: 'Backlog', priority: 'Medium', hasSubtasks: false },
    ],
    'Q1F': [
      { title: 'Feature requirements gathering', description: 'Collect and prioritize feature requests', status: 'Done', priority: 'High', hasSubtasks: false },
      { title: 'Create product roadmap', description: 'Plan feature release schedule', status: 'Done', priority: 'High', hasSubtasks: false },
      { title: 'Beta testing program', description: 'Set up and manage beta testing', status: 'InProgress', priority: 'High', hasSubtasks: true },
      { title: 'Launch marketing materials', description: 'Prepare launch announcements and content', status: 'Todo', priority: 'Medium', hasSubtasks: false },
    ],
    'ONB': [
      { title: 'User journey mapping', description: 'Map current onboarding experience', status: 'Done', priority: 'Medium', hasSubtasks: false },
      { title: 'Design onboarding flow', description: 'Create improved onboarding screens', status: 'InProgress', priority: 'High', hasSubtasks: true },
      { title: 'A/B testing setup', description: 'Prepare experiments for onboarding variants', status: 'Todo', priority: 'Medium', hasSubtasks: false },
      { title: 'Analytics integration', description: 'Track onboarding funnel metrics', status: 'Backlog', priority: 'Low', hasSubtasks: false },
    ],
  };

  for (const project of projects) {
    const templates = issueTemplates[project.identifier] || [];
    for (const template of templates) {
      const identifier = `${project.identifier}-${String(issueCounter).padStart(3, '0')}`;
      issueCounter++;

      const dueDate = daysAgo(Math.floor(Math.random() * 20) - 10);

      const issue = await prisma.issue.create({
        data: {
          identifier,
          title: template.title,
          description: template.description,
          status: template.status as any,
          priority: template.priority as any,
          projectId: project.id,
          startDate: daysAgo(14),
          dueDate,
          createdAt: now(),
          updatedAt: now()
        }
      });

      // Add assignees (1-3 random team members)
      const teamMemberIds = project.teamId === engineeringTeam.id ? engineeringMembers.map((u: any) => u.id)
        : project.teamId === designTeam.id ? designMembers.map((u: any) => u.id)
          : productMembers.map((u: any) => u.id);
      const assignees = randomSubarray(teamMemberIds, 1, 3);

      for (const assigneeId of assignees) {
        await prisma.issueAssignee.create({
          data: {
            issueId: issue.id,
            userId: assigneeId
          }
        }).catch(() => { });
      }

      issues.push({ id: issue.id, identifier, ...template, projectId: project.id, assigneeIds: assignees, dueDate });

      // Create sub-issues if template has subtasks
      if (template.hasSubtasks) {
        const subtaskCount = Math.floor(Math.random() * 3) + 2; // 2-4 subtasks
        for (let i = 0; i < subtaskCount; i++) {
          const subIdentifier = `${project.identifier}-${String(issueCounter).padStart(3, '0')}`;
          issueCounter++;

          const subtaskTitles = [
            'Research and planning', 'Implementation phase 1', 'Implementation phase 2',
            'Testing and QA', 'Documentation', 'Code review', 'Deployment preparation'
          ];
          const subtaskTitle = subtaskTitles[i % subtaskTitles.length] ?? 'Subtask';

          const subIssue = await prisma.issue.create({
            data: {
              identifier: subIdentifier,
              title: subtaskTitle,
              description: `Subtask for: ${template.title}`,
              status: random(statuses.slice(0, 5)) as any,
              priority: random(priorities) as any,
              projectId: project.id,
              parentId: issue.id,
              createdAt: now(),
              updatedAt: now()
            }
          });

          // Assign subtask to 1-2 people
          const subAssignees = randomSubarray(teamMemberIds, 1, 2);
          for (const assigneeId of subAssignees) {
            await prisma.issueAssignee.create({
              data: {
                issueId: subIssue.id,
                userId: assigneeId
              }
            }).catch(() => { });
          }

          issues.push({ id: subIssue.id, identifier: subIdentifier, title: subtaskTitle, projectId: project.id, parentId: issue.id });
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
        const author = random(teamMembers);
        const content = random(commentTemplates);

        const comment = await prisma.comment.create({
          data: {
            content,
            issueId: issue.id,
            userId: author.id,
            createdAt: daysAgo(Math.floor(Math.random() * 10))
          }
        });

        comments.push({ id: comment.id, content, issueId: issue.id, userId: author.id });
        commentCount++;
      }
    }
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
      const mentionedUser = users.find((u: any) => u.name === mentionedName);

      if (mentionedUser && mentionedUser.id !== comment.userId) {
        issues.find((i: any) => i.id === comment.issueId);
        const actor = users.find((u: any) => u.id === comment.userId);

        const notif = await prisma.notification.create({
          data: {
            userId: mentionedUser.id,
            type: 'mention',
            message: `${actor?.name || 'Someone'} mentioned you in a comment`,
            issueId: comment.issueId,
            isRead: false,
            actorId: comment.userId,
            createdAt: daysAgo(Math.floor(Math.random() * 5))
          }
        });

        mentionNotifications.push({ id: notif.id, userId: mentionedUser.id, issueId: comment.issueId });
      }
    }
  }

  // Create due date notifications for issues due soon
  for (const issue of issues.filter((i: any) => i.dueDate)) {
    if (issue.assigneeIds && issue.assigneeIds.length > 0) {
      for (const assigneeId of issue.assigneeIds) {
        // Randomly assign some as due date notifications
        if (Math.random() > 0.7) {
          const notif = await prisma.notification.create({
            data: {
              userId: assigneeId,
              type: 'dueDate',
              message: `Issue "${issue.title}" is due soon`,
              issueId: issue.id,
              isRead: false,
              createdAt: daysAgo(Math.floor(Math.random() * 2))
            }
          });

          dueDateNotifications.push({ id: notif.id, userId: assigneeId, issueId: issue.id });
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
    projects.find((p: any) => p.id === issue.projectId);
    const teamMembers = projectTeamsMembers(issue.projectId);
    const numActivities = Math.floor(Math.random() * 3) + 1; // 1-3 activities per issue

    for (let i = 0; i < numActivities; i++) {
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

      await prisma.activity.create({
        data: {
          userId: actor.id,
          type: activityType,
          projectId: issue.projectId,
          issueId: issue.id,
          entityTitle: issue.title,
          description,
          createdAt: daysAgo(Math.floor(Math.random() * 14))
        }
      });

      activityCount++;
    }
  }

  console.log(`    ✅ Created ${activityCount} activities`);

  // Disconnect Prisma
  await prisma.$disconnect();

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
  console.log('   Administrator: alice@example.com');
  console.log('   TeamLead: carol@example.com (Engineering)');
  console.log('   TeamLead: david@example.com (Design)');
  console.log('   TeamLead: emma@example.com (Product)');
  console.log('   Member: frank@example.com');
  console.log('   Guest: liam@example.com');
  console.log('');
}

// Run the seed function
seedDatabase().catch(console.error);
