# Seed Mock Data Design for Linear Clone

**Date:** 2025-01-15
**Status:** Design Approved
**Author:** Claude (via brainstorming skill)

## Overview

This document describes the comprehensive mock data seeding strategy for the Linear Clone application. The data will showcase a fully functional full-service digital agency called "Neo Digital" based in Indonesia.

## Agency Profile

**Name:** Neo Digital
**Type:** Full-Service Digital Agency
**Focus:** Web development, mobile apps, branding, marketing

## Admin User

| Field | Value |
|-------|-------|
| Name | Rengga Putra |
| Email | rengga@neodigital.co.id |
| Password | Pen16paght! (hashed with bcrypt) |
| Role | Admin |

## Team Structure

### Team 1: Engineering (⚙️ ENG)

| Role | Name |
|------|------|
| Lead | Budi Santoso |
| Member | Andi Pratama |
| Member | Siti Rahayu |
| Member | Rina Wijaya |
| Guest | Eko Kusumo (External contractor) |
| Viewer | Ahmad Hidayat (Client stakeholder) |

### Team 2: Design (🎨 DES)

| Role | Name |
|------|------|
| Lead | Maya Putri |
| Member | Dian Permata |
| Member | Fajar Nugraha |
| Guest | Larasati Dewi (Freelance designer) |
| Viewer | Bambang Sutrisno (Client stakeholder) |

### Team 3: Marketing (📈 MKT)

| Role | Name |
|------|------|
| Lead | Hendra Gunawan |
| Member | Linda Kusuma |
| Member | Dedi Prasetyo |
| Member | Wulan Sari |
| Guest | Rina Melati (Marketing consultant) |
| Viewer | Joko Widodo (Client stakeholder) |

## Projects

### Engineering Projects

**ENG-1: Website E-Commerce Tokopedia Clone**
- Lead: Budi Santoso
- Status: Active with many issues
- Public: Yes (slug: `tokopedia-clone`)
- Target: 2025-02-15

**ENG-2: Aplikasi Mobile GoJek**
- Lead: Andi Pratama
- Status: In development
- Public: No
- Target: 2025-03-30

### Design Projects

**DES-1: Rebranding Traveloka**
- Lead: Maya Putri
- Status: Ongoing
- Public: Yes (slug: `traveloka-rebrand`)
- Target: 2025-02-28

**DES-2: UI/UX Aplikasi Banking**
- Lead: Dian Permata
- Status: Early stage
- Public: No
- Target: 2025-04-15

### Marketing Projects

**MKT-1: Campaign Launch Startup**
- Lead: Hendra Gunawan
- Status: Active
- Public: Yes (slug: `startup-launch`)
- Target: 2025-01-30 (near due date)

**MKT-2: SEO & Content Strategy**
- Lead: Linda Kusuma
- Status: Ongoing
- Public: No
- Target: 2025-03-01

## Issue Distribution

### Per Project (8-12 issues each)

**Status Distribution:**
- 2-3 Backlog
- 2-3 Todo
- 2-3 In Progress
- 1-2 In Review
- 2 Done
- 0-1 Canceled

**Priority Distribution:**
- 1-2 Urgent
- 2-3 High
- 3-4 Medium
- 2-3 Low
- 1-2 No Priority

### Issue Types by Team

**Engineering:**
- Backend API development
- Frontend component implementation
- Database schema changes
- Bug fixes (critical, high, medium)
- Code review tasks
- Performance optimization
- Security fixes
- Third-party integrations
- Testing & QA
- Documentation

**Design:**
- Logo redesign concepts
- Design system components
- UI mockups
- User research & testing
- Brand guidelines
- Illustration/asset creation
- Prototype testing
- Design reviews

**Marketing:**
- Social media campaigns
- Blog posts
- Email newsletters
- Ad copy
- Analytics reports
- Influencer outreach
- Event planning
- SEO research

### Relationships

- **Parent-Child:** 1-2 parent issues per project with 2-3 subtasks each
- **Dependencies:** ~15-20 blocking relationships between issues
- **Assignees:** Multiple assignees per issue (many-to-many)

## Collaboration Features

### Comments with @Mentions

**Distribution:**
- 0-5 comments per issue
- ~60% of issues have at least one comment
- In Progress issues have more comments (active discussion)
- Done issues have resolution comments

**Mention Patterns:**
- Team leads for approvals
- Assignees for questions
- Cross-team collaboration
- Stakeholder updates

**Sample Comments (Bahasa Indonesia):**
- "@Budi Santoso tolong review ya, ini blocking task frontend"
- "Sudah fix bug di API, coba test lagi @Siti Rahayu"
- "@Eko Kusumo bisa bantu jelasin requirement ini?"
- "Deploy ke staging sudah berhasil ✅"
- "@Ahmad Hidayat update: progress 80%, on track untuk target tanggal 15"

### Notifications

**Types:**
- **Mention:** Created on @mention in comments
- **Due Date:** Auto-generated for issues due today

**Distribution:**
- 5-15 notifications per user
- Mix of read/unread
- Recent notifications mostly unread
- Due date notifications for today's issues

**Sample Notifications:**
- "Budi Santoso mentioned you in ENG-42: Fix bug login"
- "Issue ENG-15 is due today"
- "Maya Putri mentioned you in DES-8: Review mockup homepage"

## Data Summary

| Entity | Count |
|--------|-------|
| Users | 20 |
| Teams | 3 |
| Projects | 7 |
| Issues | ~70-80 |
| Comments | ~150-200 |
| Notifications | ~100-150 |
| Activities | ~50-75 |
| Issue Assignees | ~150-200 |
| Dependencies | ~15-20 |

## Technical Notes

### Password Handling
- Admin password: `Pen16paght!` (hashed)
- Default user password: `password123` (hashed)
- Uses bcrypt hashing (same as production)

### Timestamps
- Created dates: Spread over last 3 months
- Updated dates: Recent activity within last week
- Due dates: Past (overdue), today, and future

### Language
- All content in Bahasa Indonesia
- User names are Indonesian names
- Comments and descriptions use natural Indonesian language

## Implementation Notes

The seed script will:
1. Clear existing data (optional with flag)
2. Create all entities in correct order (respecting foreign keys)
3. Generate IDs using the same pattern as production
4. Hash passwords using bcrypt
5. Create proper many-to-many relationships
6. Generate activities for audit trail
7. Generate notifications for mentions and due dates

## Success Criteria

After seeding:
- User can log in as Rengga Putra (admin)
- All teams visible with correct members
- All projects with proper issues
- Comments render with @mentions highlighted
- Notifications appear for appropriate users
- Activity log shows agency history
- Public slugs work for public projects
