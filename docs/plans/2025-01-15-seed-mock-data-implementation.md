# Implementation Plan: Seed Mock Data

**Date:** 2025-01-15
**Status:** Ready for Implementation
**Design:** [Seed Mock Data Design](./2025-01-15-seed-mock-data-design.md)

## Overview

Create a comprehensive seed script that populates the Linear Clone database with realistic mock data for a digital agency called "Neo Digital" with Indonesian users and Bahasa Indonesia content.

## File Structure

```
server/
  seed/
    index.ts           # Main seed entry point
    users.ts           # User data generation
    teams.ts           # Team data generation
    projects.ts        # Project data generation
    issues.ts          # Issue data generation
    comments.ts        # Comment data with mentions
    notifications.ts   # Notification data generation
    activities.ts      # Activity log generation
    helpers.ts         # Utility functions (dates, IDs, etc.)
```

## Implementation Steps

### Step 1: Create Seed Directory and Helpers

**File:** `server/seed/helpers.ts`

```typescript
// Helper functions:
- generateId(prefix): Generate UUID-based IDs
- hashPassword(password): Hash passwords with bcrypt
- randomDate(start, end): Generate random timestamp within range
- randomItem<T>(array): Pick random item from array
- randomItems<T>(array, count): Pick multiple random items
- slugify(text): Convert text to URL-safe slug
```

### Step 2: Create Users

**File:** `server/seed/users.ts`

**Tasks:**
1. Define all 20 users with Indonesian names
2. Assign roles (Admin, Team Lead, Member, Guest, Viewer)
3. Generate avatar URLs based on names
4. Hash passwords (admin: `Pen16paght!`, others: `password123`)
5. Set created/updated timestamps

**Users to create:**
- 1 Admin: Rengga Putra
- 3 Team Leads: Budi Santoso, Maya Putri, Hendra Gunawan
- 9 Members spread across teams
- 3 Guests (external contractors/consultants)
- 3 Viewers (client stakeholders)
- 1 additional Admin/Member for testing

### Step 3: Create Teams

**File:** `server/seed/teams.ts`

**Tasks:**
1. Create 3 teams (Engineering, Design, Marketing)
2. Set team icons (⚙️, 🎨, 📈)
3. Generate team IDs

**Teams:**
- Engineering (ENG) - ⚙️
- Design (DES) - 🎨
- Marketing (MKT) - 📈

### Step 4: Create Team Memberships

**Tasks:**
1. Link users to teams via `team_members` table
2. Each user belongs to exactly one team
3. Admin (Rengga) not in any team_members (or add to all)

### Step 5: Create Projects

**File:** `server/seed/projects.ts`

**Tasks:**
1. Create 7 projects (2 per team + 1 extra)
2. Assign leads from team leads
3. Set descriptions in Bahasa Indonesia
4. Generate identifiers (ENG-1, ENG-2, DES-1, etc.)
5. Set public slugs for public projects
6. Set target dates (some past, some near, some future)

**Projects:**
- ENG-1: Website E-Commerce Tokopedia Clone
- ENG-2: Aplikasi Mobile GoJek
- DES-1: Rebranding Traveloka (public)
- DES-2: UI/UX Aplikasi Banking
- MKT-1: Campaign Launch Startup (public)
- MKT-2: SEO & Content Strategy

### Step 6: Create Issues

**File:** `server/seed/issues.ts`

**Tasks:**
1. Define issue templates for each team type
2. Create ~70-80 issues across all projects
3. Distribute statuses (Backlog, Todo, In Progress, In Review, Done, Canceled)
4. Distribute priorities (Urgent, High, Medium, Low, No Priority)
5. Set due dates (past, today, future)
6. Create parent-child relationships
7. Assign multiple users per issue
8. Create dependencies between issues

**Issue Templates:**

Engineering (ENG):
- Backend API endpoint development
- Frontend component implementation
- Database schema changes
- Bug fixes (Critical bug di login form)
- Code review tasks
- Performance optimization
- Security fixes
- Integration with payment gateway
- Unit testing untuk user module
- Dokumentasi API endpoint

Design (DES):
- Logo redesign concepts (3 opsi)
- Design system components (Button, Input)
- UI mockups untuk halaman checkout
- User research & testing (5 user interview)
- Brand guideline updates
- Illustration creation untuk onboarding
- Prototype testing di Figma
- Design review session dengan klien

Marketing (MKT):
- Social media campaign content (Instagram, LinkedIn)
- Blog post: "Tips Memilih Tech Stack"
- Email newsletter untuk Q1
- Ad copy untuk Google Ads
- Analytics report bulanan
- Influencer outreach (10 target)
- Event planning: Tech Talk Jakarta
- SEO keyword research

