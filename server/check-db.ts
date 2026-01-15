import { getDatabase } from './database.js';

async function checkDatabase() {
  const db = await getDatabase();

  console.log('=== USERS ===');
  const users = await db.getAllUsers();
  console.log(`Total users: ${users.length}`);
  users.forEach((u: any) => {
    console.log(`- ${u.name} (${u.email}) - ${u.role}`);
  });

  console.log('\n=== TEAMS ===');
  const teams = await db.getAllTeams();
  console.log(`Total teams: ${teams.length}`);
  teams.forEach((t: any) => {
    console.log(`- ${t.name} (${t.icon})`);
  });

  console.log('\n=== TEAM MEMBERS ===');
  const members = (db as any).all('SELECT tm.team_id, tm.user_id, t.name as team_name, u.name as user_name FROM team_members tm JOIN teams t ON tm.team_id = t.id JOIN users u ON tm.user_id = u.id', []);
  console.log(`Total team memberships: ${members.length}`);
  members.forEach((m: any) => {
    console.log(`- ${m.user_name} in ${m.team_name}`);
  });

  console.log('\n=== PROJECTS ===');
  const projects = await db.getAllProjects();
  console.log(`Total projects: ${projects.length}`);
  projects.forEach((p: any) => {
    console.log(`- ${p.name} (${p.identifier})`);
  });

  process.exit(0);
}

checkDatabase().catch(console.error);
