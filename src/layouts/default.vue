<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <!-- İstersen burada navbar/header olabilir -->
    <div class="app-content">
      <!-- SAYFAYI BURAYA BAS -->
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.app-shell{
  display:flex; flex-direction:column;
  min-height:100vh; background:#fafbff;
}
.app-content{
  flex:1; min-height:0; /* ← grid/konva için kritik */
  display:flex; flex-direction:column;
}
</style>
