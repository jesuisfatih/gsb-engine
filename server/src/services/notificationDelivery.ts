import type { Notification } from "../../src/generated/prisma/client";
import { env } from "../env";

export type DeliveryChannel = "email" | "webhook";

export interface DeliveryConfig {
  channel: DeliveryChannel;
  target: string;
}

export interface NotificationEnvelope {
  notification: Notification;
  tenant: {
    id: string;
    displayName: string;
    settings?: Record<string, unknown> | null;
  };
  userEmail?: string | null;
  channelConfig?: DeliveryConfig | null;
}

export interface DeliveryResult {
  delivered: boolean;
  channel?: DeliveryChannel;
  message?: string;
}

function normalizeTarget(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function resolveChannel(envelope: NotificationEnvelope, mode: typeof env.NOTIFICATION_MODE): DeliveryConfig | null {
  if (envelope.channelConfig) return envelope.channelConfig;

  const settings = envelope.tenant.settings as Record<string, unknown> | undefined;
  const notifications = settings?.notifications as Record<string, unknown> | undefined;

  const webhookTarget = normalizeTarget(notifications?.webhook);
  if (webhookTarget) {
    return { channel: "webhook", target: webhookTarget };
  }

  const emailTarget = normalizeTarget(notifications?.email ?? env.NOTIFICATION_FALLBACK_EMAIL);
  if (emailTarget && emailTarget.includes("@")) {
    return { channel: "email", target: emailTarget };
  }

  if (mode === "webhook") {
    const fallbackWebhook = normalizeTarget(env.NOTIFICATION_WEBHOOK_URL);
    if (fallbackWebhook) return { channel: "webhook", target: fallbackWebhook };
  }

  return null;
}

async function dispatchEmail(target: string, envelope: NotificationEnvelope): Promise<DeliveryResult> {
  console.warn("[notifications] email delivery not configured", {
    target,
    notificationId: envelope.notification.id,
  });
  return {
    delivered: false,
    channel: "email",
    message: "Email delivery provider is not configured",
  };
}

async function dispatchWebhook(target: string, envelope: NotificationEnvelope): Promise<DeliveryResult> {
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notification: envelope.notification,
        tenant: envelope.tenant,
        userEmail: envelope.userEmail ?? null,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      return {
        delivered: false,
        channel: "webhook",
        message: `Webhook responded with ${response.status}: ${text}`,
      };
    }

    return {
      delivered: true,
      channel: "webhook",
      message: `Webhook responded with ${response.status}`,
    };
  } catch (error: any) {
    return {
      delivered: false,
      channel: "webhook",
      message: error?.message ?? "Webhook request failed",
    };
  }
}

export async function deliverNotification(envelope: NotificationEnvelope): Promise<DeliveryResult> {
  const mode = env.NOTIFICATION_MODE ?? "mock";

  if (mode === "disabled") {
    console.info("[notifications] delivery disabled", { notificationId: envelope.notification.id });
    return { delivered: false, message: "Notification delivery disabled" };
  }

  if (mode === "mock") {
    console.info("[notifications] mock delivery", {
      notificationId: envelope.notification.id,
      kind: envelope.notification.kind,
    });
    return {
      delivered: true,
      channel: "email",
      message: "Mock notification delivery (no external provider)",
    };
  }

  const channel = resolveChannel(envelope, mode);
  if (!channel) {
    console.warn("[notifications] no delivery channel configured", { notificationId: envelope.notification.id });
    return { delivered: false, message: "No delivery channel configured" };
  }

  switch (channel.channel) {
    case "email":
      return dispatchEmail(channel.target, envelope);
    case "webhook":
      return dispatchWebhook(channel.target, envelope);
    default:
      return { delivered: false, message: `Unsupported channel ${channel.channel}` };
  }
}
