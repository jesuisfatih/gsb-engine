import type { DesignDocument } from "../../src/generated/prisma/client";

interface RenderPayloadOptions {
  design: DesignDocument;
  tenantId: string;
  force?: boolean;
}

export function designToRenderPayload(options: RenderPayloadOptions) {
  const { design, tenantId, force } = options;
  return {
    designId: design.id,
    tenantId,
    force: Boolean(force),
    surfaceId: design.surfaceId,
    techniqueId: design.printTechniqueId,
    snapshot: design.snapshot,
    sheet: {
      widthMm: design.sheetWidthMm,
      heightMm: design.sheetHeightMm,
    },
    metadata: {
      createdAt: design.createdAt,
      updatedAt: design.updatedAt,
      submittedAt: design.submittedAt,
    },
  };
}
