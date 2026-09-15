import * as THREE from "three";

/**
 * Rótulo do keycap como textura de canvas 2D: usa as fontes do sistema (os
 * glifos ⌘⌥⇧⌃ saem certos) e não baixa nada de CDN. Fica deitado no topo do cap,
 * então é ocluído e iluminado junto com a geometria — não flutua como DOM.
 */
const SIZE = 256;
const MAX_TEXT_W = SIZE * 0.78;
const FONT = '600 {px}px system-ui, -apple-system, "Segoe UI", "Segoe UI Symbol", sans-serif';

const cache = new Map<string, THREE.CanvasTexture>();

export function labelTexture(text: string): THREE.CanvasTexture {
  const hit = cache.get(text);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f4f4f5";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let px = 104;
  ctx.font = FONT.replace("{px}", String(px));
  while (px > 36 && ctx.measureText(text).width > MAX_TEXT_W) {
    px -= 4;
    ctx.font = FONT.replace("{px}", String(px));
  }
  ctx.fillText(text, SIZE / 2, SIZE / 2 + px * 0.04);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(text, tex);
  return tex;
}
