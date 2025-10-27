import type { LayerItem } from "../types";

/** Satır-dolgu (shelf) tabanlı hızlı yerleştirici */
export function autoPack(items: LayerItem[], sheetW: number, sheetH: number, spacing = 8) {
  const packables = items.filter((it:any) => it.width && it.height) as (LayerItem & any)[];
  const sorted = [...packables].sort((a:any,b:any)=> (b.width*b.height)-(a.width*a.height));
  let x=spacing, y=spacing, rowH=0;
  const out:{id:string;x:number;y:number}[]=[];
  for (const it of sorted) {
    const w=it.width, h=it.height;
    if (x + w > sheetW - spacing) { x = spacing; y += rowH + spacing; rowH = 0; }
    if (y + h > sheetH - spacing) continue;
    out.push({ id: it.id, x, y }); x += w + spacing; rowH = Math.max(rowH, h);
  }
  return out;
}
