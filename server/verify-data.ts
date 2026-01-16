import { getDatabase } from './database.ts';

const db = await getDatabase();

// Get the admin user
const admin = await db.getUserByEmail('rengga@neodigital.co.id');
if (!admin) {
  console.log('❌ User rengga@neodigital.co.id not found!');
  process.exit(1);
}

console.log('=== USER INFO ===');
console.log(`User: ${admin.name} (${admin.email})`);
console.log(`ID: ${admin.id}`);
console.log(`Role: ${admin.role}`);

console.log('\n=== TEAMS ===');
const teams = await db.getAllTeams();
console.log(`Total teams: ${teams.length}`);

for (const team of teams) {
  const members = await db.getTeamMembers(team.id);
  const isMember = members.some(m => m.id === admin.id);
  console.log(`- ${team.name} ${team.icon}`);
  console.log(`  Members: ${members.map(m => m.email).join(', ')}`);
  console.log(`  Is ${admin.email} a member? ${isMember ? '✅ YES' : '❌ NO'}`);
}

console.log('\n=== PROJECTS ===');
const projects = await db.getAllProjects();
console.log(`Total projects: ${projects.length}`);

for (const project of projects) {
  const team = teams.find(t => t.id === project.team_id);
  console.log(`- ${project.name} (${project.identifier}) in team: ${team?.name || 'Unknown'}`);
}

console.log('\n=== ISSUES ===');
const issues = await db.getAllIssues();
console.log(`Total issues: ${issues.length}`);

// Group issues by project
const issuesByProject = new Map<string, typeof issues>();
for (const issue of issues) {
  if (!issuesByProject.has(issue.project_id)) {
    issuesByProject.set(issue.project_id, []);
  }
  issuesByProject.get(issue.project_id)!.push(issue);
}

for (const [projectId, projectIssues] of issuesByProject) {
  const project = projects.find(p => p.id === projectId);
  console.log(`\n${project?.name || projectId}:`);
  for (const issue of projectIssues) {
    const assignees = await db.getIssueAssignees(issue.id);
    const isAssigned = assignees.some(a => a.id === admin.id);
    console.log(`  - ${issue.identifier}: ${issue.title} [${issue.status}]`);
    console.log(`    Assigned to: ${assignees.map(a => a.email).join(', ') || 'None'}`);
    console.log(`    Is ${admin.email} assigned? ${isAssigned ? '✅ YES' : '❌ NO'}`);
  }
}

console.log('\n=== SUMMARY ===');
console.log(`✅ User ${admin.email} should now see:`);
console.log(`   - ${teams.length} teams`);
console.log(`   - ${projects.length} projects`);
console.log(`   - ${issues.length} issues`);

process.exit(0);
