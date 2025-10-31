<template>
  <Transition name="slide-up">
    <div v-if="show" class="chat-panel">
      <div class="chat-header">
        <div class="header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="header-title">Team Chat</span>
          <span class="user-count">{{ userCount }} online</span>
        </div>
        <button class="close-btn" @click="show = false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          :class="['message', { own: msg.isOwn }]"
        >
          <div class="message-avatar" :style="{ background: msg.userColor }">
            {{ msg.userName.charAt(0).toUpperCase() }}
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-author">{{ msg.userName }}</span>
              <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
            <div class="message-text">{{ msg.text }}</div>
          </div>
        </div>

        <div v-if="messages.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <p>No messages yet</p>
          <span>Start chatting with your team!</span>
        </div>
      </div>

      <div class="chat-input">
        <input
          v-model="newMessage"
          type="text"
          placeholder="Type a message..."
          @keyup.enter="sendMessage"
        />
        <button :disabled="!newMessage.trim()" @click="sendMessage">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>

  <!-- Chat Toggle Button -->
  <button v-if="!show && hasCollaborators" class="chat-toggle" @click="show = true">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';

interface ChatMessage {
  id: string;
  userName: string;
  userColor: string;
  text: string;
  timestamp: number;
  isOwn: boolean;
}

const props = defineProps<{
  userCount: number;
  hasCollaborators: boolean;
}>();

const show = ref(false);
const messages = ref<ChatMessage[]>([]);
const newMessage = ref('');
const unreadCount = ref(0);
const messagesContainer = ref<HTMLElement | null>(null);

watch(show, (isVisible) => {
  if (isVisible) {
    unreadCount.value = 0;
    nextTick(() => {
      scrollToBottom();
    });
  }
});

function sendMessage() {
  if (!newMessage.value.trim()) return;

  const msg: ChatMessage = {
    id: Date.now().toString(),
    userName: 'You',
    userColor: '#3b82f6',
    text: newMessage.value,
    timestamp: Date.now(),
    isOwn: true,
  };

  messages.value.push(msg);
  newMessage.value = '';
  
  nextTick(() => {
    scrollToBottom();
  });

  // TODO: Send to socket.io
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
}
</script>

<style scoped>
.chat-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 380px;
  height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  z-index: 1500;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);
  border-radius: 12px 12px 0 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.user-count {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 10px;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: #6b7280;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  gap: 10px;
  animation: slideIn 0.2s ease-out;
}

.message.own {
  flex-direction: row-reverse;
}

.message-avatar {
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

.message-content {
  max-width: 70%;
}

.message.own .message-content {
  align-items: flex-end;
}

.message-header {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
}

.message-author {
  font-weight: 600;
  color: #374151;
}

.message-time {
  color: #9ca3af;
}

.message-text {
  background: #f3f4f6;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  color: #111827;
  line-height: 1.5;
  word-wrap: break-word;
}

.message.own .message-text {
  background: #3b82f6;
  color: white;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  text-align: center;
  padding: 40px 20px;
}

.empty-state p {
  font-size: 16px;
  font-weight: 600;
  color: #6b7280;
  margin: 12px 0 4px;
}

.empty-state span {
  font-size: 13px;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: white;
  border-radius: 0 0 12px 12px;
}

.chat-input input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input input:focus {
  border-color: #3b82f6;
}

.chat-input button {
  padding: 10px 14px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.chat-input button:hover:not(:disabled) {
  background: #2563eb;
}

.chat-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-toggle {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1400;
  transition: all 0.2s;
}

.chat-toggle:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(59, 130, 246, 0.5);
}

.unread-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>

