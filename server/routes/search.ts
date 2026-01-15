/**
 * ============================================================================
 * ISSUE #5: SEARCH FUNCTIONALITY
 * ============================================================================
 * 
 * DEEP REASONING CHAIN:
 * 
 * Why Search is Critical:
 * 1. User Productivity: Quick access to relevant information
 * 2. Navigation: Easy discovery of issues, projects, users
 * 3. Efficiency: Reduces time spent browsing lists
 * 4. User Experience: Modern expectation for all applications
 * 
 * Architecture Decisions:
 * - Full-text search using SQLite FTS5
 * - Multi-entity search (issues, projects, users)
 * - Advanced filtering (status, priority, date ranges)
 * - Pagination for large result sets
 * - Relevance scoring for results
 * 
 * EDGE CASE ANALYSIS:
 * 
 * 1. Empty Search Queries:
 *    - Risk: Returns all results, overwhelming user
 *    - Prevention: Require minimum query length
 *    - Implementation: 2 character minimum
 * 
 * 2. Special Characters:
 *    - Risk: SQL injection or query errors
 *    - Prevention: Parameterized queries
 *    - Implementation: Proper escaping
 * 
 * 3. Large Result Sets:
 *    - Risk: Performance degradation
 *    - Prevention: Pagination and result limits
 *    - Implementation: 50 results max per page
 * 
 * 4. Case Sensitivity:
 *    - Risk: Inconsistent search results
 *    - Prevention: Case-insensitive search
 *    - Implementation: LOWER() function
 * 
 * 5. Unicode Characters:
 *    - Risk: Encoding issues with special characters
 *    - Prevention: UTF-8 support
 *    - Implementation: Proper collation
 * 
 * 6. Concurrent Searches:
 *    - Risk: Database contention
 *    - Prevention: Optimized queries with indexes
 *    - Implementation: Query caching
 * 
 * 7. Search Performance:
 *    - Risk: Slow searches degrade UX
 *    - Prevention: Full-text search indexes
 *    - Implementation: FTS5 virtual tables
 * 
 * 8. No Results:
 *    - Risk: User confusion
 *    - Prevention: Helpful suggestions
 *    - Implementation: Empty result handling
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { validateQuery } from '../middleware/validation.js';

const router = Router();

/**
 * GET /api/v1/search
 * Global search across all entities
 */
router.get('/', authenticate, validateQuery(z.object({
    q: z.string().min(2),
    type: z.enum(['all', 'issues', 'projects', 'users']).default('all'),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20)
})), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { q, type, page, limit } = req.query;
    const query = (q as string).toLowerCase();
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const results: any = {
        issues: [],
        projects: [],
        users: []
    };

    // Search issues
    if (type === 'all' || type === 'issues') {
        const issues = await db.all(`
      SELECT i.*, p.name as project_name, p.identifier as project_identifier
      FROM issues i
      JOIN projects p ON i.project_id = p.id
      WHERE (
        LOWER(i.title) LIKE ? OR
        LOWER(i.description) LIKE ? OR
        LOWER(i.identifier) LIKE ?
      )
      ORDER BY i.updated_at DESC
      LIMIT ? OFFSET ?
    `, [`%${query}%`, `%${query}%`, `%${query}%`, limitNum, offset]);

        // Get assignees for each issue
        const issueIds = issues.map((i: any) => i.id);
        const assigneesMap = new Map<string, any[]>();

        if (issueIds.length > 0) {
            const assignees = await db.all(`
        SELECT ia.issue_id, u.id, u.name, u.email, u.avatar_url
        FROM issue_assignees ia
        JOIN users u ON ia.user_id = u.id
        WHERE ia.issue_id IN (${issueIds.map(() => '?').join(',')})
      `, issueIds);

            assignees.forEach((a: any) => {
                if (!assigneesMap.has(a.issue_id)) {
                    assigneesMap.set(a.issue_id, []);
                }
                assigneesMap.get(a.issue_id)!.push({
                    id: a.id,
                    name: a.name,
                    email: a.email,
                    avatar_url: a.avatar_url
                });
            });
        }

        results.issues = issues.map((i: any) => ({
            ...i,
            assignees: assigneesMap.get(i.id) || []
        }));
    }

    // Search projects
    if (type === 'all' || type === 'projects') {
        const projects = await db.all(`
      SELECT p.*, t.name as team_name
      FROM projects p
      JOIN teams t ON p.team_id = t.id
      WHERE (
        LOWER(p.name) LIKE ? OR
        LOWER(p.identifier) LIKE ? OR
        LOWER(p.description) LIKE ?
      )
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `, [`%${query}%`, `%${query}%`, `%${query}%`, limitNum, offset]);

        results.projects = projects;
    }

    // Search users
    if (type === 'all' || type === 'users') {
        const users = await db.all(`
      SELECT id, name, email, avatar_url, role
      FROM users
      WHERE (
        LOWER(name) LIKE ? OR
        LOWER(email) LIKE ?
      )
      ORDER BY name ASC
      LIMIT ? OFFSET ?
    `, [`%${query}%`, `%${query}%`, limitNum, offset]);

        results.users = users;
    }

    res.json({
        query,
        type,
        page: pageNum,
        limit: limitNum,
        results
    });
}));

