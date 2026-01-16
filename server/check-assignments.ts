/**
 * Diagnostic script to identify invalid issue assignments:
 * 1. Issues assigned to users with Guest role
 * 2. Issues assigned to users who are not members of the team that owns the project
 */

import initSqlJs, { Database } from 'sql.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, './linear_clone.db');

async function runDiagnostics() {
  // Initialize sql.js
  const SQL = await initSqlJs();

  if (!existsSync(dbPath)) {
    console.error(`Database not found at: ${dbPath}`);
    process.exit(1);
  }

  // Load database
  const buffer = readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  console.log('='.repeat(60));
  console.log('DIAGNOSTIC: Invalid Issue Assignments');
  console.log('='.repeat(60));

  // Helper function to run queries
  function all(sql: string, params: string[] = []): any[] {
    const results: any[] = [];
    const stmt = db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  // Query 1: Find issues assigned to Guest users
  console.log('\n1. Issues assigned to users with GUEST role:');
  console.log('-'.repeat(60));

  const guestAssignments = all(`
    SELECT
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      u.role as user_role,
      i.id as issue_id,
      i.identifier as issue_identifier,
      i.title as issue_title,
      p.name as project_name,
      t.name as team_name,
      t.id as team_id
    FROM issue_assignees ia
    JOIN issues i ON ia.issue_id = i.id
    JOIN projects p ON i.project_id = p.id
    JOIN teams t ON p.team_id = t.id
    JOIN users u ON ia.user_id = u.id
    WHERE u.role = 'Guest'
    ORDER BY t.name, p.name, u.name
  `);

  if (guestAssignments.length === 0) {
    console.log('✅ No issues assigned to Guest users');
  } else {
    console.log(`Found ${guestAssignments.length} invalid assignments:\n`);
    for (const row of guestAssignments) {
      console.log(`  Team: ${row.team_name}`);
      console.log(`  Project: ${row.project_name}`);
      console.log(`  Issue: ${row.issue_identifier} - ${row.issue_title}`);
      console.log(`  Assigned to: ${row.user_name} (${row.user_email}) - ROLE: ${row.user_role}`);
      console.log('');
    }
  }

  // Query 2: Find issues assigned to users who are NOT members of the team
  console.log('\n2. Issues assigned to users OUTSIDE their workspace/team:');
  console.log('-'.repeat(60));

  const outsideTeamAssignments = all(`
    SELECT
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      u.role as user_role,
      i.id as issue_id,
      i.identifier as issue_identifier,
      i.title as issue_title,
      p.name as project_name,
      p.id as project_id,
      t.name as team_name,
      t.id as team_id
    FROM issue_assignees ia
    JOIN issues i ON ia.issue_id = i.id
    JOIN projects p ON i.project_id = p.id
    JOIN teams t ON p.team_id = t.id
    JOIN users u ON ia.user_id = u.id
    WHERE u.role != 'Guest'
      AND NOT EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = t.id AND tm.user_id = u.id
      )
    ORDER BY t.name, p.name, u.name
  `);

  if (outsideTeamAssignments.length === 0) {
    console.log('✅ All issues are assigned to team members within their workspace');
  } else {
    console.log(`Found ${outsideTeamAssignments.length} cross-team assignments:\n`);
    for (const row of outsideTeamAssignments) {
      console.log(`  Team: ${row.team_name}`);
      console.log(`  Project: ${row.project_name}`);
      console.log(`  Issue: ${row.issue_identifier} - ${row.issue_title}`);
      console.log(`  Assigned to: ${row.user_name} (${row.user_email}) - ROLE: ${row.user_role}`);
      console.log(`  ⚠️  User is NOT a member of team "${row.team_name}"`);
      console.log('');
    }
  }

  // Query 3: Find Team Leads for each team (for reassignment reference)
  console.log('\n3. Team Leads available for reassignment:');
  console.log('-'.repeat(60));

  const teamLeads = all(`
    SELECT
      t.id as team_id,
      t.name as team_name,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    JOIN users u ON tm.user_id = u.id
    WHERE u.role = 'Team Lead'
    ORDER BY t.name
  `);

  if (teamLeads.length === 0) {
    console.log('⚠️  WARNING: No Team Leads found in the system!');
    console.log('   Cannot reassign issues without Team Leads.');
  } else {
    console.log(`Found ${teamLeads.length} Team Lead(s):\n`);
    for (const row of teamLeads) {
      console.log(`  Team: ${row.team_name}`);
      console.log(`  Team Lead: ${row.user_name} (${row.user_email})`);
      console.log('');
    }
  }

  // Query 4: Check each team for orphaned issues (no Team Lead exists)
  console.log('\n4. Teams WITHOUT a Team Lead (need fallback):');
  console.log('-'.repeat(60));

  const allTeams = all(`
    SELECT
      t.id as team_id,
      t.name as team_name,
      COUNT(DISTINCT i.id) as issue_count
    FROM teams t
    LEFT JOIN projects p ON t.id = p.team_id
    LEFT JOIN issues i ON p.id = i.project_id
    GROUP BY t.id, t.name
    ORDER BY t.name
  `);

  const teamsWithLeads = new Set(teamLeads.map((tl: any) => tl.team_id));

  for (const team of allTeams) {
    if (!teamsWithLeads.has(team.team_id) && team.issue_count > 0) {
      console.log(`  Team: ${team.team_name}`);
      console.log(`  Issues: ${team.issue_count}`);
      console.log(`  ⚠️  No Team Lead found - need to find an Administrator or Member as fallback`);
      console.log('');
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('SUMMARY:');
  console.log(`  Guest assignments: ${guestAssignments.length}`);
  console.log(`  Cross-team assignments: ${outsideTeamAssignments.length}`);
  console.log(`  Total invalid assignments: ${guestAssignments.length + outsideTeamAssignments.length}`);
  console.log(`  Team Leads available: ${teamLeads.length}`);
  console.log('='.repeat(60));

  db.close();
}

runDiagnostics().catch(console.error);
