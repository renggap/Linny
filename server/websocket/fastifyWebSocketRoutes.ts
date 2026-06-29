/**
 * ============================================================================
 * FASTIFY WEBSOCKET ROUTES
 * ============================================================================
 *
 * Pure Fastify WebSocket implementation using route-based handlers.
 * No custom manager class - uses Fastify's native WebSocket support.
 *
 * Architecture:
 * - Individual WebSocket routes for different room types
 * - Room-based broadcasting using Fastify's WebSocket connections
 * - JWT authentication via Fastify decorators
 * - Connection lifecycle managed per route
 */

import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { verifyToken } from '../auth/jwt.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AuthenticatedWebSocket extends WebSocket {
    userId?: string;
    userEmail?: string;
    userRole?: string;
}

interface WebSocketMessage {
    type: string;
    data?: any;
}

// ============================================================================
// GLOBAL CONNECTION STORAGE
// ============================================================================

// Store active connections by room
const roomConnections = new Map<string, Set<WebSocket>>();
const userConnections = new Map<string, Set<WebSocket>>();
const maxConnectionsPerUser = 5;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function authenticateWebSocket(req: any): {
    success: boolean;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    message?: string;
} {
    try {
        // Get token from query parameter (WebSocket upgrades don't go through normal middleware)
        const token = req.query?.token;

        console.log(`🔑 WebSocket auth: token received (length: ${token ? token.length : 0})`);

        if (!token || typeof token !== 'string') {
            console.warn('❌ WebSocket auth: No token provided');
            return { success: false, message: 'No token provided' };
        }

        // Verify token
        const payload = verifyToken(token);
        if (!payload) {
            console.warn('❌ WebSocket auth: Invalid or expired token');
            return { success: false, message: 'Invalid or expired token' };
        }

        console.log(`✅ WebSocket auth: User ${payload.email} authenticated`);
        return {
            success: true,
            userId: payload.userId,
            userEmail: payload.email,
            userRole: payload.role
        };
    } catch (error) {
        console.error('❌ WebSocket authentication error:', error);
        return { success: false, message: 'Authentication failed' };
    }
}

function addToRoom(roomId: string, ws: WebSocket): void {
    if (!roomConnections.has(roomId)) {
        roomConnections.set(roomId, new Set());
    }
    roomConnections.get(roomId)!.add(ws);
}

function removeFromRoom(roomId: string, ws: WebSocket): void {
    const room = roomConnections.get(roomId);
    if (room) {
        room.delete(ws);
        if (room.size === 0) {
            roomConnections.delete(roomId);
        }
    }
}

