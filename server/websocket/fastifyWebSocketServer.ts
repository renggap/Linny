/**
 * ============================================================================
 * FASTIFY WEBSOCKET SERVER
 * ============================================================================
 *
 * Refactored to use @fastify/websocket plugin for better Fastify integration.
 *
 * Benefits over raw ws library:
 * 1. Native Fastify plugin integration
 * 2. Automatic request/response handling
 * 3. Built-in validation support
 * 4. Cleaner route registration
 * 5. Better error handling
 * 6. JWT authentication via Fastify decorators
 *
 * Architecture:
 * - WebSocket endpoint registered as Fastify route
 * - Room-based broadcasting for real-time updates
 * - JWT authentication via request decorator
 * - Connection lifecycle management
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
    rooms?: Set<string>;
}

interface WebSocketMessage {
    type: string;
    data?: any;
    roomId?: string;
}

interface BroadcastOptions {
    excludeUserId?: string;
}

// ============================================================================
// ROOMS REGISTRY
// ============================================================================

/**
 * Room-based subscription management
 * Maps roomId -> Set of WebSocket connections
 */
class RoomRegistry {
    private rooms: Map<string, Set<WebSocket>> = new Map();

    /**
     * Add client to a room
     */
    addToRoom(roomId: string, ws: WebSocket): void {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId)!.add(ws);
    }

    /**
     * Remove client from a room
     */
    removeFromRoom(roomId: string, ws: WebSocket): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.delete(ws);
            if (room.size === 0) {
                this.rooms.delete(roomId);
            }
        }
    }

    /**
     * Remove client from all rooms
     */
    removeFromAllRooms(ws: WebSocket): void {
        this.rooms.forEach((clients, roomId) => {
            if (clients.has(ws)) {
                clients.delete(ws);
                if (clients.size === 0) {
                    this.rooms.delete(roomId);
                }
            }
        });
    }

    /**
     * Get all clients in a room
     */
    getRoomClients(roomId: string): Set<WebSocket> | undefined {
        return this.rooms.get(roomId);
    }

    /**
     * Get statistics
     */
    getStats(): { totalRooms: number; connectionsPerRoom: { [roomId: string]: number } } {
        const connectionsPerRoom: { [roomId: string]: number } = {};
        this.rooms.forEach((clients, roomId) => {
            connectionsPerRoom[roomId] = clients.size;
        });

        return {
            totalRooms: this.rooms.size,
            connectionsPerRoom
        };
    }
}

// ============================================================================
// WEBSOCKET MANAGER
// ============================================================================

