/**
 * Real-Time Collaboration Composable
 * Multi-user design editing with live cursors and presence
 */

import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useEditorStore } from '../store/editorStore';
import { useSessionStore } from '@/modules/auth/stores/sessionStore';
import type { LayerItem } from '../types';

export interface RemoteUser {
  socketId: string;
  userId: string;
  userName: string;
  color: string;
  cursor: { x: number; y: number };
  selection: string | null;
}

interface DesignOperation {
  type: 'add' | 'update' | 'delete' | 'move' | 'transform';
  itemId: string;
  userId: string;
  timestamp: number;
  data: any;
}

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || window.location.origin;

export function useCollaboration(designId: string, enabled = true) {
  const editorStore = useEditorStore();
  const sessionStore = useSessionStore();

  const socket = ref<Socket | null>(null);
  const connected = ref(false);
  const remoteUsers = ref<Map<string, RemoteUser>>(new Map());
  const isEnabled = ref(enabled);

  const userCount = computed(() => remoteUsers.value.size);
  const hasCollaborators = computed(() => userCount.value > 0);

  let localOperationPending = false;

  /**
   * Connect to collaboration server
   */
  function connect() {
    if (!isEnabled.value || !designId) return;

    console.log('[collaboration] Connecting to:', SOCKET_URL);

    socket.value = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.value.on('connect', () => {
      console.log('[collaboration] Connected:', socket.value?.id);
      connected.value = true;

      // Join design room
      socket.value?.emit('join-design', {
        designId,
        userId: sessionStore.user?.id || `anon-${Date.now()}`,
        userName: sessionStore.user?.displayName || 'Anonymous User',
      });
    });

    socket.value.on('disconnect', () => {
      console.log('[collaboration] Disconnected');
      connected.value = false;
    });

    // User joined
    socket.value.on('user-joined', (user: RemoteUser) => {
      console.log('[collaboration] User joined:', user.userName);
      remoteUsers.value.set(user.socketId, user);
    });

    // User left
    socket.value.on('user-left', (data: { socketId: string }) => {
      console.log('[collaboration] User left:', data.socketId);
      remoteUsers.value.delete(data.socketId);
    });

    // Room state (existing users)
    socket.value.on('room-state', (data: { members: RemoteUser[] }) => {
      console.log('[collaboration] Room state:', data.members.length, 'users');
      remoteUsers.value.clear();
      data.members.forEach(member => {
        remoteUsers.value.set(member.socketId, member);
      });
    });

    // Remote cursor
    socket.value.on('user-cursor', (data: { socketId: string; userId: string; cursor: { x: number; y: number } }) => {
      const user = remoteUsers.value.get(data.socketId);
      if (user) {
        user.cursor = data.cursor;
        remoteUsers.value.set(data.socketId, { ...user });
      }
    });

    // Remote selection
    socket.value.on('user-selection', (data: { socketId: string; userId: string; selection: string | null }) => {
      const user = remoteUsers.value.get(data.socketId);
      if (user) {
        user.selection = data.selection;
        remoteUsers.value.set(data.socketId, { ...user });
      }
    });

    // Remote operation
    socket.value.on('remote-operation', (operation: DesignOperation) => {
      if (localOperationPending) return; // Ignore own operations

      console.log('[collaboration] Remote operation:', operation.type, operation.itemId);
      applyRemoteOperation(operation);
    });

    socket.value.on('error', (error: any) => {
      console.error('[collaboration] Socket error:', error);
    });
  }

  /**
   * Disconnect from collaboration server
   */
  function disconnect() {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
      connected.value = false;
      remoteUsers.value.clear();
    }
  }

  /**
   * Send cursor position
   */
  function sendCursorPosition(x: number, y: number) {
    if (!connected.value || !socket.value) return;
    socket.value.emit('cursor-move', { x, y });
  }

  /**
   * Send selection change
   */
  function sendSelection(itemId: string | null) {
    if (!connected.value || !socket.value) return;
    socket.value.emit('selection-change', itemId);
  }

  /**
   * Send design operation
   */
  function sendOperation(operation: Omit<DesignOperation, 'userId' | 'timestamp'>) {
    if (!connected.value || !socket.value) return;

    localOperationPending = true;

    socket.value.emit('design-operation', operation);

    // Reset flag after short delay
    setTimeout(() => {
      localOperationPending = false;
    }, 100);
  }

  /**
   * Apply remote operation to local state
   */
  function applyRemoteOperation(operation: DesignOperation) {
    const { type, itemId, data } = operation;

    switch (type) {
      case 'add':
        // Add new item
        if (!editorStore.items.find(item => item.id === itemId)) {
          editorStore.items.push(data);
        }
        break;

      case 'update':
        // Update existing item
        const updateIdx = editorStore.items.findIndex(item => item.id === itemId);
        if (updateIdx !== -1) {
          editorStore.items[updateIdx] = { ...editorStore.items[updateIdx], ...data };
        }
        break;

      case 'delete':
        // Remove item
        const deleteIdx = editorStore.items.findIndex(item => item.id === itemId);
        if (deleteIdx !== -1) {
          editorStore.items.splice(deleteIdx, 1);
        }
        break;

      case 'move':
      case 'transform':
        // Update position/transformation
        const moveIdx = editorStore.items.findIndex(item => item.id === itemId);
        if (moveIdx !== -1) {
          Object.assign(editorStore.items[moveIdx], data);
        }
        break;
    }

    // Force reactivity
    editorStore.items = [...editorStore.items];
  }

  /**
   * Watch for local changes and broadcast
   */
  function watchLocalChanges() {
    // Watch item additions
    let previousItemCount = editorStore.items.length;
    
    watch(() => editorStore.items.length, (newCount) => {
      if (newCount > previousItemCount && !localOperationPending) {
        const newItem = editorStore.items[newCount - 1];
        sendOperation({
          type: 'add',
          itemId: newItem.id,
          data: newItem,
        });
      } else if (newCount < previousItemCount && !localOperationPending) {
        // Item deleted - find which one
        // (simplified - in production, track deletions explicitly)
      }
      previousItemCount = newCount;
    });

    // Watch selected item changes
    watch(() => editorStore.selectedId, (newSelection) => {
      sendSelection(newSelection);
    });

    // Watch item updates (position, size, etc.)
    watch(() => editorStore.items, (newItems, oldItems) => {
      if (localOperationPending) return;

      // Find changed items
      newItems.forEach((newItem, idx) => {
        const oldItem = oldItems?.[idx];
        if (!oldItem) return;

        // Check if position changed
        if (newItem.x !== oldItem.x || newItem.y !== oldItem.y) {
          sendOperation({
            type: 'move',
            itemId: newItem.id,
            data: { x: newItem.x, y: newItem.y },
          });
        }

        // Check if transformed (size, rotation)
        if (
          (newItem as any).width !== (oldItem as any).width ||
          (newItem as any).height !== (oldItem as any).height ||
          newItem.rotation !== oldItem.rotation
        ) {
          sendOperation({
            type: 'transform',
            itemId: newItem.id,
            data: {
              width: (newItem as any).width,
              height: (newItem as any).height,
              rotation: newItem.rotation,
            },
          });
        }
      });
    }, { deep: true });
  }

  /**
   * Enable/disable collaboration
   */
  function toggle(state: boolean) {
    isEnabled.value = state;
    if (state) {
      connect();
    } else {
      disconnect();
    }
  }

  // Lifecycle
  onMounted(() => {
    if (isEnabled.value) {
      connect();
      watchLocalChanges();
    }
  });

  onBeforeUnmount(() => {
    disconnect();
  });

  return {
    socket,
    connected,
    remoteUsers,
    userCount,
    hasCollaborators,
    isEnabled,
    connect,
    disconnect,
    toggle,
    sendCursorPosition,
    sendSelection,
  };
}

/**
 * Generate random color for user
 */
function generateUserColor(): string {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

