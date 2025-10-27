export function pxToIn(px: number, ppi = 300) { return px / ppi; }
export function areaPx2ToIn2(px2: number, ppi = 300) { return px2 / (ppi * ppi); }
export function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

export function pxToMm(px: number, ppi = 300) { return (px / ppi) * 25.4; }

export function mmToPx(mm: number, ppi = 300) { return Math.round((mm / 25.4) * ppi); }

