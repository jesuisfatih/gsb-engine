<template>
  <section class="ops-root">
    <header class="ops-header">
      <div>
        <h1>Production Operations Snapshot</h1>
        <p>
          Keep the manufacturing pipeline healthy: triage queued jobs, review auto-routing coverage, and spot audit
          anomalies before they become blockers.
        </p>
      </div>
      <div class="ops-actions">
        <VBtn
          color="primary"
          :loading="anyLoading"
          prepend-icon="tabler-refresh"
          @click="handleRefresh"
        >
          Refresh Data
        </VBtn>
      </div>
    </header>

    <div class="ops-grid">
      <article class="ops-card">
        <header class="ops-card-header">
          <h2>Active Jobs</h2>
          <span class="ops-chip">{{ jobs.length }} items</span>
        </header>
        <div class="ops-card-tools">
          <VChip
            v-for="option in jobStatusOptions"
            :key="option.value"
            :color="option.value === jobStatusFilter ? 'primary' : undefined"
            variant="outlined"
            size="small"
            class="ops-filter-chip"
            @click="setJobFilter(option.value)"
          >
            {{ option.label }}
          </VChip>
        </div>
        <ul class="ops-list" :class="{ 'is-loading': loading.jobs }">
          <li
            v-for="job in jobs"
            :key="job.id"
            class="ops-clickable"
            @click="openJob(job)"
          >
            <div class="ops-list-title">
              <span class="ops-badge" :data-status="job.status">{{ job.status }}</span>
              <span class="ops-id">#{{ job.id.slice(0, 8) }}</span>
            </div>
            <p class="ops-list-subtitle">
              {{ job.printTechnique?.name ?? 'Technique pending' }}
              <span v-if="job.assignedUser?.displayName">
                - Assigned to {{ job.assignedUser.displayName }}
              </span>
            </p>
            <p v-if="job.design?.submittedAt" class="ops-metadata">
              Submitted {{ formatDate(job.design.submittedAt) }}
            </p>
          </li>
          <li v-if="!jobs.length" class="ops-empty">No jobs match this filter.</li>
        </ul>
      </article>

      <article class="ops-card">
        <header class="ops-card-header">
          <h2>Notifications</h2>
          <span class="ops-chip">{{ notifications.length }} unread</span>
        </header>
        <ul class="ops-list" :class="{ 'is-loading': loading.notifications }">
          <li
            v-for="notification in notifications"
            :key="notification.id"
            class="ops-clickable"
            @click="acknowledgeNotification(notification.id)"
          >
            <div class="ops-list-title">
              <span class="ops-id">{{ notification.kind }}</span>
              <small>{{ formatDate(notification.createdAt) }}</small>
            </div>
            <p class="ops-list-subtitle">
              {{ renderNotificationPayload(notification.payload) }}
            </p>
            <p class="ops-metadata">Tap to mark as read</p>
          </li>
          <li v-if="!notifications.length" class="ops-empty">All caught up.</li>
        </ul>
      </article>

      <article class="ops-card">
        <header class="ops-card-header">
          <h2>Supplier Routing</h2>
          <span class="ops-chip">{{ routingRules.length }} rules</span>
        </header>
        <ul class="ops-list" :class="{ 'is-loading': loading.routing }">
          <li
            v-for="rule in routingRules"
            :key="rule.id"
            class="ops-clickable"
            @click="openRule(rule)"
          >
            <div class="ops-list-title">
              <span class="ops-id">{{ rule.technique.toUpperCase() }}</span>
              <small>{{ rule.region ?? 'All regions' }}</small>
            </div>
            <p class="ops-list-subtitle">
              {{ rule.supplier?.name ?? 'Supplier pending' }}
              <span v-if="rule.minQty || rule.maxQty">
                - Qty {{ rule.minQty ?? 0 }} to {{ rule.maxQty ?? 'unlimited' }}
              </span>
            </p>
            <p class="ops-metadata">Click for SLA and rule metadata</p>
          </li>
          <li v-if="!routingRules.length" class="ops-empty">No routing rules configured.</li>
        </ul>
      </article>

      <article class="ops-card">
        <header class="ops-card-header">
          <h2>Audit Stream</h2>
          <span class="ops-chip">{{ auditLogs.length }} entries</span>
        </header>
        <div class="ops-card-tools ops-audit-tools">
          <label class="ops-filter-label" for="audit-entity">Entity</label>
          <select id="audit-entity" v-model="auditEntityFilter" class="ops-select">
            <option value="all">All</option>
            <option v-for="entity in auditEntityOptions" :key="entity" :value="entity">{{ entity }}</option>
          </select>
        </div>
        <ul class="ops-list" :class="{ 'is-loading': loading.audit }">
          <li
            v-for="log in auditLogs"
            :key="log.id"
            class="ops-clickable"
            @click="openAudit(log)"
          >
            <div class="ops-list-title">
              <span class="ops-id">{{ log.event }}</span>
              <small>{{ formatDate(log.createdAt) }}</small>
            </div>
            <p class="ops-list-subtitle">
              {{ log.entity }} - {{ log.entityId ?? 'n/a' }}
              <span v-if="log.actor?.displayName">
                ({{ log.actor.displayName }})
              </span>
            </p>
            <p v-if="log.diff" class="ops-metadata">Diff available</p>
          </li>
          <li v-if="!auditLogs.length" class="ops-empty">No audit events for this filter.</li>
        </ul>
      </article>
    </div>

    <VDialog v-model="jobDialog" max-width="520">
      <VCard v-if="selectedJob">
        <VCardTitle class="ops-dialog-title">
          Job {{ selectedJob.id.slice(0, 8) }}
          <VChip color="primary" size="small" class="ops-inline-chip">{{ selectedJob.status }}</VChip>
        </VCardTitle>
        <VDivider />
        <VCardText class="ops-dialog-body">
          <dl>
            <div class="ops-field">
              <dt>Technique</dt>
              <dd>{{ selectedJob.printTechnique?.name ?? 'Not assigned' }}</dd>
            </div>
            <div class="ops-field">
              <dt>Supplier</dt>
              <dd>{{ selectedJob.supplier?.name ?? 'Pending routing' }}</dd>
            </div>
            <div class="ops-field" v-if="selectedJob.assignedUser">
              <dt>Owner</dt>
              <dd>{{ selectedJob.assignedUser.displayName ?? selectedJob.assignedUser.email }}</dd>
            </div>
            <div class="ops-field">
              <dt>Created</dt>
              <dd>{{ formatDate(selectedJob.createdAt ?? '') }}</dd>
            </div>
          </dl>
          <section v-if="selectedJob.design">
            <h3>Design</h3>
            <p>ID: {{ selectedJob.design.id }}</p>
            <p v-if="selectedJob.design.previewUrl">
              <a :href="selectedJob.design.previewUrl" target="_blank" rel="noopener">View preview</a>
            </p>
          </section>
          <section v-if="selectedJobOutputs.length">
            <h3>Outputs</h3>
            <ul class="ops-detail-list">
              <li v-for="output in selectedJobOutputs" :key="output.id">
                {{ output.kind }} -
                <a :href="output.url" target="_blank" rel="noopener">download</a>
              </li>
            </ul>
          </section>
        </VCardText>
      </VCard>
    </VDialog>

    <VDialog v-model="ruleDialog" max-width="520">
      <VCard v-if="selectedRule">
        <VCardTitle class="ops-dialog-title">
          Routing Rule
          <VChip size="small" class="ops-inline-chip" color="secondary">{{ selectedRule.technique }}</VChip>
        </VCardTitle>
        <VDivider />
        <VCardText class="ops-dialog-body">
          <dl>
            <div class="ops-field">
              <dt>Supplier</dt>
              <dd>{{ selectedRule.supplier?.name ?? 'Unknown supplier' }}</dd>
            </div>
            <div class="ops-field">
              <dt>Region</dt>
              <dd>{{ selectedRule.region ?? 'All regions' }}</dd>
            </div>
            <div class="ops-field">
              <dt>Quantity Range</dt>
              <dd>{{ selectedRule.minQty ?? 0 }} to {{ selectedRule.maxQty ?? 'unlimited' }}</dd>
            </div>
            <div class="ops-field" v-if="selectedRule.supplier?.leadTimeDays">
              <dt>Supplier Lead Time</dt>
              <dd>{{ selectedRule.supplier.leadTimeDays }} days</dd>
            </div>
          </dl>
        </VCardText>
      </VCard>
    </VDialog>

    <VDialog v-model="auditDialog" max-width="560">
      <VCard v-if="selectedAudit">
        <VCardTitle class="ops-dialog-title">
          Audit Event
          <VChip size="small" class="ops-inline-chip" color="info">{{ selectedAudit.event }}</VChip>
        </VCardTitle>
        <VDivider />
        <VCardText class="ops-dialog-body">
          <dl>
            <div class="ops-field">
              <dt>Entity</dt>
              <dd>{{ selectedAudit.entity }}</dd>
            </div>
            <div class="ops-field">
              <dt>Entity ID</dt>
              <dd>{{ selectedAudit.entityId ?? 'n/a' }}</dd>
            </div>
            <div class="ops-field">
              <dt>Actor</dt>
              <dd>{{ selectedAudit.actor?.displayName ?? selectedAudit.actor?.email ?? 'System' }}</dd>
            </div>
            <div class="ops-field">
              <dt>When</dt>
              <dd>{{ formatDate(selectedAudit.createdAt) }}</dd>
            </div>
          </dl>
          <section v-if="selectedAudit.diff">
            <h3>Diff</h3>
            <pre class="ops-diff">{{ prettyDiff(selectedAudit.diff) }}</pre>
          </section>
        </VCardText>
      </VCard>
    </VDialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { VBtn, VChip, VDialog, VCard, VCardTitle, VCardText, VDivider } from "vuetify/components";
