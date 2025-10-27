<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { useMerchantTemplatesStore } from "@/modules/merchant/store/templatesStore";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Templates",
    embeddedSubtitle: "Organise reusable layouts and assign them to products or surfaces.",
  },
});

const notification = useNotificationStore();
const templatesStore = useMerchantTemplatesStore();

const searchTerm = ref("");
const selectedCategory = ref("All");

const isLoading = computed(() => templatesStore.loading);

const categories = computed(() => {
  const counts = new Map<string, number>();
  templatesStore.items.forEach(template => {
    template.tags?.forEach(tag => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  const total = templatesStore.items.length;
  const list = Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return [{ label: "All", count: total }, ...list];
});

const filteredTemplates = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  return templatesStore.items.filter(template => {
    const matchesCategory =
      selectedCategory.value === "All" || template.tags?.includes(selectedCategory.value);
    const matchesSearch =
      !term ||
      template.title.toLowerCase().includes(term) ||
      template.description?.toLowerCase()?.includes(term);
    return matchesCategory && matchesSearch;
  });
});

async function loadTemplates() {
  try {
    await templatesStore.fetchTemplates();
  } catch (error) {
    console.error(error);
    notification.error("Template listesi yuklenemedi.");
  }
}

function selectCategory(label: string) {
  selectedCategory.value = label;
}

onMounted(() => {
  void loadTemplates();
});
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <div>
          <h2>Template library</h2>
          <p>Drag templates into your gang sheet builder or publish them to customers.</p>
        </div>
        <div class="toolbar">
          <VBtn prepend-icon="tabler-cloud-upload" variant="outlined">Import JSON</VBtn>
          <VBtn color="primary" prepend-icon="tabler-plus">New template</VBtn>
        </div>
      </header>

      <div class="categories">
        <button
          v-for="category in categories"
          :key="category.label"
          class="category"
          :class="{ 'is-active': category.label === selectedCategory }"
          type="button"
          @click="selectCategory(category.label)"
        >
          {{ category.label }}
          <span>{{ category.count }}</span>
        </button>
        <VTextField
          v-model="searchTerm"
          hide-details
          density="comfortable"
          placeholder="Search templates"
          prepend-inner-icon="tabler-search"
          variant="outlined"
          class="search"
        />
      </div>

      <div v-if="isLoading" class="template-grid">
        <VSkeletonLoader
          v-for="n in 6"
          :key="n"
          type="image, list-item-two-line"
          class="template-skeleton"
        />
      </div>

      <div v-else-if="filteredTemplates.length" class="template-grid">
        <article v-for="template in filteredTemplates" :key="template.id" class="template-card">
          <div class="thumbnail">
            <img v-if="template.previewUrl" :src="template.previewUrl" alt="Template preview" />
            <span v-else>{{ template.title.slice(0, 2).toUpperCase() }}</span>
          </div>
          <div class="template-body">
            <h3>{{ template.title }}</h3>
            <p>{{ template.description || '—' }}</p>
            <div v-if="template.tags?.length" class="tags">
              <VChip
                v-for="tag in template.tags"
                :key="tag"
                size="small"
                color="primary"
                variant="tonal"
              >
                {{ tag }}
              </VChip>
            </div>
          </div>
          <div class="template-actions">
            <VBtn icon="tabler-eye" variant="text" />
            <VBtn icon="tabler-copy" variant="text" />
            <VBtn icon="tabler-dots" variant="text" />
          </div>
        </article>
      </div>

      <p v-else class="empty-state">No templates match the current filters.</p>
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
  border-radius: 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.card-header h2 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.card-header p {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.65);
}

.toolbar {
  display: flex;
  gap: 12px;
}

.categories {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.category {
  border: 1px solid rgba(17, 18, 23, 0.12);
  background: rgba(17, 18, 23, 0.02);
  padding: 8px 16px;
  border-radius: 999px;
  font-weight: 600;
  color: rgba(17, 18, 23, 0.7);
  display: inline-flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  border-width: 1px;
}

.category.is-active {
  background: #111217;
  color: #ffffff;
  border-color: #111217;
}

.category span {
  font-size: 0.78rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 999px;
}

.search {
  min-width: 220px;
  margin-left: auto;
}

.template-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.template-card,
.template-skeleton {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 14px;
  background: rgba(17, 18, 23, 0.02);
  display: flex;
  flex-direction: column;
}

.template-skeleton {
  padding: 16px;
}

.thumbnail {
  background: linear-gradient(135deg, rgba(64, 122, 252, 0.4), rgba(64, 122, 252, 0.1));
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  font-weight: 700;
  padding: 32px 0;
  display: grid;
  place-items: center;
  min-height: 120px;
}

.thumbnail img {
  max-width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.template-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-body h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.template-body p {
  margin: 0;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.9rem;
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.template-actions {
  display: flex;
  justify-content: flex-end;
  padding: 8px;
  gap: 4px;
}

.empty-state {
  margin: 0;
  text-align: center;
  padding: 24px 0;
  color: rgba(17, 18, 23, 0.55);
  font-size: 0.9rem;
}
</style>



