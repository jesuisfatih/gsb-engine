<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { definePage } from "unplugin-vue-router/runtime";
import {
  useMerchantEmbeddedStore,
  type PanelCard,
  type PanelAction,
} from "../../../modules/merchant/stores/merchantEmbeddedStore";

definePage({
  meta: {
    layout: "shopify-embedded",
  },
});

const store = useMerchantEmbeddedStore();
const { sections, progressBySection, activityLog, appBootstrap, shopifyIntegration } =
  storeToRefs(store);

const navigationLinks = computed(() =>
  sections.value.map(({ id, title }) => ({
    id,
    title,
  })),
);

const sectionProgressLookup = computed(() => {
  const map = new Map<string, (typeof progressBySection.value)[number]>();
  progressBySection.value.forEach((entry) => {
    map.set(entry.sectionId, entry);
  });
  return map;
});

const statusOptions = [
  { value: "not-started", label: "Not started" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Completed" },
] as const;

const appUrlDraft = ref(appBootstrap.value.appUrl);
const appUrlError = ref<string | null>(null);

watch(
  () => appBootstrap.value.appUrl,
  (value) => {
    appUrlDraft.value = value;
  },
);

function saveAppUrl() {
  const trimmed = appUrlDraft.value.trim();
  if (!trimmed) {
    appUrlError.value = "App URL is required.";
    return;
  }
  try {
    const parsed = new URL(trimmed);
    if (!["https:", "http:"].includes(parsed.protocol)) {
      appUrlError.value = "URL must start with http or https.";
      return;
    }
    appUrlError.value = null;
    store.setAppUrl(parsed.toString().replace(/\/$/, ""));
  } catch (error) {
    appUrlError.value = "Enter a valid URL.";
  }
}

const newRedirect = ref("");
const redirectError = ref<string | null>(null);

function submitRedirect() {
  const trimmed = newRedirect.value.trim();
  if (!trimmed) {
    redirectError.value = "Redirect URL cannot be empty.";
    return;
  }
  try {
    const parsed = new URL(trimmed);
    redirectError.value = null;
    store.addRedirect(parsed.toString());
    newRedirect.value = "";
  } catch (error) {
    redirectError.value = "Provide a valid URL.";
  }
}

function deleteRedirect(url: string) {
  store.removeRedirect(url);
}

const tokenKeys = ["storefront", "admin", "mockup"] as const;
type TokenKey = typeof tokenKeys[number];

function rotateToken(key: TokenKey) {
  store.rotateToken(key);
}

function markTokenStatus(
  key: TokenKey,
  status: "active" | "pending" | "rotation-needed",
) {
  store.setTokenStatus(key, status);
}

const newRole = reactive({
  email: "",
  role: "Merchant Staff" as "Merchant Admin" | "Merchant Staff" | "Support",
});
const roleError = ref<string | null>(null);

function inviteRole() {
  const email = newRole.email.trim();
  if (!email) {
    roleError.value = "Email is required.";
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    roleError.value = "Enter a valid email address.";
    return;
  }
  store.upsertRoleAssignment({
    email,
    role: newRole.role,
    status: "Invitation sent",
    lastSeen: "",
  });
  roleError.value = null;
  newRole.email = "";
  newRole.role = "Merchant Staff";
}

function removeRole(email: string) {
  store.removeRole(email);
}

type RoleStatusOption = "Active" | "Invitation sent" | "Disabled";

function setRoleStatus(email: string, status: RoleStatusOption) {
  store.updateRoleStatus(email, status);
}

function onRoleStatusChange(event: Event, email: string) {
  const value = (event.target as HTMLSelectElement).value as RoleStatusOption;
  setRoleStatus(email, value);
}

const productSyncStatus = computed(() => shopifyIntegration.value.productSync.status);
const productSyncRunning = computed(() => productSyncStatus.value === "running");
const productSyncStatusText = computed(() => {
  switch (productSyncStatus.value) {
    case "success":
      return "Catalog in sync";
    case "running":
      return "Sync running";
    case "failed":
      return "Sync failed";
    default:
      return "Not started";
  }
});

function triggerProductSync() {
  store.runProductSync();
}

function toggleAutoSync(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  store.setProductAutoSync(checked);
}

function markProductSyncError() {
  store.markProductSyncFailed("Manual review required");
}

const surfaceOptions = ["tshirt-front", "tshirt-back", "pocket-dtf", "mug-wrap", "gangsheet"] as const;
const techniqueOptions = ["DTF", "DTG", "Sublimation", "Screen Print", "Embroidery"] as const;

function handleSurfaceChange(id: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  store.updateVariantMappingSurface(id, value);
}

function handleTechniqueChange(id: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  store.updateVariantMappingTechnique(id, value);
}

function handleMappingStatusChange(id: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value as "linked" | "pending" | "missing";
  store.setVariantMappingStatus(id, value);
}

const webhookStatusOptions = ["connected", "retrying", "failed"] as const;

function handleWebhookToggle(topic: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  store.toggleWebhook(topic, checked);
}

function handleWebhookStatusChange(topic: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value as "connected" | "retrying" | "failed";
  store.setWebhookStatus(topic, value);
}

function onChecklistToggle(sectionId: string, cardId: string, index: number) {
  store.toggleChecklist(sectionId, cardId, index);
}

function onStatusChange(sectionId: string, card: PanelCard, raw: Event) {
  const value = (raw.target as HTMLSelectElement).value as
    | "not-started"
    | "in-progress"
    | "done";
  store.setStatus(sectionId, card.id, value);
}

function handleAction(sectionId: string, cardId: string, action: PanelAction) {
  store.runAction(sectionId, cardId, action);
}
</script>

<template>
  <div class="embedded-layout">
    <aside class="side-panel">
      <h2 class="side-title">Setup guide</h2>
      <nav class="side-nav">
        <a
          v-for="item in navigationLinks"
          :key="item.id"
          :href="`#${item.id}`"
          class="side-link"
        >
          {{ item.title }}
        </a>
      </nav>
    </aside>

    <div class="content-column">
      <section
        v-for="section in sections"
        :id="section.id"
        :key="section.id"
        class="panel-section"
      >
        <header class="section-header">
          <div>
            <h3 class="section-title">{{ section.title }}</h3>
            <p class="section-description">
              {{ section.description }}
            </p>
          </div>
          <div
            v-if="sectionProgressLookup.get(section.id)?.totalItems"
            class="section-progress"
          >
            <span class="progress-label">
              {{
                sectionProgressLookup.get(section.id)?.completedItems
              }} /
              {{ sectionProgressLookup.get(section.id)?.totalItems }}
              tasks
            </span>
            <div class="progress-bar">
              <div
                class="progress-bar-fill"
                :style="{
                  width: `${sectionProgressLookup.get(section.id)?.percent ?? 0}%`,
                }"
              />
            </div>
          </div>
        </header>

        <div class="card-grid">
          <article v-for="card in section.cards" :key="card.id" class="panel-card">
            <header class="card-header">
              <div>
                <h4 class="card-title">{{ card.title }}</h4>
                <p class="card-description">{{ card.description }}</p>
              </div>
              <span
                v-if="card.status && card.statusLabel"
                class="status-badge"
                :data-status="card.status"
              >
                {{ card.statusLabel }}
              </span>
            </header>

            <div
              v-if="section.id === 'app-bootstrap' && card.id === 'app-url'"
              class="app-url-form"
            >
              <label class="input-label">
                App URL
                <input
                  v-model="appUrlDraft"
                  type="url"
                  class="text-input"
                  placeholder="https://gsb.example.com"
                  @blur="saveAppUrl"
                  @keyup.enter.prevent="saveAppUrl"
                />
              </label>
              <p v-if="appUrlError" class="field-error">
                {{ appUrlError }}
              </p>
              <div class="redirect-list">
                <div class="redirect-header">
                  <span>Redirect URLs</span>
                  <form
                    class="redirect-form"
                    @submit.prevent="submitRedirect"
                  >
                    <input
                      v-model="newRedirect"
                      type="url"
                      class="text-input"
                      placeholder="https://..."
                    />
                    <button type="submit" class="action-btn" data-variant="secondary">
                      Add
                    </button>
                  </form>
                  <p v-if="redirectError" class="field-error">
                    {{ redirectError }}
                  </p>
                </div>
                <ul>
                  <li v-for="url in appBootstrap.redirectUrls" :key="url">
                    <span class="redirect-url">{{ url }}</span>
                    <button
                      type="button"
                      class="link-button"
                      @click="deleteRedirect(url)"
                    >
                      Remove
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <div
              v-else-if="section.id === 'app-bootstrap' && card.id === 'token-management'"
              class="token-grid"
            >
              <div
                v-for="key in tokenKeys"
                :key="key"
                class="token-card"
              >
                <div class="token-heading">
                  <h5>{{ appBootstrap.tokens[key].label }}</h5>
                  <span class="token-status" :data-status="appBootstrap.tokens[key].status">
                    {{ appBootstrap.tokens[key].status }}
                  </span>
                </div>
                <code class="token-value">
                  {{ appBootstrap.tokens[key].value || "Not set" }}
                </code>
                <p class="token-meta">
                  Last rotated:
                  {{
                    appBootstrap.tokens[key].lastRotated
                      ? new Date(appBootstrap.tokens[key].lastRotated).toLocaleString()
                      : "—"
                  }}
                </p>
                <div class="token-actions">
                  <button
                    type="button"
                    class="action-btn"
                    data-variant="secondary"
                    @click="rotateToken(key)"
                  >
                    Rotate
                  </button>
                  <div class="token-status-group">
                    <button
                      type="button"
                      class="status-chip"
                      data-status="active"
                      @click="markTokenStatus(key, 'active')"
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      class="status-chip"
                      data-status="pending"
                      @click="markTokenStatus(key, 'pending')"
                    >
                      Pending
                    </button>
                    <button
                      type="button"
                      class="status-chip"
                      data-status="rotation-needed"
                      @click="markTokenStatus(key, 'rotation-needed')"
                    >
                      Rotate soon
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else-if="section.id === 'app-bootstrap' && card.id === 'role-assignment'"
              class="role-manager"
            >
              <form class="role-form" @submit.prevent="inviteRole">
                <input
                  v-model="newRole.email"
                  type="email"
                  class="text-input"
                  placeholder="team@merchant.com"
                  required
                />
                <select v-model="newRole.role" class="text-input">
                  <option value="Merchant Admin">Merchant Admin</option>
                  <option value="Merchant Staff">Merchant Staff</option>
                  <option value="Support">Support</option>
                </select>
                <button type="submit" class="action-btn">
                  Invite
                </button>
              </form>
              <p v-if="roleError" class="field-error">
                {{ roleError }}
              </p>
              <table class="role-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last seen</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="assignment in appBootstrap.roleAssignments" :key="assignment.email">
                    <td>{{ assignment.email }}</td>
                    <td>{{ assignment.role }}</td>
                    <td>
                      <select
                        :value="assignment.status"
                        class="text-input"
                        @change="onRoleStatusChange($event, assignment.email)"
                      >
                        <option value="Active">Active</option>
                        <option value="Invitation sent">Invitation sent</option>
                        <option value="Disabled">Disabled</option>
                      </select>
                    </td>
                    <td>
                      {{
                        assignment.lastSeen
                          ? new Date(assignment.lastSeen).toLocaleString()
                          : "—"
                      }}
                    </td>
                    <td>
                      <button
                        type="button"
                        class="link-button"
                        @click="removeRole(assignment.email)"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              v-else-if="section.id === 'shopify-integration' && card.id === 'product-import'"
              class="polaris-card polaris-card--flush"
            >
              <header class="polaris-card__header">
                <div class="polaris-card__header-leading">
                  <span class="status-pill" :data-status="productSyncStatus">
                    {{ productSyncStatusText }}
                  </span>
                  <span class="subdued-text">
                    {{
                      shopifyIntegration.productSync.lastRun
                        ? `Last run ${new Date(shopifyIntegration.productSync.lastRun).toLocaleString()}`
                        : "No sync history yet"
                    }}
                  </span>
                </div>
                <div class="polaris-button-group">
                  <button
                    type="button"
                    class="polaris-button polaris-button--primary"
                    :disabled="productSyncRunning"
                    @click="triggerProductSync"
                  >
                    {{ productSyncRunning ? "Running…" : "Run sync" }}
                  </button>
                  <button
                    type="button"
                    class="polaris-button polaris-button--plain"
                    @click="markProductSyncError"
                  >
                    Mark failed
                  </button>
                </div>
              </header>
              <div class="polaris-card__section">
                <label class="polaris-choice">
                  <input
                    type="checkbox"
                    :checked="shopifyIntegration.productSync.autoSync"
                    @change="toggleAutoSync"
                  />
                  <span>Nightly auto-sync (02:00 AM UTC)</span>
                </label>
              </div>
              <div class="polaris-card__section polaris-card__section--subdued">
                <div class="meta-grid">
                  <div>
                    <span class="meta-label">Last run</span>
                    <span class="meta-value">
                      {{
                        shopifyIntegration.productSync.lastRun
                          ? new Date(shopifyIntegration.productSync.lastRun).toLocaleString()
                          : "—"
                      }}
                    </span>
                  </div>
                  <div>
                    <span class="meta-label">Next run</span>
                    <span class="meta-value">
                      {{
                        shopifyIntegration.productSync.nextRun
                          ? new Date(shopifyIntegration.productSync.nextRun).toLocaleString()
                          : "—"
                      }}
                    </span>
                  </div>
                  <div>
                    <span class="meta-label">Auto sync</span>
                    <span class="meta-value">
                      {{ shopifyIntegration.productSync.autoSync ? "Enabled" : "Disabled" }}
                    </span>
                  </div>
                </div>
                <p
                  v-if="shopifyIntegration.productSync.error"
                  class="field-error mt-2"
                >
                  {{ shopifyIntegration.productSync.error }}
                </p>
              </div>
            </div>

            <div
              v-else-if="section.id === 'shopify-integration' && card.id === 'variant-mapping'"
              class="polaris-card"
            >
              <header class="polaris-card__header polaris-card__header--flush">
                <div>
                  <span class="subdued-text">
                    Map Shopify variants to print surfaces and default techniques.
                  </span>
                </div>
                <div class="polaris-button-group">
                  <button type="button" class="polaris-button polaris-button--plain">
                    Upload CSV
                  </button>
                  <button type="button" class="polaris-button polaris-button--plain">
                    Auto match
                  </button>
                </div>
              </header>
              <div class="polaris-resource-list">
                <div
                  v-for="entry in shopifyIntegration.variantMappings"
                  :key="entry.id"
                  class="polaris-resource-item"
                >
                  <div class="resource-leading">
                    <div class="resource-title">{{ entry.productTitle }}</div>
                    <div class="subdued-text">{{ entry.variantTitle }}</div>
                  </div>
                  <div class="resource-controls">
                    <label class="resource-field">
                      <span>Surface</span>
                      <select
                        :value="entry.surface"
                        class="text-input"
                        @change="handleSurfaceChange(entry.id, $event)"
                      >
                        <option value="">Select</option>
                        <option v-for="surface in surfaceOptions" :key="surface" :value="surface">
                          {{ surface }}
                        </option>
                      </select>
                    </label>
                    <label class="resource-field">
                      <span>Technique</span>
                      <select
                        :value="entry.technique"
                        class="text-input"
                        @change="handleTechniqueChange(entry.id, $event)"
                      >
                        <option value="">Select</option>
                        <option v-for="technique in techniqueOptions" :key="technique" :value="technique">
                          {{ technique }}
                        </option>
                      </select>
                    </label>
                    <label class="resource-field">
                      <span>Status</span>
                      <select
                        :value="entry.status"
                        class="text-input"
                        @change="handleMappingStatusChange(entry.id, $event)"
                      >
                        <option value="linked">Linked</option>
                        <option value="pending">Pending</option>
                        <option value="missing">Missing</option>
                      </select>
                    </label>
                    <span class="status-pill" :data-status="entry.status">
                      {{ entry.status }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else-if="section.id === 'shopify-integration' && card.id === 'webhooks'"
              class="polaris-card polaris-card--flush"
            >
              <div
                v-for="endpoint in shopifyIntegration.webhooks"
                :key="endpoint.topic"
                class="polaris-card__section polaris-card__section--list"
              >
                <div class="webhook-row">
                  <div class="webhook-primary">
                    <label class="polaris-choice">
                      <input
                        type="checkbox"
                        :checked="endpoint.enabled"
                        @change="handleWebhookToggle(endpoint.topic, $event)"
                      />
                      <span class="webhook-topic">{{ endpoint.topic }}</span>
                    </label>
                    <span class="subdued-text mono">{{ endpoint.url }}</span>
                  </div>
                  <div class="webhook-controls">
                    <select
                      :value="endpoint.status"
                      class="text-input"
                      @change="handleWebhookStatusChange(endpoint.topic, $event)"
                    >
                      <option v-for="status in webhookStatusOptions" :key="status" :value="status">
                        {{ status }}
                      </option>
                    </select>
                    <span class="status-pill" :data-status="endpoint.status">
                      {{
                        endpoint.status === "connected"
                          ? "Healthy"
                          : endpoint.status === "retrying"
                            ? `Retrying (${endpoint.retries})`
                            : "Check endpoint"
                      }}
                    </span>
                  </div>
                </div>
                <div class="webhook-meta">
                  <div>
                    <span class="meta-label">Last response</span>
                    <span class="meta-value">
                      {{
                        endpoint.lastResponse
                          ? new Date(endpoint.lastResponse).toLocaleString()
                          : "—"
                      }}
                    </span>
                  </div>
                  <div>
                    <span class="meta-label">Retries</span>
                    <span class="meta-value">{{ endpoint.retries }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="card.status" class="status-row">
              <label class="status-label">
                Status
                <select
                  :value="card.status"
                  class="status-select"
                  @change="onStatusChange(section.id, card, $event)"
                >
                  <option
                    v-for="option in statusOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <span v-if="card.statusLabel" class="status-caption">
                {{ card.statusLabel }}
              </span>
            </div>

            <ul v-if="card.checklist?.length" class="checklist">
              <li
                v-for="(item, itemIndex) in card.checklist"
                :key="item.text"
              >
                <label class="checkbox">
                  <input
                    type="checkbox"
                    :checked="item.completed"
                    @change="onChecklistToggle(section.id, card.id, itemIndex)"
                  />
                  <span>{{ item.text }}</span>
                </label>
              </li>
            </ul>

            <div v-if="card.metrics?.length" class="metric-grid">
              <div
                v-for="metric in card.metrics"
                :key="metric.label"
                class="metric-pill"
                :data-tone="metric.tone ?? 'neutral'"
              >
                <span class="metric-label">{{ metric.label }}</span>
                <span class="metric-value">{{ metric.value }}</span>
              </div>
            </div>

            <div v-if="card.actions?.length" class="card-actions">
              <button
                v-for="action in card.actions"
                :key="action.label"
                type="button"
                class="action-btn"
                :data-variant="action.variant ?? 'primary'"
                @click="handleAction(section.id, card.id, action)"
              >
                {{ action.label }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="activity-section">
        <header class="activity-header">
          <h3>Recent updates</h3>
          <p class="activity-subtitle">
            Checklist toggles and status changes are captured locally for quick
            review.
          </p>
        </header>
        <ul class="activity-log">
          <li v-if="!activityLog.length" class="empty-log">
            No activity yet. Update any checklist item to populate this feed.
          </li>
          <li v-for="entry in activityLog" :key="entry.timestamp" class="activity-item">
            <div class="activity-meta">
              <span class="activity-time">
                {{ new Date(entry.timestamp).toLocaleString() }}
              </span>
              <span class="activity-location">
                {{ entry.sectionId }} → {{ entry.cardId }}
              </span>
            </div>
            <p class="activity-action">{{ entry.action }}</p>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.embedded-layout {
  display: grid;
  grid-template-columns: minmax(220px, 260px) 1fr;
  gap: clamp(16px, 3vw, 32px);
  align-items: start;
}

.side-panel {
  position: sticky;
  top: 84px;
  background: #ffffff;
  border: 1px solid rgba(32, 34, 35, 0.08);
  border-radius: 16px;
  padding: 20px 16px;
}

.side-title {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(32, 34, 35, 0.6);
  margin-bottom: 12px;
}

.side-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.side-link {
  display: block;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.95rem;
  color: #202223;
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.side-link:hover,
.side-link:focus-visible {
  background: rgba(62, 85, 229, 0.08);
  color: #3f4af0;
}

.content-column {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.section-title {
  font-size: 1.35rem;
  font-weight: 600;
  color: #202223;
  margin-bottom: 6px;
}

.section-description {
  font-size: 0.95rem;
  color: rgba(32, 34, 35, 0.7);
  max-width: 680px;
}

.section-progress {
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.progress-label {
  font-size: 0.78rem;
  color: rgba(32, 34, 35, 0.6);
  font-weight: 600;
}

.progress-bar {
  width: 160px;
  height: 6px;
  background: rgba(32, 34, 35, 0.1);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #5c6ac4;
  border-radius: inherit;
  transition: width 0.2s ease;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}

.panel-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(32, 34, 35, 0.08);
  padding: 22px;
  box-shadow: 0 1px 0 rgba(32, 34, 35, 0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 240px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #202223;
}

.card-description {
  font-size: 0.92rem;
  color: rgba(32, 34, 35, 0.68);
}

.app-url-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(32, 34, 35, 0.6);
  font-weight: 600;
}

.text-input {
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(32, 34, 35, 0.18);
  font-size: 0.92rem;
  background: #ffffff;
  color: #202223;
}

.text-input:focus-visible {
  outline: 2px solid rgba(92, 106, 196, 0.35);
  outline-offset: 2px;
}

.field-error {
  font-size: 0.8rem;
  color: #c72c2e;
  margin: -6px 0 4px;
}

.field-error.mt-2 {
  margin-top: 8px;
}

.redirect-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.redirect-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-weight: 600;
  font-size: 0.88rem;
  color: #202223;
}

.redirect-form {
  display: flex;
  gap: 8px;
}

.redirect-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.redirect-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid rgba(32, 34, 35, 0.1);
  border-radius: 10px;
  background: rgba(246, 246, 247, 0.6);
}

.redirect-url {
  font-family: "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  font-size: 0.85rem;
  color: rgba(32, 34, 35, 0.78);
  overflow-wrap: anywhere;
}

.link-button {
  border: none;
  background: none;
  color: #3f4af0;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
}

.link-button:hover {
  text-decoration: underline;
}

.token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.token-card {
  border: 1px solid rgba(32, 34, 35, 0.12);
  border-radius: 14px;
  padding: 14px;
  background: rgba(246, 246, 247, 0.7);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.token-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.token-heading h5 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
  color: #202223;
}

.token-status {
  font-size: 0.72rem;
  padding: 2px 10px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.token-status[data-status="active"] {
  background: rgba(0, 128, 96, 0.16);
  color: #006c4f;
}

.token-status[data-status="pending"] {
  background: rgba(62, 85, 229, 0.16);
  color: #3f4af0;
}

.token-status[data-status="rotation-needed"] {
  background: rgba(185, 137, 0, 0.16);
  color: #8a6116;
}

.token-value {
  display: block;
  font-size: 0.82rem;
  padding: 8px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid rgba(32, 34, 35, 0.1);
  overflow-wrap: anywhere;
}

.token-meta {
  font-size: 0.8rem;
  color: rgba(32, 34, 35, 0.6);
}

.token-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.token-status-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.status-chip {
  border: 1px solid rgba(32, 34, 35, 0.2);
  background: #ffffff;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.status-chip[data-status="active"] {
  color: #006c4f;
  border-color: rgba(0, 128, 96, 0.35);
}

.status-chip[data-status="pending"] {
  color: #3f4af0;
  border-color: rgba(62, 85, 229, 0.35);
}

.status-chip[data-status="rotation-needed"] {
  color: #8a6116;
  border-color: rgba(185, 137, 0, 0.35);
}

.role-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.role-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.role-table th,
.role-table td {
  border-bottom: 1px solid rgba(32, 34, 35, 0.1);
  padding: 10px 8px;
  text-align: left;
}

.role-table th {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(32, 34, 35, 0.6);
}

.role-table tbody tr:last-child td {
  border-bottom: none;
}

.polaris-card {
  border: 1px solid rgba(32, 34, 35, 0.12);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.polaris-card--flush {
  border-radius: 12px;
}

.polaris-card__header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  border-bottom: 1px solid rgba(32, 34, 35, 0.08);
  background: rgba(249, 250, 251, 0.9);
}

.polaris-card__header--flush {
  background: transparent;
}

.polaris-card__header-leading {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.polaris-card__section {
  padding: 18px 20px;
  border-bottom: 1px solid rgba(32, 34, 35, 0.08);
}

.polaris-card__section:last-child {
  border-bottom: none;
}

.polaris-card__section--subdued {
  background: rgba(246, 246, 247, 0.6);
}

.polaris-card__section--list {
  border-bottom: 1px solid rgba(32, 34, 35, 0.08);
}

.polaris-card__section--list:last-of-type {
  border-bottom: none;
}

.polaris-button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.polaris-button {
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 0.9rem;
  font-weight: 600;
  border: 1px solid transparent;
  background: transparent;
  color: #3f4af0;
}

.polaris-button--primary {
  background: #2c6ecb;
  border-color: #2c6ecb;
  color: #ffffff;
}

.polaris-button--plain {
  color: #2c6ecb;
}

.polaris-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.polaris-choice {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.88rem;
  color: rgba(32, 34, 35, 0.78);
}

.polaris-choice input {
  width: 16px;
  height: 16px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(62, 85, 229, 0.08);
  color: #3f4af0;
}

.status-pill[data-status="success"],
.status-pill[data-status="active"],
.status-pill[data-status="linked"] {
  background: rgba(0, 128, 96, 0.12);
  color: #006c4f;
}

.status-pill[data-status="running"],
.status-pill[data-status="pending"],
.status-pill[data-status="retrying"] {
  background: rgba(62, 85, 229, 0.12);
  color: #2c6ecb;
}

.status-pill[data-status="failed"],
.status-pill[data-status="missing"],
.status-pill[data-status="rotation-needed"] {
  background: rgba(199, 44, 46, 0.12);
  color: #c72c2e;
}

.subdued-text {
  font-size: 0.86rem;
  color: rgba(32, 34, 35, 0.6);
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
}

.meta-label {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(32, 34, 35, 0.55);
  font-weight: 600;
}

.meta-value {
  font-size: 0.88rem;
  color: rgba(32, 34, 35, 0.85);
}

.meta-value.mono,
.mono {
  font-family: "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
}

.polaris-resource-list {
  display: flex;
  flex-direction: column;
}

.polaris-resource-item {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 20px;
  border-top: 1px solid rgba(32, 34, 35, 0.08);
}

.polaris-resource-item:first-of-type {
  border-top: none;
}

.resource-leading {
  flex: 1 1 220px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resource-title {
  font-weight: 600;
  color: #202223;
}

.resource-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  flex: 2 1 320px;
  align-items: end;
}

.resource-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(32, 34, 35, 0.55);
}

.webhook-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.webhook-primary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 240px;
}

.webhook-topic {
  font-weight: 600;
  color: #202223;
}

.webhook-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.webhook-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  flex-wrap: wrap;
}

.status-label {
  display: flex;
  flex-direction: column;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(32, 34, 35, 0.6);
  gap: 4px;
}

.status-select {
  min-width: 140px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(32, 34, 35, 0.2);
  font-size: 0.85rem;
  background: #f6f6f7;
}

.status-caption {
  font-size: 0.82rem;
  color: rgba(32, 34, 35, 0.76);
  font-weight: 600;
}

.status-badge {
  align-self: flex-start;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #202223;
}

.status-badge[data-status="done"] {
  background: rgba(0, 128, 96, 0.12);
  color: #006c4f;
}

.status-badge[data-status="in-progress"] {
  background: rgba(185, 137, 0, 0.12);
  color: #8a6116;
}

.status-badge[data-status="not-started"] {
  background: rgba(62, 85, 229, 0.12);
  color: #3f4af0;
}

.checklist {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checklist li {
  font-size: 0.92rem;
  color: rgba(32, 34, 35, 0.78);
}

.checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.checkbox input {
  margin-top: 4px;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(32, 34, 35, 0.22);
}

.checkbox span {
  flex: 1;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}

.metric-pill {
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.82rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid rgba(32, 34, 35, 0.1);
  background: rgba(246, 246, 247, 0.8);
}

.metric-pill[data-tone="positive"] {
  border-color: rgba(0, 128, 96, 0.4);
  background: rgba(0, 128, 96, 0.08);
  color: #006c4f;
}

.metric-pill[data-tone="warning"] {
  border-color: rgba(185, 137, 0, 0.4);
  background: rgba(185, 137, 0, 0.1);
  color: #8a6116;
}

.metric-pill[data-tone="critical"] {
  border-color: rgba(216, 31, 38, 0.4);
  background: rgba(216, 31, 38, 0.1);
  color: #c72c2e;
}

.metric-label {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  font-size: 0.7rem;
}

.metric-value {
  font-weight: 600;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-btn {
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  background: #5c6ac4;
  color: #ffffff;
}

.action-btn[data-variant="secondary"] {
  background: rgba(92, 106, 196, 0.05);
  color: #5c6ac4;
  border-color: rgba(92, 106, 196, 0.4);
}

.action-btn[data-variant="ghost"] {
  background: transparent;
  color: #5c6ac4;
  border-color: transparent;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(32, 34, 35, 0.12);
}

.activity-section {
  margin-top: 48px;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(32, 34, 35, 0.08);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 4px;
  color: #202223;
}

.activity-subtitle {
  font-size: 0.9rem;
  color: rgba(32, 34, 35, 0.65);
}

.activity-log {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-log {
  font-size: 0.9rem;
  color: rgba(32, 34, 35, 0.6);
  padding: 24px;
  border: 1px dashed rgba(32, 34, 35, 0.1);
  border-radius: 12px;
  background: rgba(246, 246, 247, 0.5);
}

.activity-item {
  border-left: 3px solid rgba(92, 106, 196, 0.2);
  padding-left: 12px;
}

.activity-meta {
  display: flex;
  gap: 10px;
  font-size: 0.78rem;
  color: rgba(32, 34, 35, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.activity-action {
  margin: 4px 0 0;
  font-size: 0.92rem;
  color: rgba(32, 34, 35, 0.8);
}

@media (max-width: 1100px) {
  .embedded-layout {
    grid-template-columns: 1fr;
  }

  .side-panel {
    position: static;
    order: 2;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-progress {
    width: 100%;
    align-items: flex-start;
  }

  .progress-bar {
    width: 100%;
  }
}
</style>