import { useMerchantOperationsStore } from "@/modules/merchant/store/operationsStore";
import type {
  JobSummary,
  SupplierRoutingRuleSummary,
  AuditLogEntry,
  JobStatus,
} from "@/modules/merchant/store/operationsStore";
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "default",
    action: "read",
    subject: "MerchantDashboard",
  },
});

const operations = useMerchantOperationsStore();
const { jobs, notifications, routingRules, auditLogs, loading } = storeToRefs(operations);

const jobStatusOptions = [
  { label: "Queued", value: "QUEUED" as JobStatus | "ALL" },
  { label: "In Progress", value: "IN_PROGRESS" as JobStatus | "ALL" },
  { label: "Completed", value: "COMPLETED" as JobStatus | "ALL" },
  { label: "All", value: "ALL" as JobStatus | "ALL" },
];

const jobStatusFilter = ref<JobStatus | "ALL">("QUEUED");
const auditEntityFilter = ref<string>("all");

const jobDialog = ref(false);
const selectedJobId = ref<string | null>(null);
const ruleDialog = ref(false);
const selectedRuleId = ref<string | null>(null);
const auditDialog = ref(false);
const selectedAuditId = ref<string | null>(null);

const selectedJob = computed(() => jobs.value.find(job => job.id === selectedJobId.value) ?? null);
const selectedRule = computed(() => routingRules.value.find(rule => rule.id === selectedRuleId.value) ?? null);
const selectedAudit = computed(() => auditLogs.value.find(log => log.id === selectedAuditId.value) ?? null);
const selectedJobOutputs = computed(() => selectedJob.value?.design?.outputs ?? []);

