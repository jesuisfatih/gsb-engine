import { defineStore } from "pinia";

type SnackbarColor = "primary" | "success" | "info" | "warning" | "error";

interface SnackbarState {
  show: boolean;
  message: string;
  color: SnackbarColor;
  timeout: number;
  icon?: string;
}

interface NotifyOptions {
  color?: SnackbarColor;
  icon?: string;
  timeout?: number;
}

function createInitialState(): SnackbarState {
  return {
    show: false,
    message: "",
    color: "primary",
    timeout: 4000,
    icon: undefined,
  };
}

export const useNotificationStore = defineStore("notifications", {
  state: () => ({
    snackbar: createInitialState(),
  }),

  actions: {
    notify(message: string, options: NotifyOptions = {}) {
      this.snackbar = {
        show: true,
        message,
        color: options.color ?? "primary",
        timeout: options.timeout ?? 4000,
        icon: options.icon,
      };
    },

    success(message: string) {
      this.notify(message, { color: "success", icon: "mdi-check-circle" });
    },

    error(message: string) {
      this.notify(message, { color: "error", icon: "mdi-alert-circle" });
    },

    info(message: string) {
      this.notify(message, { color: "info", icon: "mdi-information" });
    },

    dismiss() {
      this.snackbar.show = false;
    },

    setVisible(value: boolean) {
      this.snackbar.show = value;
    },
  },
});