### Step 7: Create Issue Assignees

**Tasks:**
1. Link users to issues via `issue_assignees` table
2. Most issues have 1-2 assignees
3. Some issues have 3+ assignees (collaborative tasks)
4. Ensure all team members have at least one assignment

### Step 8: Create Issue Dependencies

**Tasks:**
1. Create 15-20 blocking relationships
2. Ensure logical dependencies (design → dev → review → deploy)
3. Avoid circular dependencies

### Step 9: Create Comments with Mentions

**File:** `server/seed/comments.ts`

**Tasks:**
1. Create 150-200 comments
2. 60% of issues have at least one comment
3. In Progress issues have more comments
4. Include @mentions of other users
5. Use natural Bahasa Indonesia language
6. Spread timestamps over last 3 months

**Comment Templates (Bahasa Indonesia):**
- "@Budi Santoso tolong review ya, ini blocking task frontend"
- "Sudah fix bug di API, coba test lagi @Siti Rahayu"
- "@Eko Kusumo bisa bantu jelasin requirement ini?"
- "Deploy ke staging sudah berhasil ✅"
- "Ada edge case yang perlu ditangin di sini @Andi Pratama"
- "@Ahmad Hidayat update: progress 80%, on track untuk target tanggal 15"
- "Saya buatkan PR, tolong review @Maya Putri"
- "Bug ini reproducible di Chrome tapi tidak di Firefox"
- "Scaling issue di product list, butuh pagination"
- "Design sudah approved klien, mulai coding bisa"

### Step 10: Create Notifications

**File:** `server/seed/notifications.ts`

**Tasks:**
1. Create 100-150 notifications
2. Parse comments to find @mentions
3. Create mention notifications for each @mention found
4. Create due date notifications for issues due today
5. Set is_read flag appropriately (recent = unread, old = read)
6. Distribute across all users (5-15 per user)

### Step 11: Create Activities

**File:** `server/seed/activities.ts`

**Tasks:**
1. Create activity log entries
2. Log issue creation
3. Log status changes (Todo → In Progress → Done)
4. Log comment creation
5. Log project creation
6. Set appropriate timestamps (spread over 3 months)

### Step 12: Main Seed Script

**File:** `server/seed/index.ts`

**Tasks:**
1. Initialize database connection
2. Clear existing data (with --force flag)
3. Call all seed modules in correct order (respect FKs)
4. Log progress and statistics
5. Handle errors gracefully

**Order of operations (respecting foreign keys):**
1. Users (no dependencies)
2. Teams (no dependencies)
3. Team members (depends on users, teams)
4. Projects (depends on teams, users)
5. Issues (depends on projects)
6. Issue assignees (depends on issues, users)
7. Issue dependencies (depends on issues)
8. Comments (depends on issues, users)
9. Activities (depends on users, projects, issues)
10. Notifications (depends on users, issues)

### Step 13: Update Package.json

**Tasks:**
1. Add `npm run seed` command
2. Add `npm run seed:force` command (clears data first)

**Commands:**
```json
"seed": "node --loader ts-node/esm server/seed/index.ts",
"seed:force": "node --loader ts-node/esm server/seed/index.ts --force"
```

### Step 14: Testing

**Tasks:**
1. Run seed script
2. Verify data in database using DB browser
3. Start application
4. Login as admin (rengga@neodigital.co.id / Pen16paght!)
5. Verify all teams visible
6. Verify projects with correct issue counts
7. Check comments render with @mentions
8. Verify notifications appear
9. Test public project slugs
10. Verify activity log

## Success Criteria

- [ ] All 20 users created with correct roles
- [ ] All 3 teams with correct members
- [ ] All 7 projects with correct leads and descriptions
- [ ] ~70-80 issues with proper status/priority distribution
- [ ] 150-200 comments with @mentions
- [ ] 100-150 notifications
- [ ] 50-75 activity entries
- [ ] All relationships valid (foreign keys)
- [ ] Admin can login and see all data
- [ ] Public slugs work correctly
- [ ] Bahasa Indonesia content throughout

## Edge Cases to Handle

1. **Mention parsing:** Handle usernames with spaces when scanning comments
2. **Circular dependencies:** Avoid creating circular issue dependencies
3. **Self-mentions:** Skip creating notifications when user mentions themselves
4. **Timestamp ordering:** Ensure comments have created_at ≤ issue's updated_at
5. **Unique constraints:** Ensure public_slug, email are unique
6. **Foreign key integrity:** Delete in correct order if clearing data

## Notes

- Use the existing database connection from `server/database.ts`
- Use the same bcrypt hashing as auth routes
- Follow existing ID generation patterns
- Use snake_case for database columns
- Ensure all dates are valid ISO strings