const auditEntityOptions = computed(() => {
  const buffer = new Set<string>();
  auditLogs.value.forEach(entry => {
    if (entry.entity) buffer.add(entry.entity);
  });
  return Array.from(buffer).sort();
});

const anyLoading = computed(
  () => loading.value.jobs || loading.value.notifications || loading.value.routing || loading.value.audit,
);

function formatDate(value?: string) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function prettyDiff(diff: Record<string, unknown>) {
  try {
    return JSON.stringify(diff, null, 2);
  } catch (error) {
    console.warn("[ops] unable to stringify diff", error);
    return String(diff);
  }
}

function renderNotificationPayload(payload?: Record<string, unknown> | null) {
  if (!payload) return "No payload provided";
  if (payload.status && payload.gangSheetId) {
    return `Gang sheet ${String(payload.gangSheetId)} -> ${String(payload.status)}`;
  }
  if (payload.designId && payload.submittedAt) {
    return `Design ${String(payload.designId)} submitted`;
  }
  return JSON.stringify(payload);
}

function setJobFilter(value: JobStatus | "ALL") {
  jobStatusFilter.value = value;
}

function openJob(job: JobSummary) {
  selectedJobId.value = job.id;
  jobDialog.value = true;
}

function openRule(rule: SupplierRoutingRuleSummary) {
  selectedRuleId.value = rule.id;
  ruleDialog.value = true;
}

