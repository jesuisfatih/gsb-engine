<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNotificationStore } from "../stores/notificationStore";

const notifications = useNotificationStore();
const { snackbar } = storeToRefs(notifications);

function handleModelUpdate(value: boolean) {
  notifications.setVisible(value);
  if (!value)
    notifications.dismiss();
}
</script>

<template>
  <VSnackbar
    :model-value="snackbar.show"
    :timeout="snackbar.timeout"
    :color="snackbar.color"
    location="bottom end"
    variant="flat"
    @update:model-value="handleModelUpdate"
  >
    <div class="d-flex align-center gap-3">
      <VIcon v-if="snackbar.icon" :icon="snackbar.icon" size="20" />
      <span class="text-body-2">{{ snackbar.message }}</span>
    </div>
  </VSnackbar>
</template>
