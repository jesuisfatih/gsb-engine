<template>
  <div class="collaboration-cursors">
    <!-- Remote user cursors -->
    <div
      v-for="[socketId, user] in remoteUsers"
      :key="socketId"
      class="remote-cursor"
      :style="{
        left: user.cursor.x + 'px',
        top: user.cursor.y + 'px',
        '--user-color': user.color,
      }"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="cursor-icon">
        <path
          d="M5 3L19 12L12 14L9 21L5 3Z"
          :fill="user.color"
          stroke="white"
          stroke-width="1.5"
        />
      </svg>
      <div class="cursor-label">{{ user.userName }}</div>
    </div>

    <!-- User presence panel -->
    <Transition name="slide-left">
      <div v-if="hasCollaborators" class="presence-panel">
        <div class="presence-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3" stroke="currentColor" stroke-width="2" />
            <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          <span>{{ userCount }} {{ userCount === 1 ? 'collaborator' : 'collaborators' }}</span>
        </div>
        <div class="presence-users">
          <div
            v-for="[socketId, user] in remoteUsers"
            :key="socketId"
            class="presence-user"
          >
            <div class="user-avatar" :style="{ background: user.color }">
              {{ user.userName.charAt(0).toUpperCase() }}
            </div>
            <span class="user-name">{{ user.userName }}</span>
            <div class="user-status">
              <div class="status-dot online"></div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { RemoteUser } from '../composables/useCollaboration';

defineProps<{
  remoteUsers: Map<string, RemoteUser>;
  userCount: number;
  hasCollaborators: boolean;
}>();
</script>

<style scoped>
.collaboration-cursors {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1000;
}

.remote-cursor {
  position: absolute;
  pointer-events: none;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1001;
}

.cursor-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.cursor-label {
  position: absolute;
  top: 24px;
  left: 12px;
  background: var(--user-color);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.presence-panel {
  position: fixed;
  top: 80px;
  right: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 12px;
  min-width: 240px;
  pointer-events: auto;
  border: 1px solid #e5e7eb;
}

.presence-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.presence-users {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.presence-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.presence-user:hover {
  background: #f9fafb;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-name {
  flex: 1;
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.user-status {
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>

