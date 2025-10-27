import type { LayerItem } from "../types";

export function snapToGrid(val: number, grid: number): number {
  if (grid <= 1) return Math.round(val);
  return Math.round(val / grid) * grid;
}
export function snapPoint(x: number, y: number, grid: number, enable: boolean) {
  return enable ? { x: snapToGrid(x, grid), y: snapToGrid(y, grid) } : { x, y };
}
export function bboxOf(it: LayerItem) {
  if (it.kind === "circle") return { x: it.x - it.radius, y: it.y - it.radius, w: it.radius*2, h: it.radius*2 };
  if (it.kind === "line") {
    const xs:number[]=[]; const ys:number[]=[];
    for (let i=0;i<it.points.length;i+=2) { xs.push(it.points[i]); ys.push(it.points[i+1]); }
    const minx=Math.min(...xs)+it.x, miny=Math.min(...ys)+it.y, maxx=Math.max(...xs)+it.x, maxy=Math.max(...ys)+it.y;
    return { x:minx, y:miny, w:maxx-minx, h:maxy-miny };
  }
  return { x:(it as any).x, y:(it as any).y, w:(it as any).width ?? 0, h:(it as any).height ?? 0 };
}
export function snapToObjects(x:number,y:number,w:number,h:number,others:LayerItem[],threshold=6){
  let sx=x, sy=y;
  for (const it of others) {
    const b = bboxOf(it);
    if (Math.abs(x - b.x) <= threshold) sx = b.x;
    if (Math.abs(y - b.y) <= threshold) sy = b.y;
    const cx=x+w/2, cy=y+h/2, ocx=b.x+b.w/2, ocy=b.y+b.h/2;
    if (Math.abs(cx-ocx) <= threshold) sx = ocx - w/2;
    if (Math.abs(cy-ocy) <= threshold) sy = ocy - h/2;
    if (Math.abs((x+w)-(b.x+b.w)) <= threshold) sx = b.x + b.w - w;
    if (Math.abs((y+h)-(b.y+b.h)) <= threshold) sy = b.y + b.h - h;
  }
  return { x:sx, y:sy };
}
