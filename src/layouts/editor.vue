<script setup lang="ts">
import AppDefaultLayout from '@/layouts/default.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>
<template>
  <AppDefaultLayout>
    <div style="display:flex;flex-direction:column;height:100%;">
      <div style="display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid rgba(0,0,0,.08);">
        <strong>Gang Sheet Editor</strong>
        <v-spacer />
        <v-btn size="small" variant="tonal" @click="router.push('/dashboards/crm')">Dashboard</v-btn>
      </div>
      <div style="flex:1;min-height:0;">
        <RouterView />
      </div>
    </div>
  </AppDefaultLayout>
</template>