function broadcastToRoom(roomId: string, message: WebSocketMessage, excludeUserId?: string): void {
    const room = roomConnections.get(roomId);
    if (!room) {
        console.log(`📢 No clients in room ${roomId}, skipping broadcast`);
        return;
    }

    console.log(`📢 Broadcasting to ${room.size} clients in room ${roomId}:`, message.type);
    room.forEach((client) => {
        const authWs = client as AuthenticatedWebSocket;

        // Skip excluded user
        if (excludeUserId && authWs.userId === excludeUserId) {
            console.log(`📢 Skipping excluded user ${excludeUserId}`);
            return;
        }

        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

function trackUserConnection(userId: string, ws: WebSocket): boolean {
    if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
    }

    const userConns = userConnections.get(userId)!;
    if (userConns.size >= maxConnectionsPerUser) {
        console.warn(`⚠️  User ${userId} exceeded connection limit (${maxConnectionsPerUser})`);
        return false;
    }

    userConns.add(ws);
    return true;
}

function cleanupUserConnection(userId: string | undefined, ws: WebSocket): void {
    if (!userId) return;
    const userConns = userConnections.get(userId);
    if (userConns) {
        userConns.delete(ws);
        if (userConns.size === 0) {
            userConnections.delete(userId);
        }
    }
}

// ============================================================================
// WEBSOCKET ROUTE REGISTRATION
// ============================================================================

export function registerWebSocketRoutes(fastify: FastifyInstance): void {
    // User notifications WebSocket route - for direct user notifications
    fastify.get('/ws/user', {
        websocket: true,
        logLevel: 'warn',
        config: { rateLimit: false }
    }, (connection: WebSocket, req: any) => {
        const ws = connection as AuthenticatedWebSocket;

        // Authenticate and set user data
        const authResult = authenticateWebSocket(req);
        if (!authResult.success) {
            console.warn(`❌ WebSocket authentication failed: ${authResult.message}`);
            ws.close(1008, authResult.message);
            return;
        }

        ws.userId = authResult.userId!;
        ws.userEmail = authResult.userEmail!;
        ws.userRole = authResult.userRole!;

        // Track user connection
        if (!trackUserConnection(ws.userId, ws)) {
            ws.close(1008, 'Too many connections');
            return;
        }

        const roomId = `user:${ws.userId}`;

        // Add to user-specific room for notifications
        addToRoom(roomId, ws);

        // Setup event handlers
        ws.on('message', (data: Buffer) => {
            try {
                const message: WebSocketMessage = JSON.parse(data.toString());
                // Handle ping/pong
                if (message.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
            } catch (error) {
                console.error('WebSocket message parsing error:', error);
            }
        });

        ws.on('close', (code, _reason) => {
            console.log(`🔌 WebSocket disconnected from ${roomId}: ${ws.userEmail} (code: ${code})`);
            removeFromRoom(roomId, ws);
            if (ws.userId) {
                cleanupUserConnection(ws.userId, ws);
            }
        });

        ws.on('error', (error: Error) => {
            console.error(`WebSocket error in ${roomId} for ${ws.userEmail}:`, error);
            removeFromRoom(roomId, ws);
            if (ws.userId) {
                cleanupUserConnection(ws.userId, ws);
            }
        });

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connected',
            data: {
                roomId,
                userId: ws.userId,
                userEmail: ws.userEmail,
                timestamp: new Date().toISOString()
            }
        }));

        console.log(`✅ WebSocket connected to ${roomId}: ${ws.userEmail}`);
    });

    // Join-requests room WebSocket route
    // Used by team admins/leads to receive real-time join_request.created / .updated events.
    fastify.get('/ws/join-requests', {
        websocket: true,
        logLevel: 'warn',
        config: { rateLimit: false }
    }, (connection: WebSocket, req: any) => {
        const ws = connection as AuthenticatedWebSocket;

        // Authenticate and set user data
        const authResult = authenticateWebSocket(req);
        if (!authResult.success) {
            console.warn(`❌ WebSocket authentication failed: ${authResult.message}`);
            ws.close(1008, authResult.message);
            return;
        }

        ws.userId = authResult.userId!;
        ws.userEmail = authResult.userEmail!;
        ws.userRole = authResult.userRole!;

        // Track user connection
        if (!trackUserConnection(ws.userId, ws)) {
            ws.close(1008, 'Too many connections');
            return;
        }

        const roomId = 'join-requests';

        // Add to room
        addToRoom(roomId, ws);

        // Setup event handlers
        ws.on('message', (data: Buffer) => {
            try {
                const message: WebSocketMessage = JSON.parse(data.toString());
                if (message.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
            } catch (error) {
                console.error('WebSocket message parsing error:', error);
            }
        });

        ws.on('close', (code, _reason) => {
            console.log(`🔌 WebSocket disconnected from ${roomId}: ${ws.userEmail} (code: ${code})`);
            removeFromRoom(roomId, ws);
            if (ws.userId) {
                cleanupUserConnection(ws.userId, ws);
            }
        });

        ws.on('error', (error: Error) => {
            console.error(`WebSocket error in ${roomId} for ${ws.userEmail}:`, error);
            removeFromRoom(roomId, ws);
            if (ws.userId) {
                cleanupUserConnection(ws.userId, ws);
            }
        });

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connected',
            data: {
                roomId,
                userId: ws.userId,
                userEmail: ws.userEmail,
                timestamp: new Date().toISOString()
            }
        }));

        console.log(`✅ WebSocket connected to ${roomId}: ${ws.userEmail}`);
    });

    // Issue room WebSocket route
    fastify.get('/ws/issue/:issueId', {
        websocket: true,
        logLevel: 'warn',
        config: { rateLimit: false }
    }, async (connection: WebSocket, req: any) => {
        const ws = connection as AuthenticatedWebSocket;
        const { issueId } = req.params;

        // Authenticate and set user data
        const authResult = authenticateWebSocket(req);
        if (!authResult.success) {
            console.warn(`❌ WebSocket authentication failed: ${authResult.message}`);
            ws.close(1008, authResult.message);
            return;
        }

        ws.userId = authResult.userId!;
        ws.userEmail = authResult.userEmail!;
        ws.userRole = authResult.userRole!;

        // Resolve teamId for the issue and verify membership if stealth
        const issue = await fastify.prisma.issue.findUnique({
            where: { id: issueId },
            select: {
                id: true,
                project: {
                    select: {
                        teamId: true,
                        team: { select: { isStealth: true } }
                    }
                }
            }
        });

        if (!issue) {
            ws.close(1008, 'Issue not found');
            return;
        }

        const teamId = issue.project.teamId;
        if (issue.project.team?.isStealth && ws.userRole !== 'Administrator') {
            const membership = await fastify.prisma.teamMember.findUnique({
                where: { teamId_userId: { teamId, userId: ws.userId } }
            });
            if (!membership) {
                ws.close(1008, 'Not authorized for this workspace');
                return;
            }
        }

        // Track user connection
        if (!trackUserConnection(ws.userId, ws)) {
            ws.close(1008, 'Too many connections');
            return;
        }

        const roomId = `issue:${issueId}`;

        // Add to room
        addToRoom(roomId, ws);

        // Setup event handlers
        ws.on('message', (data: Buffer) => {
            try {
                const message: WebSocketMessage = JSON.parse(data.toString());
                // Handle room-specific messages if needed
                console.log(`📨 Message from ${ws.userEmail} in ${roomId}:`, message.type);
            } catch (error) {
                console.error('WebSocket message parsing error:', error);
            }
        });

        ws.on('close', (code, _reason) => {
            console.log(`🔌 WebSocket disconnected from ${roomId}: ${ws.userEmail} (code: ${code})`);
            removeFromRoom(roomId, ws);
            if (ws.userId) {
                cleanupUserConnection(ws.userId, ws);
            }
        });

        ws.on('error', (error: Error) => {
            console.error(`WebSocket error in ${roomId} for ${ws.userEmail}:`, error);
            removeFromRoom(roomId, ws);
            if (ws.userId) {
                cleanupUserConnection(ws.userId, ws);
            }
        });

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connected',
            data: {
                roomId,
                userId: ws.userId,
                userEmail: ws.userEmail,
                timestamp: new Date().toISOString()
            }
        }));

        console.log(`✅ WebSocket connected to ${roomId}: ${ws.userEmail}`);
    });

    // Project room WebSocket route
    fastify.get('/ws/project/:projectId', {
        websocket: true,
        logLevel: 'warn',
        config: { rateLimit: false }
    }, async (connection: WebSocket, req: any) => {
        const ws = connection as AuthenticatedWebSocket;
        const { projectId } = req.params;

        const authResult = authenticateWebSocket(req);
        if (!authResult.success) {
            ws.close(1008, authResult.message || 'Authentication failed');
            return;
        }

        ws.userId = authResult.userId!;
        ws.userEmail = authResult.userEmail!;
        ws.userRole = authResult.userRole!;

        const project = await fastify.prisma.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                teamId: true,
                team: { select: { isStealth: true } }
            }
        });

        if (!project) {
            ws.close(1008, 'Project not found');
            return;
        }

        if (project.team?.isStealth && ws.userRole !== 'Administrator') {
            const membership = await fastify.prisma.teamMember.findUnique({
                where: { teamId_userId: { teamId: project.teamId, userId: ws.userId } }
            });
            if (!membership) {
                ws.close(1008, 'Not authorized for this workspace');
                return;
            }
        }

        if (!trackUserConnection(ws.userId, ws)) {
            ws.close(1008, 'Too many connections');
            return;
        }

        const roomId = `project:${projectId}`;
        addToRoom(roomId, ws);

        ws.on('close', (_code, _reason) => {
            console.log(`🔌 WebSocket disconnected from ${roomId}: ${ws.userEmail}`);
            removeFromRoom(roomId, ws);
            if (ws.userId) {
                cleanupUserConnection(ws.userId, ws);
            }
        });

        ws.on('error', (error: Error) => {
            console.error(`WebSocket error in ${roomId} for ${ws.userEmail}:`, error);
            removeFromRoom(roomId, ws);
            if (ws.userId) {
                cleanupUserConnection(ws.userId, ws);
            }
        });

        ws.send(JSON.stringify({
            type: 'connected',
            data: { roomId, userId: ws.userId, userEmail: ws.userEmail }
        }));

        console.log(`✅ WebSocket connected to ${roomId}: ${ws.userEmail}`);
    });

    console.log('✅ WebSocket routes registered: /ws/user, /ws/issue/:issueId, /ws/project/:projectId');
}