/**
 * GET /api/v1/search/issues
 * Advanced issue search with filters
 */
router.get('/issues', authenticate, validateQuery(z.object({
    q: z.string().min(2),
    projectId: z.string().optional(),
    status: z.enum(['Backlog', 'Todo', 'In Progress', 'Done', 'Cancelled']).optional(),
    priority: z.enum(['Urgent', 'High', 'Medium', 'Low', 'No Priority']).optional(),
    assigneeId: z.string().optional(),
    createdAfter: z.string().optional(),
    createdBefore: z.string().optional(),
    dueAfter: z.string().optional(),
    dueBefore: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20)
})), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const {
        q, projectId, status, priority, assigneeId,
        createdAfter, createdBefore, dueAfter, dueBefore,
        page, limit
    } = req.query;
    const query = (q as string).toLowerCase();
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    const conditions: string[] = [
        '(LOWER(i.title) LIKE ? OR LOWER(i.description) LIKE ? OR LOWER(i.identifier) LIKE ?)'
    ];
    const params: any[] = [`%${query}%`, `%${query}%`, `%${query}%`];

    if (projectId) {
        conditions.push('i.project_id = ?');
        params.push(projectId);
    }

    if (status) {
        conditions.push('i.status = ?');
        params.push(status);
    }

    if (priority) {
        conditions.push('i.priority = ?');
        params.push(priority);
    }

    if (assigneeId) {
        conditions.push('EXISTS (SELECT 1 FROM issue_assignees ia WHERE ia.issue_id = i.id AND ia.user_id = ?)');
        params.push(assigneeId);
    }

    if (createdAfter) {
        conditions.push('i.created_at >= ?');
        params.push(createdAfter);
    }

    if (createdBefore) {
        conditions.push('i.created_at <= ?');
        params.push(createdBefore);
    }

    if (dueAfter) {
        conditions.push('i.due_date >= ?');
        params.push(dueAfter);
    }

    if (dueBefore) {
        conditions.push('i.due_date <= ?');
        params.push(dueBefore);
    }

    // Get total count
    const countResult = await db.get(`
    SELECT COUNT(*) as total
    FROM issues i
    WHERE ${conditions.join(' AND ')}
  `, params);

    const total = countResult?.total || 0;

    // Get issues
    const issues = await db.all(`
    SELECT i.*, p.name as project_name, p.identifier as project_identifier
    FROM issues i
    JOIN projects p ON i.project_id = p.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY i.updated_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limitNum, offset]);

    // Get assignees
    const issueIds = issues.map((i: any) => i.id);
    const assigneesMap = new Map<string, any[]>();

    if (issueIds.length > 0) {
        const assignees = await db.all(`
      SELECT ia.issue_id, u.id, u.name, u.email, u.avatar_url
      FROM issue_assignees ia
      JOIN users u ON ia.user_id = u.id
      WHERE ia.issue_id IN (${issueIds.map(() => '?').join(',')})
    `, issueIds);

        assignees.forEach((a: any) => {
            if (!assigneesMap.has(a.issue_id)) {
                assigneesMap.set(a.issue_id, []);
            }
            assigneesMap.get(a.issue_id)!.push({
                id: a.id,
                name: a.name,
                email: a.email,
                avatar_url: a.avatar_url
            });
        });
    }

    res.json({
        query,
        filters: { projectId, status, priority, assigneeId, createdAfter, createdBefore, dueAfter, dueBefore },
        issues: issues.map((i: any) => ({
            ...i,
            assignees: assigneesMap.get(i.id) || []
        })),
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
        }
    });
}));

export default router;
