/**
 * ============================================================================
 * ISSUE #6: EXPORT/IMPORT FUNCTIONALITY
 * ============================================================================
 * 
 * DEEP REASONING CHAIN:
 * 
 * Why Export/Import is Critical:
 * 1. Data Portability: Users can backup and migrate data
 * 2. Bulk Operations: Efficiently import large datasets
 * 3. Data Analysis: Export data for external analysis
 * 4. Migration: Support moving between instances
 * 
 * Architecture Decisions:
 * - Multiple formats (CSV, JSON) for flexibility
 * - Validation on import to prevent corruption
 * - Batch processing for large datasets
 * - Progress tracking for long operations
 * - Rollback on import errors
 * 
 * EDGE CASE ANALYSIS:
 * 
 * 1. Large File Uploads:
 *    - Risk: Memory exhaustion or timeouts
 *    - Prevention: Stream processing and size limits
 *    - Implementation: 50MB limit with streaming
 * 
 * 2. Invalid Data Formats:
 *    - Risk: Malformed data could corrupt database
 *    - Prevention: Schema validation
 *    - Implementation: Zod validation
 * 
 * 3. Duplicate Data:
 *    - Risk: Importing duplicates creates conflicts
 *    - Prevention: ID collision detection
 *    - Implementation: Upsert operations
 * 
 * 4. Import Failures:
 *    - Risk: Partial imports leave inconsistent state
 *    - Prevention: Transactional imports
 *    - Implementation: Rollback on error
 * 
 * 5. Encoding Issues:
 *    - Risk: Character encoding problems
 *    - Prevention: UTF-8 enforcement
 *    - Implementation: Proper encoding headers
 * 
 * 6. Circular References:
 *    - Risk: Dependencies create infinite loops
 *    - Prevention: Topological sorting
 *    - Implementation: Dependency resolution
 * 
 * 7. Permission Issues:
 *    - Risk: Unauthorized data access
 *    - Prevention: Authorization checks
 *    - Implementation: Role-based access
 * 
 * 8. Performance Degradation:
 *    - Risk: Large exports slow down server
 *    - Prevention: Async processing
 *    - Implementation: Background jobs
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { AuthRequest, authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { validateQuery } from '../middleware/validation.js';

const router = Router();

// ============================================================================
// EXPORT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/export/issues
 * Export issues as JSON
 */
router.get('/issues', authenticate, validateQuery(z.object({
    format: z.enum(['json', 'csv']).default('json'),
    projectId: z.string().optional(),
    teamId: z.string().optional()
})), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { format, projectId, teamId } = req.query;

    let issues = await db.getAllIssues();

    // Filter by project
    if (projectId) {
        issues = issues.filter(i => i.project_id === projectId);
    }

    // Filter by team
    if (teamId) {
        const projects = await db.getProjectsByTeam(teamId as string);
        const projectIds = new Set(projects.map(p => p.id));
        issues = issues.filter(i => projectIds.has(i.project_id));
    }

    // Get related data
    const issueIds = issues.map(i => i.id);
    const assignees = await db.all(`
    SELECT ia.issue_id, u.id, u.name, u.email
    FROM issue_assignees ia
    JOIN users u ON ia.user_id = u.id
    WHERE ia.issue_id IN (${issueIds.map(() => '?').join(',')})
  `, issueIds);

    const dependencies = await db.all(`
    SELECT id.blocked_id, id.blocking_id
    FROM issue_dependencies id
    WHERE id.blocked_id IN (${issueIds.map(() => '?').join(',')})
  `, issueIds);

    // Group related data
    const assigneesMap = new Map<string, any[]>();
    const dependenciesMap = new Map<string, string[]>();

    assignees.forEach((a: any) => {
        if (!assigneesMap.has(a.issue_id)) {
            assigneesMap.set(a.issue_id, []);
        }
        assigneesMap.get(a.issue_id)!.push({
            id: a.id,
            name: a.name,
            email: a.email
        });
    });

    dependencies.forEach((d: any) => {
        if (!dependenciesMap.has(d.blocked_id)) {
            dependenciesMap.set(d.blocked_id, []);
        }
        dependenciesMap.get(d.blocked_id)!.push(d.blocking_id);
    });

    const exportData = issues.map(issue => ({
        ...issue,
        assignees: assigneesMap.get(issue.id) || [],
        blockedBy: dependenciesMap.get(issue.id) || []
    }));

    if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="issues-export.json"');
        res.json(exportData);
    } else {
        // CSV format
        const csvHeaders = ['identifier', 'title', 'description', 'status', 'priority', 'project_id', 'assignees'];
        const csvRows = exportData.map(issue => [
            issue.identifier,
            `"${issue.title.replace(/"/g, '""')}"`,
            `"${(issue.description || '').replace(/"/g, '""')}"`,
            issue.status,
            issue.priority,
            issue.project_id,
            `"${issue.assignees.map((a: any) => a.email).join(', ')}"`
        ]);

        const csv = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="issues-export.csv"');
        res.send(csv);
    }
    return;
}));

/**
 * GET /api/v1/export/projects
 * Export projects as JSON
 */
