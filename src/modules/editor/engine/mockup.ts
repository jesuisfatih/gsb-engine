/** Stage dataURL\'ünü belirli bir dikdörtgene kırparak export eder. */
export function cropDataURL(dataUrl: string, crop: {x:number;y:number;width:number;height:number}): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = crop.width;
      c.height = crop.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      resolve(c.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

/** Basit 2D mockup: base görsel üstüne tasarımı belirtilen konuma çizer. */
export function composeMockup2D(baseUrl: string, designUrl: string, placement: {x:number;y:number;w:number;h:number}): Promise<string> {
  return new Promise((resolve, reject) => {
    const base = new Image(); const design = new Image();
    let loaded = 0;
    function done() {
      const c = document.createElement("canvas");
      c.width = base.width; c.height = base.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(base, 0, 0);
      ctx.drawImage(design, placement.x, placement.y, placement.w, placement.h);
      resolve(c.toDataURL("image/png"));
    }
    function onload() { loaded++; if (loaded === 2) done(); }
    base.crossOrigin = "anonymous"; design.crossOrigin = "anonymous";
    base.onload = onload; design.onload = onload;
    base.onerror = reject; design.onerror = reject;
    base.src = baseUrl; design.src = designUrl;
  });
}
