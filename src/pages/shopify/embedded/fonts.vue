<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Fonts",
    embeddedSubtitle: "Manage available and active fonts for text tools inside the builder.",
  },
});

const availableFonts = [
  "Aggitha",
  "CactusFlowerOpenSGOT-Regular",
  "A dripping marker",
  "A4 Speed",
  "AB Rodeo",
  "AB Rodeo Bold",
  "AB Rodeo Outline",
  "AB Sports Varsity",
  "AB Sporty",
];

const activeFonts = [
  "Abril Fatface",
  "Agalumo",
  "Alfa Slab One",
  "Anton",
  "Arial Black",
  "Bangers",
  "Blockletter",
  "Bowlby One",
  "Chewy",
  "Courgette",
  "Docktrin",
  "Freshman",
];
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <h2>Text fonts</h2>
        <VBtn color="primary" prepend-icon="mdi-upload">Upload fonts</VBtn>
      </header>
      <div class="font-columns">
        <div class="column">
          <header>
            <p>Available fonts</p>
            <VTextField
              placeholder="Search"
              density="comfortable"
              hide-details
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            />
          </header>
          <ul class="font-list">
            <li v-for="font in availableFonts" :key="font">
              <span class="font-name">{{ font }}</span>
              <VBtn variant="text" size="small">Add to list »</VBtn>
            </li>
          </ul>
        </div>
        <div class="column">
          <header>
            <p>Active fonts</p>
            <span class="quota">24 / 300 fonts</span>
          </header>
          <ul class="font-list">
            <li v-for="font in activeFonts" :key="font">
              <span class="font-name">{{ font }}</span>
              <VChip size="small" variant="tonal">Bags font</VChip>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Name and number fonts</h2>
      </header>
      <p>Name and Number fonts are not available to customise right now. Coming soon.</p>
      <div class="actions">
        <VBtn color="primary">Save</VBtn>
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
}

.card-header h2 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.font-columns {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.column {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 16px;
  padding: 16px;
  background: rgba(17, 18, 23, 0.02);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.column header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.column header p {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.quota {
  margin-left: auto;
  font-size: 0.85rem;
  color: rgba(17, 18, 23, 0.6);
}

.font-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}

.font-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(17, 18, 23, 0.05);
}

.font-name {
  font-family: "Oswald", sans-serif;
  font-weight: 600;
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
