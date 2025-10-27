<script setup lang="ts">
definePage({
  meta: {
    action: 'read',
    subject: 'SuperAdminDashboard',
  },
})
</script>

<template>
  <VRow>
    <VCol
      cols="12"
      md="6"
    >
      <VCard title="Common">
        <VCardText>No ability is required to view this card</VCardText>
        <VCardText>
          This card is visible to all authenticated roles.
        </VCardText>
      </VCard>
    </VCol>
    <VCol
      v-if="$can('read', 'all')"
      cols="12"
      md="6"
    >
      <VCard title="Analytics">
        <VCardText>User with 'Analytics' subject's 'Read' ability can view this card</VCardText>
        <VCardText class="text-danger">
          This card is visible to Super Admins only.
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
