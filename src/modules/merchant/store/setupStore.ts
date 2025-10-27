import { defineStore } from "pinia";
import { $api } from "@/utils/api";

export type SetupStatus = "todo" | "in_progress" | "done";

export type SetupStep = {
  id: string;
  title: string;
  description: string;
  status: SetupStatus;
  cta?: {
    label: string;
    route?: string;
  };
};

type SetupResponse = {
  data: {
    steps: SetupStep[];
    stats: {
      completed: number;
      total: number;
    };
  };
};

function buildStatusPayload(steps: SetupStep[]) {
  const statuses: Record<string, SetupStatus> = {};
  steps.forEach(step => {
    statuses[step.id] = step.status;
  });
  return statuses;
}

export const useMerchantSetupStore = defineStore("merchant-setup", {
  state: () => ({
    steps: [] as SetupStep[],
    stats: {
      completed: 0,
      total: 0,
    },
    loading: false,
    saving: false,
    error: null as string | null,
  }),

  actions: {
    async fetchSetup() {
      this.loading = true;
      this.error = null;
      try {
        const response = await $api<SetupResponse>("/merchant/config/setup");
        const payload = response.data;
        this.steps = payload?.steps ?? [];
        this.stats = payload?.stats ?? {
          completed: this.steps.filter(step => step.status === "done").length,
          total: this.steps.length,
        };
        return this.steps;
      } catch (error: any) {
        console.warn("[merchant-setup] fetchSetup failed", error);
        this.error = error?.response?._data?.error ?? error?.message ?? "Unable to load setup progress";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async setStepStatus(stepId: string, status: SetupStatus) {
      const nextSteps = this.steps.map(step =>
        step.id === stepId ? { ...step, status } : step,
      );

      this.saving = true;
      this.error = null;
      try {
        const response = await $api<SetupResponse>("/merchant/config/setup", {
          method: "PUT",
          body: {
            statuses: buildStatusPayload(nextSteps),
          },
        });

        const payload = response.data;
        this.steps = payload?.steps ?? nextSteps;
        this.stats = payload?.stats ?? {
          completed: this.steps.filter(step => step.status === "done").length,
          total: this.steps.length,
        };
        return this.steps;
      } catch (error: any) {
        console.warn("[merchant-setup] setStepStatus failed", error);
        this.error = error?.response?._data?.error ?? error?.message ?? "Unable to update setup progress";
        throw error;
      } finally {
        this.saving = false;
      }
    },
  },
});