export class FastifyWebSocketManager {
    private fastify: FastifyInstance;
    private roomRegistry: RoomRegistry;
    private clients: Set<WebSocket> = new Set();
    private userConnections: Map<string, Set<WebSocket>> = new Map();
    private maxConnectionsPerUser: number = 5;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
        this.roomRegistry = new RoomRegistry();
        this.registerRoute();
    }

    /**
     * Register WebSocket route with Fastify
     */
    private registerRoute(): void {
        const self = this;

        // Register directly on the Fastify instance to avoid middleware conflicts
        this.fastify.get('/ws', { websocket: true, logLevel: 'warn' }, (connection: WebSocket, req: any) => {
            const ws = connection as any as AuthenticatedWebSocket;

            // Authenticate connection
            const authResult = self.authenticateConnection(req);
            if (!authResult.success) {
                console.warn(`❌ WebSocket authentication failed: ${authResult.message}`);
                ws.close(1008, authResult.message);
                return;
            }

            // Set user data
            ws.userId = authResult.userId!;
            ws.userEmail = authResult.userEmail!;
            ws.userRole = authResult.userRole!;
            ws.rooms = new Set();

            // Track user connections and enforce limit BEFORE adding to sets
            if (!self.userConnections.has(ws.userId!)) {
                self.userConnections.set(ws.userId!, new Set());
            }
            const userConnSet = self.userConnections.get(ws.userId!)!;
            const existingCount = userConnSet.size;

            // Check limit BEFORE adding connection
            if (existingCount >= self.maxConnectionsPerUser) {
                console.warn(`⚠️  User ${ws.userEmail} exceeded connection limit (${self.maxConnectionsPerUser})`);
                ws.close(1008, 'Too many connections');
                return;
            }

            // Add to tracking sets (safe now, since we checked the limit)
            userConnSet.add(ws);
            self.clients.add(ws);

            // Setup message handler
            ws.on('message', (data: Buffer) => self.handleMessage(ws, data));
            ws.on('close', (code, reason) => {
                console.log(`🔌 WebSocket disconnected: ${ws.userEmail} (code: ${code}, reason: ${reason})`);
                self.handleDisconnection(ws);
            });
            ws.on('error', (error: Error) => self.handleError(ws, error));

            // Send welcome message
            self.sendToClient(ws, {
                type: 'connected',
                data: {
                    userId: ws.userId,
                    userEmail: ws.userEmail,
                    timestamp: new Date().toISOString()
                }
            });

            console.log(`✅ WebSocket connected: ${ws.userEmail} (${ws.userId})`);
        });

        console.log('✅ WebSocket route registered: /ws');
    }

    /**
     * Authenticate WebSocket connection via JWT token
     */
    private authenticateConnection(req: any): {
        success: boolean;
        userId?: string;
        userEmail?: string;
        userRole?: string;
        message?: string;
    } {
        try {
            // Get token from query parameter
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

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(ws: WebSocket, data: Buffer): void {
        try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            const authenticatedWs = ws as AuthenticatedWebSocket;

            switch (message.type) {
                case 'subscribe':
                    this.handleSubscribe(authenticatedWs, message);
                    break;
                case 'unsubscribe':
                    this.handleUnsubscribe(authenticatedWs, message);
                    break;
                case 'ping':
                    this.sendToClient(ws, { type: 'pong' });
                    break;
                default:
                    console.warn(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            console.error('WebSocket message handling error:', error);
        }
    }

    /**
     * Handle room subscription
     */
    private handleSubscribe(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
        if (!message.roomId) {
            return;
        }

        // Add room to client's rooms
        ws.rooms!.add(message.roomId);

        // Add client to room
        this.roomRegistry.addToRoom(message.roomId, ws);

        console.log(`📢 User ${ws.userEmail} subscribed to room: ${message.roomId}`);
    }

    /**
     * Handle room unsubscription
     */
    private handleUnsubscribe(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
        if (!message.roomId) {
            return;
        }

        // Remove room from client's rooms
        ws.rooms!.delete(message.roomId);

        // Remove client from room
        this.roomRegistry.removeFromRoom(message.roomId, ws);

        console.log(`📢 User ${ws.userEmail} unsubscribed from room: ${message.roomId}`);
    }

    /**
     * Handle client disconnection
     */
    private handleDisconnection(ws: WebSocket): void {
        this.cleanupConnection(ws);
    }

    /**
     * Clean up connection resources
     */
    private cleanupConnection(ws: WebSocket): void {
        const authenticatedWs = ws as AuthenticatedWebSocket;

        // Remove from all rooms
        this.roomRegistry.removeFromAllRooms(ws);

        // Remove from user connections
        if (authenticatedWs.userId) {
            const userConns = this.userConnections.get(authenticatedWs.userId);
            if (userConns) {
                userConns.delete(ws);
                if (userConns.size === 0) {
                    this.userConnections.delete(authenticatedWs.userId);
                }
            }
        }

        // Remove from clients
        this.clients.delete(ws);

        console.log(`🔌 WebSocket disconnected: ${authenticatedWs.userEmail}`);
    }

    /**
     * Handle WebSocket errors
     */
    private handleError(ws: WebSocket, error?: Error): void {
        console.error('WebSocket error:', error);
        const authenticatedWs = ws as AuthenticatedWebSocket;
        console.error(`WebSocket error for user ${authenticatedWs.userEmail}:`, error);

        if (ws.readyState === ws.OPEN) {
            ws.close(1011, 'Internal server error');
        }
    }

    /**
     * Send message to specific client
     */
    private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Broadcast message to all clients in a room
     */
    public broadcastToRoom(roomId: string, message: WebSocketMessage, options: BroadcastOptions = {}): void {
        const room = this.roomRegistry.getRoomClients(roomId);
        if (!room) {
            console.log(`📢 No clients in room ${roomId}, skipping broadcast`);
            return;
        }

        console.log(`📢 Broadcasting to ${room.size} clients in room ${roomId}:`, message.type);
        room.forEach((client) => {
            const authenticatedWs = client as AuthenticatedWebSocket;

            // Skip excluded user
            if (options.excludeUserId && authenticatedWs.userId === options.excludeUserId) {
                console.log(`📢 Skipping excluded user ${options.excludeUserId}`);
                return;
            }

            this.sendToClient(client, message);
        });
    }

    /**
     * Broadcast message to all connected clients
     */
    public broadcast(message: WebSocketMessage, options: BroadcastOptions = {}): void {
        this.clients.forEach((client) => {
            const authenticatedWs = client as AuthenticatedWebSocket;

            // Skip excluded user
            if (options.excludeUserId && authenticatedWs.userId === options.excludeUserId) {
                return;
            }

            this.sendToClient(client, message);
        });
    }

    /**
     * Broadcast message to specific user
     */
    public broadcastToUser(userId: string, message: WebSocketMessage): void {
        const userConns = this.userConnections.get(userId);
        if (!userConns) {
            return;
        }

        userConns.forEach((client) => {
            this.sendToClient(client, message);
        });
    }

    /**
     * Get connection statistics
     */
    public getStats(): {
        totalConnections: number;
        totalRooms: number;
        totalUsers: number;
        connectionsPerRoom: { [roomId: string]: number };
        connectionsPerUser: { [userId: string]: number };
    } {
        const connectionsPerUser: { [userId: string]: number } = {};
        this.userConnections.forEach((conns, userId) => {
            connectionsPerUser[userId] = conns.size;
        });

        const roomStats = this.roomRegistry.getStats();

        return {
            totalConnections: this.clients.size,
            totalRooms: roomStats.totalRooms,
            totalUsers: this.userConnections.size,
            connectionsPerRoom: roomStats.connectionsPerRoom,
            connectionsPerUser
        };
    }

    /**
     * Close all connections
     */
    public closeAll(): void {
        this.clients.forEach((client) => {
            client.close(1001, 'Server shutting down');
        });
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let wsManagerInstance: FastifyWebSocketManager | null = null;

export function createWebSocketManager(fastify: FastifyInstance): FastifyWebSocketManager {
    if (!wsManagerInstance) {
        wsManagerInstance = new FastifyWebSocketManager(fastify);
    }
    return wsManagerInstance;
}

export function getWebSocketManager(): FastifyWebSocketManager | null {
    if (!wsManagerInstance) {
        console.warn('WebSocket manager not initialized yet');
    }
    return wsManagerInstance;
}

// ============================================================================
// EVENT BROADCASTER HELPERS
// ============================================================================

/**
 * Broadcast issue update
 */
export function broadcastIssueUpdate(issueId: string, data: any, excludeUserId?: string): void {
    const manager = getWebSocketManager();
    if (!manager) return;

    manager.broadcastToRoom(`issue:${issueId}`, {
        type: 'issue_updated',
        data: { issueId, ...data }
    }, { excludeUserId });
}

/**
 * Broadcast new issue
 */
export function broadcastNewIssue(projectId: string, issue: any, excludeUserId?: string): void {
    const manager = getWebSocketManager();
    if (!manager) return;

    manager.broadcastToRoom(`project:${projectId}`, {
        type: 'issue_created',
        data: { projectId, issue }
    }, { excludeUserId });
}

/**
 * Broadcast comment update
 */
export function broadcastCommentUpdate(issueId: string, comment: any, excludeUserId?: string): void {
    const manager = getWebSocketManager();
    if (!manager) {
        console.warn('WebSocket manager not available for comment broadcast');
        return;
    }

    console.log(`📢 Broadcasting comment update for issue ${issueId} to room issue:${issueId}`);
    manager.broadcastToRoom(`issue:${issueId}`, {
        type: 'comment_updated',
        data: { issueId, comment }
    }, { excludeUserId });
}

/**
 * Broadcast notification
 */
export function broadcastNotification(userId: string, notification: any): void {
    const manager = getWebSocketManager();
    if (!manager) return;

    manager.broadcastToUser(userId, {
        type: 'notification.created',  // Changed from 'notification' to 'notification.created' to match frontend listener
        data: notification
    });
}

/**
 * Broadcast project update
 */
export function broadcastProjectUpdate(projectId: string, data: any, excludeUserId?: string): void {
    const manager = getWebSocketManager();
    if (!manager) return;

    manager.broadcastToRoom(`project:${projectId}`, {
        type: 'project_updated',
        data: { projectId, ...data }
    }, { excludeUserId });
}

/**
 * Broadcast join request created event
 */
export function broadcastJoinRequestCreated(joinRequest: any): void {
    const manager = getWebSocketManager();
    if (!manager) return;

    manager.broadcast({
        type: 'join_request.created',
        data: { joinRequest }
    });
}

/**
 * Broadcast join request updated event (approved/rejected)
 */
export function broadcastJoinRequestUpdated(joinRequestId: string, status: 'pending' | 'approved' | 'rejected'): void {
    const manager = getWebSocketManager();
    if (!manager) return;

    manager.broadcast({
        type: 'join_request.updated',
        data: { joinRequestId, status }
    });
}
