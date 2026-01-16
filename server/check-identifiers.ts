import { getDatabase } from './database.ts';

const db = await getDatabase();

// Check projects
const projects = await db.getAllProjects();
console.log('\n=== PROJECTS ===');
projects.forEach(p => {
  console.log(`  ${p.identifier}: ${p.name} (team: ${p.team_id})`);
});

// Check some issues
const issues = await db.getAllIssues();
console.log('\n=== FIRST 10 ISSUES ===');
issues.slice(0, 10).forEach(i => {
  console.log(`  ${i.identifier}: ${i.title}`);
});
