/**
 * Migration script to fix invalid issue assignments:
 * 1. Remove assignments from Guest users
 * 2. Reassign those issues to Team Leads (or fallback to Admins/Members)
 *
 * Usage: npx tsx migrations/004_fix_guest_assignments.ts
 */

import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../linear_clone.db');

interface Reassignment {
  issueId: string;
  issueIdentifier: string;
  issueTitle: string;
  projectName: string;
  teamName: string;
  oldAssignee: string;
  newAssignee: string;
  newAssigneeRole: string;
}

async function runMigration() {
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
  console.log('MIGRATION: Fix Invalid Guest Assignments');
  console.log('='.repeat(60));

  // Helper functions
  function run(sql: string, params: any[] = []): any {
    return db.run(sql, params);
  }

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

  function get(sql: string, params: any[] = []): any {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  // Step 1: Find all Team Leads (and fallback users)
  console.log('\nStep 1: Finding Team Leads and fallback users...');
  console.log('-'.repeat(60));

  // Get Team Leads for each team
  const teamLeads = all(`
    SELECT
      t.id as team_id,
      t.name as team_name,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      u.role as user_role
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    JOIN users u ON tm.user_id = u.id
    WHERE u.role = 'Team Lead'
    ORDER BY t.name
  `);

  // Build a map of team_id -> team lead user_id
  const teamLeadMap = new Map<string, { id: string; name: string; email: string; role: string }>();
  for (const tl of teamLeads) {
    teamLeadMap.set(tl.team_id, {
      id: tl.user_id,
      name: tl.user_name,
      email: tl.user_email,
      role: tl.user_role
    });
  }

  // For teams without Team Leads, find fallback (Administrator or Member)
  const allTeams = all('SELECT id, name FROM teams ORDER BY name');
  const fallbackMap = new Map<string, { id: string; name: string; email: string; role: string }>();

  for (const team of allTeams) {
    if (!teamLeadMap.has(team.id)) {
      // Try to find an Administrator in this team
      const admin = get(`
        SELECT u.id, u.name, u.email, u.role
        FROM users u
        JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = ? AND u.role = 'Administrator'
        LIMIT 1
      `, [team.id]);

      if (admin) {
        fallbackMap.set(team.id, {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        });
        console.log(`  Team: ${team.name} → Fallback: ${admin.name} (${admin.role})`);
      } else {
        // Try to find a Member
        const member = get(`
          SELECT u.id, u.name, u.email, u.role
          FROM users u
          JOIN team_members tm ON u.id = tm.user_id
          WHERE tm.team_id = ? AND u.role = 'Member'
          LIMIT 1
        `, [team.id]);

        if (member) {
          fallbackMap.set(team.id, {
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role
          });
          console.log(`  Team: ${team.name} → Fallback: ${member.name} (${member.role})`);
        } else {
          console.log(`  Team: ${team.name} → ⚠️  NO VALID USER FOUND FOR REASSIGNMENT!`);
        }
      }
    } else {
      const lead = teamLeadMap.get(team.id)!;
      console.log(`  Team: ${team.name} → Team Lead: ${lead.name} (${lead.role})`);
    }
  }

  // Step 2: Find all invalid assignments
  console.log('\nStep 2: Finding invalid assignments...');
  console.log('-'.repeat(60));

  const invalidAssignments = all(`
    SELECT
      ia.issue_id,
      ia.user_id as guest_user_id,
      i.identifier as issue_identifier,
      i.title as issue_title,
      p.name as project_name,
      p.team_id,
      t.name as team_name,
      u.name as guest_name,
      u.email as guest_email
    FROM issue_assignees ia
    JOIN issues i ON ia.issue_id = i.id
    JOIN projects p ON i.project_id = p.id
    JOIN teams t ON p.team_id = t.id
    JOIN users u ON ia.user_id = u.id
    WHERE u.role = 'Guest'
    ORDER BY t.name, p.name, i.identifier
  `);

  console.log(`Found ${invalidAssignments.length} invalid assignments to fix.`);

  if (invalidAssignments.length === 0) {
    console.log('✅ No invalid assignments found. Nothing to do.');
    db.close();
    return;
  }

  // Step 3: Build reassignment plan
  console.log('\nStep 3: Building reassignment plan...');
  console.log('-'.repeat(60));

  const reassignments: Reassignment[] = [];
  const issueAssignmentsMap = new Map<string, string[]>(); // issue_id -> new assignee ids

  for (const ia of invalidAssignments) {
    // Get the target user (Team Lead or fallback)
    let targetUser = teamLeadMap.get(ia.team_id);
    if (!targetUser) {
      targetUser = fallbackMap.get(ia.team_id);
    }

    if (!targetUser) {
      console.log(`  ⚠️  Cannot reassign ${ia.issue_identifier} - No valid user for team ${ia.team_name}`);
      continue;
    }

    // Track reassignment
    reassignments.push({
      issueId: ia.issue_id,
      issueIdentifier: ia.issue_identifier,
      issueTitle: ia.issue_title,
      projectName: ia.project_name,
      teamName: ia.team_name,
      oldAssignee: `${ia.guest_name} (${ia.guest_email})`,
      newAssignee: targetUser.name,
      newAssigneeRole: targetUser.role
    });

    // Build map of issue -> new assignees (an issue can have multiple assignees)
    if (!issueAssignmentsMap.has(ia.issue_id)) {
      issueAssignmentsMap.set(ia.issue_id, []);
    }
    const assignees = issueAssignmentsMap.get(ia.issue_id)!;
    if (!assignees.includes(targetUser.id)) {
      assignees.push(targetUser.id);
    }
  }

  // Group by issue for cleaner display
  const uniqueIssues = new Map<string, Reassignment>();
  for (const r of reassignments) {
    const key = `${r.issueId}-${r.oldAssignee}`;
    uniqueIssues.set(key, r);
  }

  // Display sample of changes
  const sampleSize = Math.min(5, Array.from(uniqueIssues.values()).length);
  const sampleList = Array.from(uniqueIssues.values()).slice(0, sampleSize);
  for (const r of sampleList) {
    console.log(`  ${r.issueIdentifier}: ${r.oldAssignee} → ${r.newAssignee} (${r.newAssigneeRole})`);
  }
  if (uniqueIssues.size > sampleSize) {
    console.log(`  ... and ${uniqueIssues.size - sampleSize} more reassignments`);
  }

  // Step 4: Confirm before proceeding
  console.log('\nStep 4: Reassigning issues...');
  console.log('-'.repeat(60));

  let deletedCount = 0;
  let addedCount = 0;

  // First, delete all Guest assignments
  for (const ia of invalidAssignments) {
    run('DELETE FROM issue_assignees WHERE issue_id = ? AND user_id = ?', [ia.issue_id, ia.guest_user_id]);
    deletedCount++;
  }

  console.log(`  Deleted ${deletedCount} Guest assignments`);

  // Then, add new assignments (only if not already assigned)
  for (const [issueId, newAssigneeIds] of issueAssignmentsMap) {
    for (const newAssigneeId of newAssigneeIds) {
      // Check if already assigned (e.g., Team Lead was already assigned)
      const existing = get(
        'SELECT 1 FROM issue_assignees WHERE issue_id = ? AND user_id = ?',
        [issueId, newAssigneeId]
      );

      if (!existing) {
        run('INSERT INTO issue_assignees (issue_id, user_id) VALUES (?, ?)', [issueId, newAssigneeId]);
        addedCount++;
      }
    }
  }

  console.log(`  Added ${addedCount} new assignments to Team Leads/Admins/Members`);

  // Save database
  const data = db.export();
  const saveBuffer = Buffer.from(data);
  writeFileSync(dbPath, saveBuffer);
  console.log(`  Database saved to ${dbPath}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Invalid assignments found: ${invalidAssignments.length}`);
  console.log(`  Guest assignments removed: ${deletedCount}`);
  console.log(`  New assignments added: ${addedCount}`);
  console.log(`  Unique issues affected: ${issueAssignmentsMap.size}`);
  console.log('='.repeat(60));

  console.log('\n✅ Migration completed successfully!');

  db.close();
}

runMigration().catch(console.error);