function openAudit(log: AuditLogEntry) {
  selectedAuditId.value = log.id;
  auditDialog.value = true;
}

async function acknowledgeNotification(id: string) {
  await operations.markNotificationRead(id);
  await operations.fetchNotifications({ unreadOnly: true });
}

async function bootstrap() {
  await Promise.all([
    operations.fetchJobs({ status: jobStatusFilter.value === "ALL" ? undefined : jobStatusFilter.value }),
    operations.fetchNotifications({ unreadOnly: true }),
    operations.fetchRoutingRules(),
    operations.fetchAuditLogs({ entity: auditEntityFilter.value === "all" ? undefined : auditEntityFilter.value }),
  ]);
}

async function handleRefresh() {
  await bootstrap();
}

watch(jobStatusFilter, async value => {
  await operations.fetchJobs({ status: value === "ALL" ? undefined : value });
});

watch(auditEntityFilter, async value => {
  await operations.fetchAuditLogs({ entity: value === "all" ? undefined : value });
});

watch(jobDialog, value => {
  if (!value) selectedJobId.value = null;
});

watch(ruleDialog, value => {
  if (!value) selectedRuleId.value = null;
});

watch(auditDialog, value => {
  if (!value) selectedAuditId.value = null;
});

onMounted(() => {
  bootstrap();
});
</script>

<style scoped>
.ops-root {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: clamp(24px, 4vw, 48px);
}

.ops-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;
}

.ops-header h1 {
  margin: 0 0 8px;
  font-size: clamp(1.6rem, 2.4vw, 2.1rem);
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.ops-header p {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  max-width: 720px;
}

.ops-actions {
  display: flex;
  align-items: center;
}

.ops-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.ops-card {
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
  border-radius: 16px;
  background: rgba(var(--v-theme-surface), 0.96);
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 260px;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
}

.ops-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ops-card-header h2 {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.ops-card-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.ops-audit-tools {
  margin-top: -6px;
}

.ops-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  font-weight: 600;
}

.ops-filter-chip {
  cursor: pointer;
}

.ops-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  position: relative;
}

.ops-list.is-loading::after {
  content: "Loading...";
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.06);
  border-radius: 12px;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.ops-list-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.88rem;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.ops-list-subtitle {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: rgba(var(--v-theme-on-surface), 0.64);
}

.ops-metadata {
  margin: 2px 0 0;
  font-size: 0.74rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.ops-empty {
  margin-top: auto;
  padding: 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-outline), 0.06);
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.85rem;
}

.ops-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: rgba(var(--v-theme-secondary), 0.12);
  color: rgb(var(--v-theme-secondary));
  text-transform: uppercase;
}

.ops-badge[data-status="COMPLETED"] {
  background: rgba(18, 183, 106, 0.12);
  color: rgb(18, 183, 106);
}

.ops-badge[data-status="FAILED"],
.ops-badge[data-status="CANCELLED"] {
  background: rgba(239, 68, 68, 0.12);
  color: rgb(239, 68, 68);
}

.ops-id {
  font-family: var(--font-mono, "Roboto Mono", monospace);
  font-size: 0.76rem;
  color: rgba(var(--v-theme-on-surface), 0.54);
}

.ops-clickable {
  cursor: pointer;
  padding: 8px 10px;
  border-radius: 12px;
  transition: background 0.2s ease, transform 0.2s ease;
}

.ops-clickable:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  transform: translateY(-1px);
}

.ops-dialog-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ops-inline-chip {
  font-weight: 600;
}

.ops-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ops-field {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  font-size: 0.9rem;
}

.ops-field dt {
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.ops-field dd {
  margin: 0;
}

.ops-detail-list {
  list-style: disc;
  padding-left: 18px;
  margin: 6px 0 0;
  display: grid;
  gap: 4px;
}

.ops-diff {
  max-height: 260px;
  overflow: auto;
  background: rgba(var(--v-theme-surface), 0.6);
  border-radius: 12px;
  padding: 12px;
  font-size: 0.78rem;
}

.ops-filter-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.ops-select {
  border: 1px solid rgba(var(--v-theme-outline), 0.24);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.82rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
  background: rgba(var(--v-theme-surface), 0.96);
}

@media (max-width: 768px) {
  .ops-header {
    grid-template-columns: 1fr;
  }

  .ops-actions {
    justify-content: flex-start;
  }
}
</style>
