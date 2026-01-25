import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { authenticate, requireAdmin } from '../middleware/authHooks.js';

const exportRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/v1/export/issues - Export issues as JSON or CSV
  fastify.get('/issues', {
    onRequest: [authenticate],
    schema: {
      querystring: z.object({
        format: z.enum(['json', 'csv']).default('json'),
        projectId: z.string().optional(),
        teamId: z.string().optional()
      })
    }
  }, async (request: any, reply: any) => {
    const db = await getDatabase();
    const { format, projectId, teamId } = request.query;

    let issues = await db.getAllIssues();

    // Filter by project
    if (projectId) {
      issues = issues.filter((i: any) => i.project_id === projectId);
    }

    // Filter by team
    if (teamId) {
      const projects = await db.getProjectsByTeam(teamId as string);
      const projectIds = new Set(projects.map((p: any) => p.id));
      issues = issues.filter((i: any) => projectIds.has(i.project_id));
    }

    // Get related data
    const issueIds = issues.map((i: any) => i.id);
    const assigneesData = await db.prisma.issueAssignee.findMany({
      where: {
        issueId: { in: issueIds }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Group related data
    const assigneesMap = new Map<string, any[]>();

    assigneesData.forEach((ia: any) => {
      if (!assigneesMap.has(ia.issueId)) {
        assigneesMap.set(ia.issueId, []);
      }
      assigneesMap.get(ia.issueId)!.push({
        id: ia.user.id,
        name: ia.user.name,
        email: ia.user.email
      });
    });

    const exportData = issues.map((issue: any) => ({
      ...issue,
      assignees: assigneesMap.get(issue.id) || []
    }));

    if (format === 'json') {
      reply.type('application/json');
      reply.header('Content-Disposition', 'attachment; filename="issues-export.json"');
      return exportData;
    } else {
      // CSV format
      const csvHeaders = ['identifier', 'title', 'description', 'status', 'priority', 'project_id', 'assignees'];
      const csvRows = exportData.map((issue: any) => [
        issue.identifier,
        `"${issue.title.replace(/"/g, '""')}"`,
        `"${(issue.description || '').replace(/"/g, '""')}"`,
        issue.status,
        issue.priority,
        issue.project_id,
        `"${issue.assignees.map((a: any) => a.email).join(', ')}"`
      ]);

      const csv = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      reply.type('text/csv');
      reply.header('Content-Disposition', 'attachment; filename="issues-export.csv"');
      return csv;
    }
  });

  // GET /api/v1/export/projects - Export projects as JSON or CSV
  fastify.get('/projects', {
    onRequest: [authenticate],
    schema: {
      querystring: z.object({
        format: z.enum(['json', 'csv']).default('json'),
        teamId: z.string().optional()
      })
    }
  }, async (request: any, reply: any) => {
    const db = await getDatabase();
    const { format, teamId } = request.query;

    let projects = await db.getAllProjects();

    // Filter by team
    if (teamId) {
      projects = projects.filter((p: any) => p.team_id === teamId);
    }

    // Get related data
    const projectIds = projects.map((p: any) => p.id);
    const issues = await db.prisma.issue.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projectIds }
      },
      _count: {
        projectId: true
      }
    });

    const issueCountMap = new Map<string, number>();
    issues.forEach((i: any) => {
      issueCountMap.set(i.projectId, i._count.projectId);
    });

    const exportData = projects.map((project: any) => ({
      ...project,
      issue_count: issueCountMap.get(project.id) || 0
    }));

    if (format === 'json') {
      reply.type('application/json');
      reply.header('Content-Disposition', 'attachment; filename="projects-export.json"');
      return exportData;
    } else {
      // CSV format
      const csvHeaders = ['identifier', 'name', 'description', 'team_id', 'issue_count'];
      const csvRows = exportData.map((project: any) => [
        project.identifier,
        `"${project.name.replace(/"/g, '""')}"`,
        `"${(project.description || '').replace(/"/g, '""')}"`,
        project.team_id,
        project.issue_count
      ]);

      const csv = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      reply.type('text/csv');
      reply.header('Content-Disposition', 'attachment; filename="projects-export.csv"');
      return csv;
    }
  });

  // GET /api/v1/export/users - Export users as JSON or CSV (admin only)
  fastify.get('/users', {
    onRequest: [authenticate, requireAdmin],
    schema: {
      querystring: z.object({
        format: z.enum(['json', 'csv']).default('json')
      })
    }
  }, async (request: any, reply: any) => {
    const db = await getDatabase();
    const { format } = request.query;

    const users = await db.getAllUsers();

    if (format === 'json') {
      reply.type('application/json');
      reply.header('Content-Disposition', 'attachment; filename="users-export.json"');
      return users;
    } else {
      // CSV format
      const csvHeaders = ['id', 'name', 'email', 'role', 'created_at'];
      const csvRows = users.map((user: any) => [
        user.id,
        `"${user.name.replace(/"/g, '""')}"`,
        user.email,
        user.role,
        user.created_at
      ]);

      const csv = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      reply.type('text/csv');
      reply.header('Content-Disposition', 'attachment; filename="users-export.csv"');
      return csv;
    }
  });

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
    assignees: z.array(z.string()).optional()
  });

  const importProjectSchema = z.object({
    identifier: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    team_id: z.string()
  });

  // POST /api/v1/import/issues - Import issues from JSON
  fastify.post('/import/issues', {
    onRequest: [authenticate],
    schema: {
      querystring: z.object({
        format: z.enum(['json']).default('json')
      }),
      body: z.array(importIssueSchema)
    }
  }, async (request: any) => {
    const db = await getDatabase();
    const { format } = request.query;

    if (format !== 'json') {
      throw new Error('Only JSON format is supported for imports');
    }

    const issuesData = request.body;

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

        results.imported++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed to import issue: ${error.message || error}`);
      }
    }

    return results;
  });

  // POST /api/v1/import/projects - Import projects from JSON
  fastify.post('/import/projects', {
    onRequest: [authenticate],
    schema: {
      querystring: z.object({
        format: z.enum(['json']).default('json')
      }),
      body: z.array(importProjectSchema)
    }
  }, async (request: any) => {
    const db = await getDatabase();
    const { format } = request.query;

    if (format !== 'json') {
      throw new Error('Only JSON format is supported for imports');
    }

    const projectsData = request.body;

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
          is_public: false,
          public_slug: null,
          lead_id: null,
          start_date: null,
          target_date: null
        });

        results.imported++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed to import project: ${error.message || error}`);
      }
    }

    return results;
  });
};

export default exportRoutes;
