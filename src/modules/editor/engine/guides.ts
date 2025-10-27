// Basit hizalama çizgileri: eşik dahilinde merkez/kenar hizasını döndürür.
export interface Rect { id: string; x: number; y: number; w: number; h: number }
export interface GuideLine { kind: 'v' | 'h'; pos: number }

const within = (a: number, b: number, tol = 6) => Math.abs(a - b) <= tol;

export function computeGuides(moving: Rect, others: Rect[], tol = 6): GuideLine[] {
  const lines: GuideLine[] = [];
  const mx = moving.x, my = moving.y, mw = moving.w, mh = moving.h;
  const mCenterX = mx + mw / 2, mCenterY = my + mh / 2;

  for (const o of others) {
    const ox = o.x, oy = o.y, ow = o.w, oh = o.h;
    const oCenterX = ox + ow / 2, oCenterY = oy + oh / 2;

    // Dikey hizalar
    if (within(mx, ox, tol)) lines.push({ kind: 'v', pos: ox });
    if (within(mx + mw, ox + ow, tol)) lines.push({ kind: 'v', pos: ox + ow });
    if (within(mCenterX, oCenterX, tol)) lines.push({ kind: 'v', pos: oCenterX });

    // Yatay hizalar
    if (within(my, oy, tol)) lines.push({ kind: 'h', pos: oy });
    if (within(my + mh, oy + oh, tol)) lines.push({ kind: 'h', pos: oy + oh });
    if (within(mCenterY, oCenterY, tol)) lines.push({ kind: 'h', pos: oCenterY });
  }

  return lines;
}
