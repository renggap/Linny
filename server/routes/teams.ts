import { Router, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { AuthRequest, authenticate, requireAdminOrTeamLead, requireTeamMember } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import { createTeamSchema } from '../validation/schemas.js';
import { validateBody, validateParams } from '../middleware/validation.js';

const router = Router();

/**
 * GET /api/teams
 * Get all teams (authenticated)
 */
router.get('/', authenticate, apiRateLimit, asyncHandler(async (_req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const teams = await db.getAllTeams();

  // Batch load all team members in a single query
  const teamIds = teams.map(t => t.id);
  const allMembers = await db.all(`
    SELECT tm.team_id, u.id, u.name, u.email, u.avatar_url, u.role, u.created_at, u.updated_at
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id IN (${teamIds.map(() => '?').join(',')})
  `, teamIds);

  // Group members by team ID
  const membersMap = new Map<string, string[]>();
  allMembers.forEach((row: any) => {
    if (!membersMap.has(row.team_id)) {
      membersMap.set(row.team_id, []);
    }
    membersMap.get(row.team_id)!.push(row.id);
  });

  // Combine data
  const teamsWithMembers = teams.map(team => ({
    ...team,
    members: membersMap.get(team.id) || []
  }));

  res.json({ teams: teamsWithMembers });
}));

/**
 * GET /api/teams/:id
 * Get team by ID (authenticated)
 */
router.get('/:id', authenticate, apiRateLimit, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const teamId = req.params.id;

  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' });
  }

  const team = await db.getTeamById(teamId);

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  // Get team members in a single query
  const members = await db.all(`
    SELECT u.id, u.name, u.email, u.avatar_url, u.role, u.created_at, u.updated_at
    FROM users u
    JOIN team_members tm ON u.id = tm.user_id
    WHERE tm.team_id = ?
  `, [teamId]);

  res.json({ team: { ...team, members: members.map((m: any) => m.id) } });
  return;
}));

/**
 * POST /api/teams
 * Create a new team (admin or team lead)
 */
router.post('/', authenticate, requireAdminOrTeamLead, validateBody(createTeamSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { name, icon } = req.body;

  const newTeam = await db.createTeam({
    name,
    icon: icon || name.charAt(0).toUpperCase()
  });

  // Add creator as first member
  if (req.userId) {
    await db.addTeamMember(newTeam.id, req.userId);
  }

  const members = (await db.getTeamMembers(newTeam.id)).map(u => u.id);

  res.status(201).json({ team: { ...newTeam, members } });
  return;
}));

/**
 * PATCH /api/teams/:id
 * Update team (admin or team lead)
 */
router.patch('/:id', authenticate, requireAdminOrTeamLead, validateParams(z.object({ id: z.string().min(1) })), validateBody(z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(10).optional()
})), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id: teamId } = req.params;
  const { name, icon } = req.body;

  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' });
  }

  const team = await db.getTeamById(teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  await db.updateTeam(teamId, { name, icon });

  const updatedTeam = await db.getTeamById(teamId);
  const members = (await db.getTeamMembers(teamId)).map(u => u.id);

  res.json({ team: { ...updatedTeam!, members } });
  return;
}));

/**
 * GET /api/teams/:id/members
 * Get team members (authenticated)
 */
router.get('/:id/members', authenticate, apiRateLimit, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const teamId = req.params.id;

  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' });
  }

  const team = await db.getTeamById(teamId);

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const members = (await db.getTeamMembers(team.id)).map(({ password_hash: _, ...user }) => user);

  res.json({ members });
  return;
}));

/**
 * POST /api/teams/:id/members
 * Add member to team (admin or team lead who is a team member)
 */
router.post('/:id/members', authenticate, requireAdminOrTeamLead, requireTeamMember('id'), validateParams(z.object({ id: z.string().min(1) })), validateBody(z.object({ userId: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id: teamId } = req.params;
  const { userId } = req.body;

  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const team = await db.getTeamById(teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const user = await db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await db.addTeamMember(teamId, userId);

  const members = (await db.getTeamMembers(teamId)).map(u => u.id);

  res.json({ members });
  return;
}));

/**
 * DELETE /api/teams/:id/members/:userId
 * Remove member from team (admin or team lead who is a team member)
 */
router.delete('/:id/members/:userId', authenticate, requireAdminOrTeamLead, requireTeamMember('id'), validateParams(z.object({
  id: z.string().min(1),
  userId: z.string().min(1)
})), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id: teamId, userId } = req.params;

  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const team = await db.getTeamById(teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  await db.removeTeamMember(teamId, userId);

  const members = (await db.getTeamMembers(teamId)).map(u => u.id);

  res.json({ members });
  return;
}));

export default router;