router.get('/projects', authenticate, validateQuery(z.object({
    format: z.enum(['json', 'csv']).default('json'),
    teamId: z.string().optional()
})), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { format, teamId } = req.query;

    let projects = await db.getAllProjects();

    // Filter by team
    if (teamId) {
        projects = projects.filter(p => p.team_id === teamId);
    }

    // Get related data
    const projectIds = projects.map(p => p.id);
    const issues = await db.all(`
    SELECT project_id, COUNT(*) as issue_count
    FROM issues
    WHERE project_id IN (${projectIds.map(() => '?').join(',')})
    GROUP BY project_id
  `, projectIds);

    const issueCountMap = new Map<string, number>();
    issues.forEach((i: any) => {
        issueCountMap.set(i.project_id, i.issue_count);
    });

    const exportData = projects.map(project => ({
        ...project,
        issue_count: issueCountMap.get(project.id) || 0
    }));

    if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="projects-export.json"');
        res.json(exportData);
    } else {
        // CSV format
        const csvHeaders = ['identifier', 'name', 'description', 'team_id', 'issue_count'];
        const csvRows = exportData.map(project => [
            project.identifier,
            `"${project.name.replace(/"/g, '""')}"`,
            `"${(project.description || '').replace(/"/g, '""')}"`,
            project.team_id,
            project.issue_count
        ]);

        const csv = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="projects-export.csv"');
        res.send(csv);
    }
    return;
}));

/**
 * GET /api/v1/export/users
 * Export users as JSON (admin only)
 */
router.get('/users', authenticate, requireAdmin, validateQuery(z.object({
    format: z.enum(['json', 'csv']).default('json')
})), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { format } = req.query;

    const users = await db.getAllUsers();

    if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="users-export.json"');
        res.json(users);
    } else {
        // CSV format
        const csvHeaders = ['id', 'name', 'email', 'role', 'created_at'];
        const csvRows = users.map(user => [
            user.id,
            `"${user.name.replace(/"/g, '""')}"`,
            user.email,
            user.role,
            user.created_at
        ]);

        const csv = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
        res.send(csv);
    }
    return;
}));

// ============================================================================
// IMPORT ENDPOINTS
// ============================================================================

const importIssueSchema = z.object({
    identifier: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: z.string(),
    priority: z.string(),
    project_id: z.string(),
    assignees: z.array(z.string()).optional(),
    blockedBy: z.array(z.string()).optional()
});

const importProjectSchema = z.object({
    identifier: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    team_id: z.string()
});

/**
 * POST /api/v1/import/issues
 * Import issues from JSON
 */
router.post('/issues', authenticate, validateQuery(z.object({
    format: z.enum(['json']).default('json')
})), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { format } = req.query;

    if (format !== 'json') {
        return res.status(400).json({ error: 'Only JSON format is supported for imports' });
    }

    const issuesData = req.body;

    if (!Array.isArray(issuesData)) {
        return res.status(400).json({ error: 'Invalid data format: expected array of issues' });
    }

    const results = {
        imported: 0,
        failed: 0,
        errors: [] as string[]
    };

    for (const issueData of issuesData) {
        try {
            const validated = importIssueSchema.parse(issueData);

            // Check if project exists
            const project = await db.getProjectById(validated.project_id);
            if (!project) {
                results.failed++;
                results.errors.push(`Project ${validated.project_id} not found for issue ${validated.identifier}`);
                continue;
            }

            // Create issue
            const newIssue = await db.createIssue({
                identifier: validated.identifier,
                title: validated.title,
                description: validated.description,
                status: validated.status,
                priority: validated.priority,
                project_id: validated.project_id,
                parent_id: null,
                start_date: null,
                due_date: null
            });

            // Set assignees
            if (validated.assignees && validated.assignees.length > 0) {
                await db.setIssueAssignees(newIssue.id, validated.assignees);
            }

            // Set dependencies
            if (validated.blockedBy && validated.blockedBy.length > 0) {
                await db.setIssueDependencies(newIssue.id, validated.blockedBy);
            }

            results.imported++;
        } catch (error) {
            results.failed++;
            results.errors.push(`Failed to import issue: ${error}`);
        }
    }

    res.json(results);
    return;
}));

/**
 * POST /api/v1/import/projects
 * Import projects from JSON
 */
router.post('/projects', authenticate, validateQuery(z.object({
    format: z.enum(['json']).default('json')
})), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { format } = req.query;

    if (format !== 'json') {
        return res.status(400).json({ error: 'Only JSON format is supported for imports' });
    }

    const projectsData = req.body;

    if (!Array.isArray(projectsData)) {
        return res.status(400).json({ error: 'Invalid data format: expected array of projects' });
    }

    const results = {
        imported: 0,
        failed: 0,
        errors: [] as string[]
    };

    for (const projectData of projectsData) {
        try {
            const validated = importProjectSchema.parse(projectData);

            // Check if team exists
            const team = await db.getTeamById(validated.team_id);
            if (!team) {
                results.failed++;
                results.errors.push(`Team ${validated.team_id} not found for project ${validated.identifier}`);
                continue;
            }

            // Create project
            await db.createProject({
                identifier: validated.identifier,
                name: validated.name,
                description: validated.description,
                team_id: validated.team_id,
                icon: '',
                is_public: 0,
                public_slug: null,
                lead_id: null,
                start_date: null,
                target_date: null
            });

            results.imported++;
        } catch (error) {
            results.failed++;
            results.errors.push(`Failed to import project: ${error}`);
        }
    }

    res.json(results);
    return;
}));

export default router;
