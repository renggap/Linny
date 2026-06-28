import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createProjectSchema, updateProjectSchema } from '../validation/schemas.js';
import { invalidateCache } from '../middleware/cache.js';
import { authenticate, requireAdminOrTeamLead, requireProjectMember, requireTeamMember } from '../middleware/authHooks.js';
import { workspaceScopeSchema } from '@neo-linear/contracts';

const projectsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const prisma = fastify.prisma;

  // Public route
  fastify.get('/public/:slug', {
    schema: {
      params: z.object({ slug: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { slug } = request.params;

    const project = await prisma.project.findUnique({
      where: { publicSlug: slug },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: true
              }
            }
          }
        },
        issues: {
          include: {
            assignees: true
          }
        },
        links: true
      }
    });

    if (!project || !project.isPublic) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const teamMembers = project.team.members.map(m => m.user);
    const issues = project.issues.map(issue => ({
      ...issue,
      assigneeIds: issue.assignees.map(a => a.userId)
    }));

    // Get unique authors of comments
    const issueIds = issues.map(i => i.id);
    const commentAuthors = await prisma.comment.findMany({
      where: { issueId: { in: issueIds } },
      select: { userId: true },
      distinct: ['userId']
    });

    const allUserIds = new Set([
      ...teamMembers.map(u => u.id),
      ...commentAuthors.map(c => c.userId)
    ]);

    const allUsers = await prisma.user.findMany({
      where: { id: { in: Array.from(allUserIds) } }
    });

    return {
      project: {
        ...project,
        members: teamMembers.map(u => u.id),
        links: project.links
      },
      issues,
      users: allUsers.map(({ passwordHash: _, ...u }) => u)
    };
  });

  fastify.get('/', {
    onRequest: [authenticate],
    schema: {
      querystring: workspaceScopeSchema.pick({ teamId: true }) // Require teamId
    }
  }, async (request: any) => {
    const { teamId } = request.query;

    const projects = await prisma.project.findMany({
      where: { teamId },
      include: {
        team: {
          include: {
            members: true
          }
        },
        links: true  // Include links in the response
      }
    });

    return {
      projects: projects.map(p => ({
        ...p,
        members: p.team.members.map(m => m.userId)
      }))
    };
  });

  fastify.get('/:id', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: true
          }
        }
      }
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    return {
      project: {
        ...project,
        members: project.team.members.map(m => m.userId)
      }
    };
  });

  // Get project with links (for project detail view)
  fastify.get('/:id/with-links', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: true
          }
        },
        links: true
      }
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    return {
      project: {
        ...project,
        members: project.team.members.map(m => m.userId),
        links: project.links
      }
    };
  });

  fastify.post('/', {
    onRequest: [authenticate], // Only authenticate in onRequest
    preValidation: [requireTeamMember], // Check team membership after body is parsed
    schema: {
      body: createProjectSchema
    }
  }, async (request: any, reply: any) => {
    const data = request.body;

    const project = await prisma.project.create({
      data: {
        name: data.name,
        identifier: data.identifier,
        icon: data.icon || '📁',
        teamId: data.teamId,
        description: data.description,
        isPublic: data.isPublic || false,
        publicSlug: data.publicSlug || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        targetDate: data.targetDate ? new Date(data.targetDate) : null
      }
    });

    await invalidateCache('projects');
    reply.code(201);
    return { project };
  });

  // Project Links - moved before DELETE /:id to ensure more specific routes are matched first
  fastify.get('/:id/links', {
    onRequest: [requireProjectMember],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any) => {
    const { id: projectId } = request.params;
    const links = await prisma.projectLink.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    });
    return { links };
  });

  fastify.post('/:id/links', {
    onRequest: [requireProjectMember],
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        title: z.string(),
        url: z.string().url()
      })
    }
  }, async (request: any, reply: any) => {
    const { id: projectId } = request.params;
    const { title, url } = request.body;

    const link = await prisma.projectLink.create({
      data: {
        projectId,
        title,
        url
      }
    });

    await invalidateCache(`project:${projectId}`);
    reply.code(201);
    return { link };
  });

  fastify.delete('/:id/links/:linkId', {
    onRequest: [requireProjectMember],
    schema: {
      params: z.object({
        id: z.string(),
        linkId: z.string()
      })
    }
  }, async (request: any, reply: any) => {
    const { id: projectId, linkId } = request.params;

    // Verify the link exists before deleting
    const link = await prisma.projectLink.findUnique({
      where: { id: linkId }
    });

    if (!link) {
      return reply.code(404).send({ error: 'Link not found' });
    }

    if (link.projectId !== projectId) {
      return reply.code(400).send({ error: 'Link does not belong to this project' });
    }

    await prisma.projectLink.delete({ where: { id: linkId } });
    await invalidateCache(`project:${projectId}`);
    return { message: 'Link deleted' };
  });

  fastify.patch('/:id/links/:linkId', {
    onRequest: [requireProjectMember],
    schema: {
      params: z.object({
        id: z.string(),
        linkId: z.string()
      }),
      body: z.object({
        title: z.string().optional(),
        url: z.string().optional()
      })
    }
  }, async (request: any, reply: any) => {
    const { id: projectId, linkId } = request.params;
    const updates = request.body;

    // Verify the link exists and belongs to this project
    const link = await prisma.projectLink.findUnique({
      where: { id: linkId }
    });

    if (!link) {
      return reply.code(404).send({ error: 'Link not found' });
    }

    if (link.projectId !== projectId) {
      return reply.code(400).send({ error: 'Link does not belong to this project' });
    }

    const updatedLink = await prisma.projectLink.update({
      where: { id: linkId },
      data: updates
    });

    await invalidateCache(`project:${projectId}`);
    return { links: [updatedLink] };
  });

  fastify.patch('/:id', {
    onRequest: [requireProjectMember],
    schema: {
      params: z.object({ id: z.string() }),
      body: updateProjectSchema
    }
  }, async (request: any) => {
    const { id } = request.params;
    const updates = request.body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: updates.name,
        identifier: updates.identifier,
        icon: updates.icon,
        description: updates.description,
        isPublic: updates.isPublic,
        publicSlug: updates.publicSlug,
        leadId: updates.leadId !== undefined ? updates.leadId : updates.lead_id,
        startDate: updates.startDate ? new Date(updates.startDate) : undefined,
        targetDate: updates.targetDate ? new Date(updates.targetDate) : undefined,
        updatedAt: new Date()
      }
    });

    await invalidateCache('projects');
    await invalidateCache(`project:${id}`);
    return { project };
  });

  fastify.delete('/:id', {
    onRequest: [requireAdminOrTeamLead, requireProjectMember],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any) => {
    const { id } = request.params;
    await prisma.project.delete({ where: { id } });
    await invalidateCache('projects');
    await invalidateCache(`project:${id}`);
    return { message: 'Project deleted' };
  });
};

export default projectsRoutes;
