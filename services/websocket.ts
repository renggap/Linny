import { getAccessToken } from './api';

export interface WebSocketMessage {
    type: string;
    data?: any;
    roomId?: string;
}

export class WebSocketService {
    private connections: Map<string, WebSocket> = new Map();
    private baseUrl: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private messageHandlers: Map<string, (data: any) => void> = new Map();
    private subscribedRooms: Set<string> = new Set();

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getRoomUrl(roomId: string): string {
        const token = getAccessToken();
        if (!token) {
            throw new Error('No access token available for WebSocket connection');
        }

        // Extract room type and optional ID from roomId (e.g., "issue:123" -> "/ws/issue/123")
        const [roomType, roomParam] = roomId.split(':');

        // Routes that take no path param (room is implicit per authenticated user)
        const noParamRooms = new Set(['user', 'join-requests']);
        if (noParamRooms.has(roomType)) {
            return `${this.baseUrl}/ws/${roomType}?token=${token}`;
        }

        return `${this.baseUrl}/ws/${roomType}/${roomParam}?token=${token}`;
    }

    private connectToRoom(roomId: string): void {
        if (this.connections.has(roomId)) {
            console.log(`🔌 Already connected to room: ${roomId}`);
            return;
        }

        try {
            const wsUrl = this.getRoomUrl(roomId);
            console.log(`🔌 Attempting WebSocket connection to room ${roomId}: ${wsUrl}`);

            const ws = new WebSocket(wsUrl);
            this.connections.set(roomId, ws);

            ws.onopen = () => {
                console.log(`✅ WebSocket connected to room: ${roomId}`);
                this.reconnectAttempts = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    console.log(`📨 Message received in room ${roomId}:`, message.type);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            ws.onclose = (event) => {
                console.log(`🔌 WebSocket disconnected from room ${roomId} (code: ${event.code})`);
                this.connections.delete(roomId);

                // Attempt to reconnect if it wasn't a clean close
                if (event.code !== 1000 && event.code !== 1001) {
                    this.attemptReconnect(roomId);
                }
            };

            ws.onerror = (error) => {
                console.error(`❌ WebSocket error in room ${roomId}:`, error);
                // Connection will be cleaned up by onclose
            };

        } catch (error) {
            console.error(`Failed to connect to room ${roomId}:`, error);
        }
    }

    private disconnectFromRoom(roomId: string): void {
        const ws = this.connections.get(roomId);
        if (!ws) return;

        // Suppress browser "closed before established" warning when the
        // subscribe/unsubscribe cycle outpaces the WS handshake (e.g., user
        // opens and quickly closes an issue modal). If still CONNECTING,
        // defer the close until after open completes.
        if (ws.readyState === WebSocket.CONNECTING) {
            ws.onopen = () => {
                try { ws.close(1000, 'Client disconnecting'); } catch { /* already closed */ }
            };
        } else if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Client disconnecting');
        }
        // CLOSING / CLOSED — nothing to do; browser will fire onclose eventually.

        this.connections.delete(roomId);
    }

    private handleMessage(message: WebSocketMessage): void {
        console.log('📨 WebSocket message received:', message.type, message.data);
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            console.log('📨 Calling handler for:', message.type);
            handler(message.data);
        } else {
            console.log('📨 No handler found for:', message.type);
        }
    }

    private attemptReconnect(roomId: string): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            console.log(`🔄 Attempting to reconnect to room ${roomId}... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                this.connectToRoom(roomId);
            }, delay);
        } else {
            console.error(`❌ Max reconnection attempts reached for room ${roomId}. WebSocket will not reconnect automatically.`);
        }
    }

    public subscribe(roomId: string): void {
        console.log(`📢 Subscribing to room: ${roomId}`);
        this.subscribedRooms.add(roomId);
        this.connectToRoom(roomId);
    }

    public unsubscribe(roomId: string): void {
        console.log(`📢 Unsubscribing from room: ${roomId}`);
        this.subscribedRooms.delete(roomId);
        this.disconnectFromRoom(roomId);
    }

    public on(messageType: string, handler: (data: any) => void): void {
        this.messageHandlers.set(messageType, handler);
    }

    public off(messageType: string): void {
        this.messageHandlers.delete(messageType);
    }

    public disconnect(): void {
        console.log('🔌 Disconnecting from all rooms');
        this.connections.forEach((ws, _roomId) => {
            ws.close(1000, 'Client disconnecting');
        });
        this.connections.clear();
        this.subscribedRooms.clear();
    }

    public isConnected(roomId?: string): boolean {
        if (roomId) {
            const ws = this.connections.get(roomId);
            return ws !== undefined && ws.readyState === WebSocket.OPEN;
        }
        return this.connections.size > 0;
    }

    // Legacy method for backward compatibility
    public connect(): void {
        // Connect to all subscribed rooms
        this.subscribedRooms.forEach(roomId => {
            this.connectToRoom(roomId);
        });
    }
}

// Create singleton instance
// Use the same base URL as the API but with ws:// protocol.
// In production (no VITE_API_URL), fall back to current page origin so the
// browser connects to the host that served the bundle (nginx proxies /ws/*
// to the backend). Without this, production builds hardcoded ws://localhost:3001.
const apiUrl = (import.meta as any).env.VITE_API_URL
  || (typeof window !== 'undefined' && window.location ? window.location.origin : '');
const wsUrl = apiUrl.replace(/^http/, 'ws');
export const websocketService = new WebSocketService(wsUrl);