// ============================================================================
// EVENT BROADCASTER HELPERS
// ============================================================================

/**
 * Broadcast issue update
 */
export function broadcastIssueUpdate(issueId: string, issue: any, excludeUserId?: string): void {
    console.log(`📢 Broadcasting issue update for issue ${issueId}`);
    broadcastToRoom(`issue:${issueId}`, {
        type: 'issue_updated',
        data: { issueId, issue }
    }, excludeUserId);
}

/**
 * Broadcast new issue
 */
export function broadcastNewIssue(projectId: string, issue: any, excludeUserId?: string): void {
    console.log(`📢 Broadcasting new issue for project ${projectId}`);
    broadcastToRoom(`project:${projectId}`, {
        type: 'issue_created',
        data: { projectId, issue }
    }, excludeUserId);
}

/**
 * Broadcast comment update
 */
export function broadcastCommentUpdate(issueId: string, comment: any, excludeUserId?: string): void {
    console.log(`📢 Broadcasting comment update for issue ${issueId}`);
    broadcastToRoom(`issue:${issueId}`, {
        type: 'comment_updated',
        data: { issueId, comment }
    }, excludeUserId);
}

/**
 * Broadcast notification to user
 */
export function broadcastNotification(userId: string, notification: any): void {
    // Broadcast to the user's notification room
    const roomId = `user:${userId}`;
    console.log(`📢 Broadcasting notification to user ${userId} in room ${roomId}`);
    broadcastToRoom(roomId, {
        type: 'notification.created',
        data: { notification }  // Wrap in notification property to match frontend interface
    });
}

/**
 * Broadcast project update
 */
export function broadcastProjectUpdate(projectId: string, data: any, excludeUserId?: string): void {
    console.log(`📢 Broadcasting project update for project ${projectId}`);
    broadcastToRoom(`project:${projectId}`, {
        type: 'project_updated',
        data: { projectId, ...data }
    }, excludeUserId);
}

/**
 * Broadcast join request created event
 */
export function broadcastJoinRequestCreated(joinRequest: any): void {
    console.log(`📢 Broadcasting join request created for team ${joinRequest.teamId}`);
    // Broadcast to all connected clients - handled by frontend filtering
    broadcastToRoom('join-requests', {
        type: 'join_request.created',
        data: { joinRequest }
    });
}

/**
 * Broadcast join request updated event (approved/rejected)
 */
export function broadcastJoinRequestUpdated(joinRequestId: string, status: 'pending' | 'approved' | 'rejected'): void {
    console.log(`📢 Broadcasting join request updated: ${joinRequestId} -> ${status}`);
    // Broadcast to all connected clients - handled by frontend filtering
    broadcastToRoom('join-requests', {
        type: 'join_request.updated',
        data: { joinRequestId, status }
    });
}