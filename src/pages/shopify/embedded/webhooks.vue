<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { $api } from "@/utils/api";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { formatDate } from "@/@core/utils/formatters";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Webhooks",
    embeddedSubtitle: "Monitor and manage webhook delivery health",
  },
});

const notification = useNotificationStore();

interface WebhookEndpoint {
  id: string;
  topic: string;
  url: string;
  enabled: boolean;
  status: "connected" | "retrying" | "failed";
  retries: number;
  lastDeliveryAt?: string;
  lastError?: string;
  deliveryHistory: WebhookDelivery[];
}

interface WebhookDelivery {
  id: string;
  timestamp: string;
  status: "success" | "failed" | "retrying";
  statusCode?: number;
  error?: string;
}

const loading = ref(false);
const webhooks = ref<WebhookEndpoint[]>([]);
const expandedWebhooks = ref<Set<string>>(new Set());

const overallHealth = computed(() => {
  if (!webhooks.value.length) return { label: "Not configured", color: "warning" };
  
  const hasFailures = webhooks.value.some(w => w.status === "failed");
  const hasRetries = webhooks.value.some(w => w.status === "retrying");
  
  if (hasFailures) return { label: "Issues detected", color: "error" };
  if (hasRetries) return { label: "Retries detected", color: "warning" };
  
  return { label: "All endpoints healthy", color: "success" };
});

async function loadWebhooks() {
  loading.value = true;
  try {
    const response = await $api<{ data: WebhookEndpoint[] }>("/webhooks");
    webhooks.value = response.data ?? [];
  } catch (error) {
    console.error("[webhooks] Failed to load webhooks:", error);
    
    // Mock data for demo
    webhooks.value = [
      {
        id: "1",
        topic: "orders/create",
        url: "https://app.gsb-engine.dev/api/webhooks/orders/create",
        enabled: true,
        status: "connected",
        retries: 0,
        lastDeliveryAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        deliveryHistory: [
          { id: "1", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), status: "success", statusCode: 200 },
          { id: "2", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), status: "success", statusCode: 200 },
        ],
      },
      {
        id: "2",
        topic: "products/update",
        url: "https://app.gsb-engine.dev/api/webhooks/products/update",
        enabled: true,
        status: "retrying",
        retries: 2,
        lastDeliveryAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        lastError: "Connection timeout",
        deliveryHistory: [
          { id: "1", timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), status: "retrying", statusCode: 504, error: "Connection timeout" },
          { id: "2", timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), status: "failed", statusCode: 500, error: "Internal server error" },
        ],
      },
      {
        id: "3",
        topic: "products/create",
        url: "https://app.gsb-engine.dev/api/webhooks/products/create",
        enabled: false,
        status: "connected",
        retries: 0,
        deliveryHistory: [],
      },
    ];
  } finally {
    loading.value = false;
  }
}

function toggleWebhook(id: string) {
  const webhook = webhooks.value.find(w => w.id === id);
  if (!webhook) return;
  
  webhook.enabled = !webhook.enabled;
  
  // API call
  $api(`/webhooks/${id}`, {
    method: "PATCH",
    body: { enabled: webhook.enabled },
  }).catch(error => {
    console.error("[webhooks] Failed to toggle webhook:", error);
    webhook.enabled = !webhook.enabled; // Revert
    notification.error("Failed to toggle webhook");
  });
}

async function retryWebhook(id: string) {
  try {
    await $api(`/webhooks/${id}/retry`, { method: "POST" });
    notification.success("Webhook retry triggered");
    await loadWebhooks();
  } catch (error) {
    console.error("[webhooks] Failed to retry webhook:", error);
    notification.error("Failed to retry webhook");
  }
}

async function enableAllWebhooks() {
  try {
    await $api("/webhooks/enable-all", { method: "POST" });
    notification.success("All webhooks enabled");
    await loadWebhooks();
  } catch (error) {
    console.error("[webhooks] Failed to enable all webhooks:", error);
    notification.error("Failed to enable all webhooks");
  }
}

function toggleExpanded(id: string) {
  if (expandedWebhooks.value.has(id)) {
    expandedWebhooks.value.delete(id);
  } else {
    expandedWebhooks.value.add(id);
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "connected":
    case "success":
      return "tabler-check";
    case "retrying":
      return "tabler-clock";
    case "failed":
      return "tabler-x";
    default:
      return "tabler-circle-dot";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "connected":
    case "success":
      return "success";
    case "retrying":
      return "warning";
    case "failed":
      return "error";
    default:
      return "secondary";
  }
}

onMounted(() => {
  loadWebhooks();
});
</script>

