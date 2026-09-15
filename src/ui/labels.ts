/**
 * Rótulos curtos de keycode para a UI. Usa notação Mac (⌘⌥⇧⌃) — o mesmo eixo
 * que a detecção de SO vai automatizar na Fase 2.
 */
import { ACTION_CATALOG } from "../model/actions.ts";

/** Rótulo amigável do atalho (para o tooltip), buscado no catálogo por keycode. */
export function actionLabelFor(kc: string): string | undefined {
  for (const g of ACTION_CATALOG) {
    const a = g.actions.find((x) => x.keycode === kc);
    if (a) return a.label;
  }
  return undefined;
}

const MOD_GLYPH: Record<string, string> = {
  G: "⌘",
  A: "⌥",
  S: "⇧",
  C: "⌃",
  LSG: "⇧⌘",
  LCA: "⌃⌥",
  MEH: "⌃⇧⌥",
  HYPR: "⌃⇧⌥⌘",
};

const FUNC_RE = /^([A-Z_]+)\((.+)\)$/;

/** Rótulo compacto: "G(KC_T)"→"⌘T", "MACRO(2)"→"M2", "TO(1)"→"→L1", "KC_V"→"V". */
export function keyLabel(kc: string): string {
  if (!kc || kc === "KC_NO") return "";
  if (kc === "KC_TRNS") return "▽";

  const m = FUNC_RE.exec(kc);
  if (m) {
    const [, fn, inner] = m;
    if (fn === "MACRO") return `M${inner}`;
    if (fn === "TO" || fn === "MO" || fn === "TG") return `→L${inner}`;
    if (fn in MOD_GLYPH) return `${MOD_GLYPH[fn]}${keyLabel(inner)}`;
    return kc;
  }

  if (kc === "RGB_TOG") return "RGB";
  if (kc.startsWith("KC_")) {
    const rest = kc.slice(3);
    const map: Record<string, string> = {
      MINS: "−",
      EQL: "=",
      SPC: "␣",
      ENT: "⏎",
      BSPC: "⌫",
      TAB: "⇥",
      ESC: "⎋",
    };
    return map[rest] ?? rest;
  }
  return kc;
}

/** Rótulo de layer 1-indexado para os chips e títulos. */
export function layerLabel(index: number): string {
  return `Layer ${index + 1}`;
}
