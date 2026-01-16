import { getDatabase } from './database.ts';

const db = await getDatabase();

const now = () => new Date().toISOString();
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

// Get all users
console.log('\n=== ALL USERS ===');
const users = await db.getAllUsers();
for (const user of users) {
  console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
}

// Get the admin user
const admin = await db.getUserByEmail('rengga@neodigital.co.id');
if (!admin) {
  console.log('\n❌ User rengga@neodigital.co.id not found!');
  process.exit(1);
}

// Make user an administrator (correct role name)
await db.updateUser(admin.id, { role: 'Administrator' });
console.log(`\n✅ Updated ${admin.email} role to Administrator`);

// Get all teams
console.log('\n=== ALL TEAMS ===');
let teams = await db.getAllTeams();

if (teams.length === 0) {
  console.log('⚠️  No teams found! Creating default teams...');

  const teamData = [
    { name: 'Engineering', icon: '⚙️' },
    { name: 'Design', icon: '🎨' },
    { name: 'Product', icon: '📦' },
    { name: 'Marketing', icon: '📢' },
  ];

  for (const team of teamData) {
    const id = crypto.randomUUID();
    await db.run(
      'INSERT INTO teams (id, name, icon, created_at) VALUES (?, ?, ?, ?)',
      [id, team.name, team.icon, now()]
    );
    console.log(`✅ Created team: ${team.name} ${team.icon}`);
  }

  // Save teams to disk
  (db as any).save();
  teams = await db.getAllTeams();
}

for (const team of teams) {
  console.log(`- ${team.name} (ID: ${team.id})`);
  const members = await db.getTeamMembers(team.id);
  console.log(`  Members: ${members.map(m => m.email).join(', ') || 'No members'}`);
}

console.log('\n=== ASSIGNING ADMIN TO ALL TEAMS ===');

// Assign user to all teams
for (const team of teams) {
  await db.addTeamMember(team.id, admin.id);
  console.log(`✅ Added ${admin.email} to team: ${team.name}`);
}

// Check if projects exist
console.log('\n=== ALL PROJECTS ===');
let projects = await db.getAllProjects();

if (projects.length === 0) {
  console.log('⚠️  No projects found! Creating default projects...');

  const engineeringTeam = teams.find(t => t.name === 'Engineering') || teams[0];
  const designTeam = teams.find(t => t.name === 'Design') || teams[1];
  const productTeam = teams.find(t => t.name === 'Product') || teams[2];

  const projectData = [
    { name: 'Platform Redesign', identifier: 'PLT', icon: '🚀', description: 'Complete overhaul of the core platform architecture', team: engineeringTeam },
    { name: 'Brand Refresh', identifier: 'BRD', icon: '🎨', description: 'Update visual identity across all touchpoints', team: designTeam },
    { name: 'Feature Launch Q1', identifier: 'Q1F', icon: '🚀', description: 'Quarter 1 feature releases and improvements', team: productTeam },
  ];

  for (const p of projectData) {
    const id = crypto.randomUUID();
    await db.run(
      `INSERT INTO projects (id, name, identifier, icon, team_id, description, lead_id, start_date, target_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, p.name, p.identifier, p.icon, p.team.id, p.description, admin.id, daysAgo(30), daysAgo(-30), now(), now()]
    );
    console.log(`✅ Created project: ${p.name} (${p.identifier})`);
  }

  // Save projects to disk
  (db as any).save();
  projects = await db.getAllProjects();
}

for (const project of projects) {
  const team = teams.find(t => t.id === project.team_id);
  console.log(`- ${project.name} (${project.identifier}) in team: ${team?.name || 'Unknown'}`);
}

// Check if issues exist
console.log('\n=== ALL ISSUES ===');
let issues = await db.getAllIssues();

if (issues.length === 0) {
  console.log('⚠️  No issues found! Creating sample issues...');

  const statuses = ['Backlog', 'Todo', 'In Progress', 'In Review', 'Done', 'Canceled'];
  const priorities = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'];

  let issueCounter = 1;
  for (const project of projects) {
    const sampleIssues = [
      { title: 'Set up project structure', description: 'Initialize repository and configure build tools', status: 'Done', priority: 'High' },
      { title: 'Design core components', description: 'Define reusable components and their relationships', status: 'In Progress', priority: 'High' },
      { title: 'Implement authentication', description: 'OAuth integration with multiple providers', status: 'Todo', priority: 'Urgent' },
      { title: 'Write documentation', description: 'Document API and component usage', status: 'Backlog', priority: 'Medium' },
    ];

    for (const issue of sampleIssues) {
      const id = crypto.randomUUID();
      const identifier = `${project.identifier}-${String(issueCounter).padStart(3, '0')}`;
      issueCounter++;

      await db.run(
        `INSERT INTO issues (id, identifier, title, description, status, priority, project_id, start_date, due_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, identifier, issue.title, issue.description, issue.status, issue.priority, project.id, daysAgo(14), daysAgo(7), now(), now()]
      );

      // Assign to admin
      await db.run('INSERT INTO issue_assignees (issue_id, user_id) VALUES (?, ?)', [id, admin.id]);
    }

    // Save issues for this project to disk
    (db as any).save();
  }

  issues = await db.getAllIssues();
}

console.log(`Total issues: ${issues.length}`);

console.log('\n=== SUMMARY ===');
console.log(`Total users: ${users.length}`);
console.log(`Total teams: ${teams.length}`);
console.log(`Total projects: ${projects.length}`);
console.log(`Total issues: ${issues.length}`);
console.log(`\n✅ ${admin.email} is now an Administrator and member of all ${teams.length} teams`);
console.log('✅ Workspace has been initialized with sample data');

process.exit(0);
