<script setup lang="ts">
import { computed, onMounted } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { useMerchantSetupStore, type SetupStep, type SetupStatus } from "@/modules/merchant/store/setupStore";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Set up wizard",
    embeddedSubtitle: "Complete the essential configuration to launch your gang sheet builder.",
  },
});

const notification = useNotificationStore();
const setupStore = useMerchantSetupStore();

const steps = computed(() => setupStore.steps);
const stats = computed(() => setupStore.stats);
const isLoading = computed(() => setupStore.loading);
const isSaving = computed(() => setupStore.saving);

function statusClass(step: SetupStep) {
  return {
    done: step.status === "done",
    active: step.status === "in_progress",
  };
}

function nextStatus(status: SetupStatus): SetupStatus {
  if (status === "todo") return "in_progress";
  if (status === "in_progress") return "done";
  return "done";
}

async function handleAdvance(step: SetupStep) {
  if (isSaving.value) return;
  try {
    await setupStore.setStepStatus(step.id, nextStatus(step.status));
  } catch (error) {
    console.error(error);
    notification.error("Setup durumu guncellenemedi.");
  }
}

async function loadSetup() {
  try {
    await setupStore.fetchSetup();
  } catch (error) {
    console.error(error);
    notification.error("Setup bilgileri yuklenemedi.");
  }
}

onMounted(() => {
  void loadSetup();
});
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <h2>Configuration steps</h2>
        <span class="tag in-progress">{{ stats.completed }} / {{ stats.total }} complete</span>
      </header>
      <div v-if="isLoading" class="steps">
        <VSkeletonLoader v-for="n in 4" :key="n" type="list-item-two-line" />
      </div>
      <div v-else class="steps">
        <div v-for="step in steps" :key="step.id" class="step" :class="statusClass(step)">
          <div class="step-index">{{ steps.indexOf(step) + 1 }}</div>
          <div class="step-content">
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </div>
          <VBtn
            v-if="step.status !== 'done'"
            :disabled="isSaving"
            :color="step.status === 'in_progress' ? 'primary' : undefined"
            :variant="step.status === 'in_progress' ? 'tonal' : 'outlined'"
            @click="handleAdvance(step)"
          >
            {{ step.status === 'in_progress' ? 'Mark complete' : 'Start' }}
          </VBtn>
          <VBtn v-else variant="text" disabled>Completed</VBtn>
        </div>
      </div>
    </section>

    <section class="card secondary">
      <header class="card-header">
        <h2>Need assistance?</h2>
      </header>
      <p>
        Book an onboarding session with our success team or browse the knowledge base for step-by-step guides.
      </p>
      <div class="cta-row">
        <VBtn color="primary">Schedule call</VBtn>
        <VBtn variant="text">View documentation</VBtn>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  background: #ffffff;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card.secondary {
  max-width: 480px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header h2 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.tag {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: rgba(64, 122, 252, 0.12);
  color: #407afc;
}

.steps {
  display: grid;
  gap: 12px;
}

.step {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 12px;
  background: rgba(17, 18, 23, 0.02);
}

.step.done {
  background: rgba(64, 122, 252, 0.08);
  border-color: rgba(64, 122, 252, 0.2);
}

.step.active {
  border-color: #407afc;
}

.step-index {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #111217;
  color: #ffffff;
  font-weight: 600;
  display: grid;
  place-items: center;
}

.step.done .step-index {
  background: #407afc;
}

.step-content h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111217;
}

.step-content p {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.65);
  font-size: 0.88rem;
}

.cta-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