<template>
  <div class="webhooks-page">
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-3">
          <span>Webhook Health</span>
          <VChip size="small" :color="overallHealth.color" variant="tonal">
            {{ overallHealth.label }}
          </VChip>
        </div>
        <VBtn variant="text" size="small" prepend-icon="tabler-refresh" @click="loadWebhooks">
          Refresh
        </VBtn>
      </VCardTitle>

      <VCardText>
        <!-- Empty State -->
        <template v-if="!loading && !webhooks.length">
          <div class="empty-state">
            <VIcon icon="tabler-webhook-off" size="64" color="primary" />
            <h3>Webhooks not connected</h3>
            <p>Enable webhooks to receive real-time notifications from Shopify</p>
            <VBtn color="primary" size="large" @click="enableAllWebhooks">
              Enable All Webhooks
            </VBtn>
          </div>
        </template>

        <!-- Webhooks List -->
        <template v-else-if="!loading">
          <div class="webhooks-list">
            <VCard
              v-for="webhook in webhooks"
              :key="webhook.id"
              class="webhook-card"
              variant="outlined"
            >
              <VCardText>
                <div class="webhook-header">
                  <div class="webhook-info">
                    <VCheckbox
                      :model-value="webhook.enabled"
                      :label="webhook.topic"
                      hide-details
                      density="compact"
                      @update:model-value="toggleWebhook(webhook.id)"
                    />
                    <code class="webhook-url">{{ webhook.url }}</code>
                  </div>

                  <div class="webhook-status">
                    <VChip size="small" :color="getStatusColor(webhook.status)" variant="tonal">
                      {{ webhook.status }}
                    </VChip>
                    <VChip v-if="webhook.retries > 0" size="small" color="warning" variant="tonal">
                      Retries: {{ webhook.retries }}
                    </VChip>
                    <VBtn
                      icon
                      variant="text"
                      size="small"
                      @click="toggleExpanded(webhook.id)"
                    >
                      <VIcon :icon="expandedWebhooks.has(webhook.id) ? 'tabler-chevron-up' : 'tabler-chevron-down'" />
                    </VBtn>
                  </div>
                </div>

                <!-- Expanded Details -->
                <VExpandTransition>
                  <div v-if="expandedWebhooks.has(webhook.id)" class="webhook-details">
                    <VDivider class="my-3" />

                    <div v-if="webhook.lastError" class="error-message">
                      <VIcon icon="tabler-alert-circle" size="20" color="error" />
                      <span>{{ webhook.lastError }}</span>
                    </div>

                    <div v-if="webhook.lastDeliveryAt" class="last-delivery">
                      <strong>Last Delivery:</strong>
                      {{ formatDate(webhook.lastDeliveryAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }}
                    </div>

                    <!-- Delivery History Timeline -->
                    <div v-if="webhook.deliveryHistory.length" class="delivery-timeline">
                      <h4 class="timeline-title">Recent Deliveries</h4>
                      <div class="timeline-list">
                        <div
                          v-for="delivery in webhook.deliveryHistory"
                          :key="delivery.id"
                          class="timeline-item"
                        >
                          <VIcon
                            :icon="getStatusIcon(delivery.status)"
                            size="16"
                            :color="getStatusColor(delivery.status)"
                          />
                          <div class="timeline-content">
                            <p class="timeline-status">
                              <strong>{{ delivery.status }}</strong>
                              <code v-if="delivery.statusCode">{{ delivery.statusCode }}</code>
                            </p>
                            <p v-if="delivery.error" class="timeline-error">{{ delivery.error }}</p>
                            <p class="timeline-time">
                              {{ formatDate(delivery.timestamp, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }) }}
                            </p>
                          </div>
                        </div>
                      </div>

                      <VBtn
                        v-if="webhook.status !== 'connected'"
                        variant="tonal"
                        size="small"
                        color="primary"
                        prepend-icon="tabler-refresh"
                        @click="retryWebhook(webhook.id)"
                      >
                        Retry Now
                      </VBtn>
                    </div>
                  </div>
                </VExpandTransition>
              </VCardText>
            </VCard>
          </div>
        </template>

        <!-- Loading State -->
        <div v-if="loading" class="text-center pa-8">
          <VProgressCircular indeterminate color="primary" />
          <p class="mt-4">Loading webhooks...</p>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>

<style scoped>
.webhooks-page {
  display: grid;
  gap: 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 24px;
  text-align: center;
  color: rgb(var(--v-theme-on-surface-variant));
}

.empty-state h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.empty-state p {
  margin: 0;
  max-width: 400px;
}

.webhooks-list {
  display: grid;
  gap: 16px;
}

.webhook-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
}

.webhook-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.webhook-info {
  flex: 1;
  min-width: 0;
}

.webhook-url {
  display: block;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
  font-family: 'Courier New', monospace;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.webhook-status {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.webhook-details {
  padding-top: 12px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-error), 0.1);
  color: rgb(var(--v-theme-error));
  font-size: 0.875rem;
  margin-bottom: 12px;
}

.last-delivery {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 16px;
}

.delivery-timeline {
  display: grid;
  gap: 12px;
}

.timeline-title {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 0;
}

.timeline-list {
  display: grid;
  gap: 12px;
  padding-left: 12px;
  border-left: 2px solid rgba(var(--v-border-color), 0.12);
  margin-bottom: 12px;
}

.timeline-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.timeline-content {
  flex: 1;
}

.timeline-status {
  margin: 0 0 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-status code {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(var(--v-theme-surface-variant), 0.4);
  font-family: 'Courier New', monospace;
}

.timeline-error {
  margin: 0 0 4px;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-error));
}

.timeline-time {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

@media (max-width: 960px) {
  .webhook-header {
    flex-direction: column;
    align-items: stretch;
  }

  .webhook-status {
    justify-content: space-between;
  }
}
</style>

