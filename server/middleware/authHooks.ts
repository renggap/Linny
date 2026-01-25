import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Global authentication hook
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const payload = request.user as any;
    request.userId = payload.userId;
    (request as any).userRole = payload.role;
    (request as any).userEmail = payload.email;
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized: Invalid or expired token' });
  }
}

/**
 * Admin only hook
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (request.userRole !== 'Administrator') {
    reply.code(403).send({ error: 'Forbidden: Administrator access required' });
  }
}

/**
 * Admin or Team Lead hook
 */
export async function requireAdminOrTeamLead(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (request.userRole !== 'Administrator' && request.userRole !== 'TeamLead') {
    reply.code(403).send({ error: 'Forbidden: Elevated privileges required' });
  }
}

/**
 * Team member hook
 */
export async function requireTeamMember(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  const { prisma } = request.server as any;
  // Extract teamId from params or body (body may not be parsed yet in onRequest hook)
  const params = request.params as any;
  const body = request.body as any;
  const teamId = params.teamId || params.id || (body && body.teamId);

  if (!teamId) {
    return reply.code(400).send({ error: 'Team ID is required' });
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: request.userId } }
  });

  if (!membership && (request.userRole as any) !== 'Administrator') {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.isStealth || (request.userRole as any) !== 'Administrator') {
      return reply.code(403).send({ error: 'Forbidden: Team membership required' });
    }
  }
}

/**
 * Project member hook
 */
export async function requireProjectMember(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  const { prisma } = request.server as any;
  // Extract projectId from various possible locations
  // Handle routes like /:id, /:id/links, /:id/links/:linkId, etc.
  const params = request.params as any;
  const projectId = params.projectId || params.id || (request.body as any).projectId;

  if (!projectId) {
    return reply.code(400).send({ error: 'Project ID is required' });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return reply.code(404).send({ error: 'Project not found' });
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: project.teamId, userId: request.userId! } }
  });

  if (!membership && (request.userRole as any) !== 'Administrator') {
    const team = await prisma.team.findUnique({ where: { id: project.teamId } });
    if (!team || team.isStealth || (request.userRole as any) !== 'Administrator') {
      return reply.code(403).send({ error: 'Forbidden: Project team membership required' });
    }
  }
}

/**
 * Issue team member hook
 */
export async function requireIssueTeamMember(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  const { prisma } = request.server as any;
  const issueId = (request.params as any).issueId || (request.params as any).id || (request.body as any).issueId;

  if (!issueId) {
    return reply.code(400).send({ error: 'Issue ID is required' });
  }

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: true }
  });

  if (!issue) {
    return reply.code(404).send({ error: 'Issue not found' });
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: issue.project.teamId, userId: request.userId! } }
  });

  if (!membership && (request.userRole as any) !== 'Administrator') {
    const team = await prisma.team.findUnique({ where: { id: issue.project.teamId } });
    if (!team || team.isStealth || (request.userRole as any) !== 'Administrator') {
      return reply.code(403).send({ error: 'Forbidden: Issue team membership required' });
    }
  }
}
