import { env } from "../env";
import { designToRenderPayload } from "../utils/renderPayload";
import type { DesignDocument, DesignOutput } from "../../src/generated/prisma/client";

export interface MockupResult {
  preview2d?: string;
  preview3d?: string;
  metadata?: Record<string, unknown>;
}

export interface MockupOptions {
  tenantId: string;
  design: DesignDocument & { outputs?: DesignOutput[] };
  force?: boolean;
}

const DEFAULT_PLACEHOLDER = "https://cdn.gsb.dev/mockups";

async function postToRenderService(endpoint: string, payload: unknown): Promise<MockupResult | null> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: env.MOCKUP_SERVICE_TOKEN ? `Bearer ${env.MOCKUP_SERVICE_TOKEN}` : undefined,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      console.warn("[mockup] render service error", response.status, text);
      return null;
    }

    const data = await response.json();
    return {
      preview2d: data?.outputs?.preview2d ?? data?.preview2d ?? null,
      preview3d: data?.outputs?.preview3d ?? data?.preview3d ?? null,
      metadata: data?.metadata ?? null,
    };
  } catch (error) {
    console.warn("[mockup] render service request failed", error);
    return null;
  }
}

export async function generateMockups(options: MockupOptions): Promise<MockupResult> {
  const endpoint = env.MOCKUP_SERVICE_URL;
  const { design } = options;

  if (!endpoint) {
    return {
      preview2d: `${DEFAULT_PLACEHOLDER}/${design.id}.png`,
      preview3d: `${DEFAULT_PLACEHOLDER}/${design.id}.png?view=3d`,
      metadata: { source: "placeholder" },
    };
  }

  const payload = designToRenderPayload({
    design,
    tenantId: options.tenantId,
    force: options.force ?? false,
  });

  const rendered = await postToRenderService(endpoint, payload);
  if (rendered) return rendered;

  return {
    preview2d: `${DEFAULT_PLACEHOLDER}/${design.id}.png`,
    preview3d: `${DEFAULT_PLACEHOLDER}/${design.id}.png?view=3d`,
    metadata: { source: "fallback" },
  };
}
