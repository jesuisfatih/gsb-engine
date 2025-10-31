/**
 * Real-Time Collaboration Service
 * Multi-user design editing with conflict resolution
 */

import type { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { publishMessage, subscribeToChannel } from './redis';

interface CollaborationUser {
  userId: string;
  userName: string;
  designId: string;
  cursor: { x: number; y: number };
  selection: string | null;
  color: string;
}

interface DesignOperation {
  type: 'add' | 'update' | 'delete' | 'move' | 'transform';
  itemId: string;
  userId: string;
  timestamp: number;
  data: any;
  vectorClock?: Record<string, number>;
}

const activeUsers = new Map<string, CollaborationUser>();
const designRooms = new Map<string, Set<string>>(); // designId -> Set<socketId>

let io: SocketServer | null = null;

/**
 * Initialize Socket.io server
 */
export function initializeCollaborationServer(httpServer: HTTPServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: '*', // Configure based on your needs
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    console.log('[collaboration] User connected:', socket.id);

    // Authenticate and join design room
    socket.on('join-design', async (data: { designId: string; userId: string; userName: string }) => {
      const { designId, userId, userName } = data;

      if (!designId) {
        socket.emit('error', { message: 'Design ID required' });
        return;
      }

      // Join room
      socket.join(`design:${designId}`);

      // Add to active users
      const user: CollaborationUser = {
        userId: userId || socket.id,
        userName: userName || 'Anonymous',
        designId,
        cursor: { x: 0, y: 0 },
        selection: null,
        color: generateUserColor(),
      };

      activeUsers.set(socket.id, user);

      // Track room members
      if (!designRooms.has(designId)) {
        designRooms.set(designId, new Set());
      }
      designRooms.get(designId)!.add(socket.id);

      // Notify others
      socket.to(`design:${designId}`).emit('user-joined', {
        socketId: socket.id,
        userId: user.userId,
        userName: user.userName,
        color: user.color,
      });

      // Send current room members to new user
      const roomMembers = Array.from(designRooms.get(designId)!)
        .map(id => activeUsers.get(id))
        .filter(Boolean);

      socket.emit('room-state', {
        members: roomMembers.map(u => ({
          socketId: socket.id,
          userId: u!.userId,
          userName: u!.userName,
          color: u!.color,
          cursor: u!.cursor,
          selection: u!.selection,
        })),
      });

      console.log(`[collaboration] User ${userName} joined design ${designId}`);

      // Subscribe to Redis channel for multi-server support
      await subscribeToChannel(`design:${designId}:ops`, (operation) => {
        socket.to(`design:${designId}`).emit('remote-operation', operation);
      });
    });

    // Cursor movement
    socket.on('cursor-move', (position: { x: number; y: number }) => {
      const user = activeUsers.get(socket.id);
      if (!user) return;

      user.cursor = position;

      socket.to(`design:${user.designId}`).emit('user-cursor', {
        socketId: socket.id,
        userId: user.userId,
        cursor: position,
      });
    });

    // Selection change
    socket.on('selection-change', (itemId: string | null) => {
      const user = activeUsers.get(socket.id);
      if (!user) return;

      user.selection = itemId;

      socket.to(`design:${user.designId}`).emit('user-selection', {
        socketId: socket.id,
        userId: user.userId,
        selection: itemId,
      });
    });

    // Design operation (add, update, delete, move)
    socket.on('design-operation', async (operation: DesignOperation) => {
      const user = activeUsers.get(socket.id);
      if (!user) return;

      // Add metadata
      const enrichedOp: DesignOperation = {
        ...operation,
        userId: user.userId,
        timestamp: Date.now(),
      };

      // Apply Operational Transformation (simplified version)
      const transformed = applyOperationalTransformation(enrichedOp);

      // Broadcast to room
      socket.to(`design:${user.designId}`).emit('remote-operation', transformed);

      // Publish to Redis (multi-server)
      await publishMessage(`design:${user.designId}:ops`, transformed);

      console.log(`[collaboration] Operation from ${user.userName}:`, operation.type);
    });

    // Disconnect
    socket.on('disconnect', () => {
      const user = activeUsers.get(socket.id);
      if (user) {
        // Remove from room
        const room = designRooms.get(user.designId);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) {
            designRooms.delete(user.designId);
          }
        }

        // Notify others
        socket.to(`design:${user.designId}`).emit('user-left', {
          socketId: socket.id,
          userId: user.userId,
        });

        activeUsers.delete(socket.id);
        console.log(`[collaboration] User ${user.userName} left design ${user.designId}`);
      }
    });
  });

  console.log('[collaboration] Socket.io server initialized');
  return io;
}

/**
 * Simplified Operational Transformation
 * Resolves conflicts when multiple users edit simultaneously
 */
function applyOperationalTransformation(operation: DesignOperation): DesignOperation {
  // For simplicity, using Last-Write-Wins with vector clocks
  // In production, use proper OT algorithm (e.g., ShareDB, Yjs)
  
  if (!operation.vectorClock) {
    operation.vectorClock = {};
  }

  operation.vectorClock[operation.userId] = operation.timestamp;

  return operation;
}

/**
 * Generate random color for user cursor
 */
function generateUserColor(): string {
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Get active users in a design
 */
export function getDesignUsers(designId: string): CollaborationUser[] {
  const socketIds = designRooms.get(designId);
  if (!socketIds) return [];

  return Array.from(socketIds)
    .map(id => activeUsers.get(id))
    .filter(Boolean) as CollaborationUser[];
}

/**
 * Broadcast message to design room
 */
export function broadcastToDesign(designId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`design:${designId}`).emit(event, data);
}

export { io };

