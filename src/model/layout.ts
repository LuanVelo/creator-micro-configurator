/**
 * Layout físico dos 16 slots da matriz 4×4, confirmado na Fase 0 contra o
 * `work_louder/micro` do QMK. `index = row*4 + col` (row-major, mesma ordem do
 * keymap dinâmico e do export do VIA). x/y em unidades de tecla (u).
 *
 * Cantos: [0,0]=roda(encoder 0), [0,3]=knob(encoder 1), [3,0]=logo, [3,3]=smiley.
 * O click de cada encoder é a posição de matriz do respectivo canto superior.
 */
export type SlotRole = "key" | "wheel" | "knob" | "smiley" | "logo";

export interface Slot {
  index: number;
  row: number;
  col: number;
  x: number;
  y: number;
  role: SlotRole;
  label: string;
}

export const SLOT_LAYOUT: Slot[] = [
  { index: 0, row: 0, col: 0, x: 0, y: 0, role: "wheel", label: "Roda (click)" },
  { index: 1, row: 0, col: 1, x: 1.25, y: 0.25, role: "key", label: "Tecla 1" },
  { index: 2, row: 0, col: 2, x: 2.25, y: 0.25, role: "key", label: "Tecla 2" },
  { index: 3, row: 0, col: 3, x: 3.5, y: 0, role: "knob", label: "Knob (click)" },
  { index: 4, row: 1, col: 0, x: 0.25, y: 1.25, role: "key", label: "Tecla 3" },
  { index: 5, row: 1, col: 1, x: 1.25, y: 1.25, role: "key", label: "Tecla 4" },
  { index: 6, row: 1, col: 2, x: 2.25, y: 1.25, role: "key", label: "Tecla 5" },
  { index: 7, row: 1, col: 3, x: 3.25, y: 1.25, role: "key", label: "Tecla 6" },
  { index: 8, row: 2, col: 0, x: 0.25, y: 2.25, role: "key", label: "Tecla 7" },
  { index: 9, row: 2, col: 1, x: 1.25, y: 2.25, role: "key", label: "Tecla 8" },
  { index: 10, row: 2, col: 2, x: 2.25, y: 2.25, role: "key", label: "Tecla 9" },
  { index: 11, row: 2, col: 3, x: 3.25, y: 2.25, role: "key", label: "Tecla 10" },
  { index: 12, row: 3, col: 0, x: 0, y: 3.5, role: "logo", label: "Logo (canto)" },
  { index: 13, row: 3, col: 1, x: 1.25, y: 3.25, role: "key", label: "Tecla 11" },
  { index: 14, row: 3, col: 2, x: 2.25, y: 3.25, role: "key", label: "Tecla 12" },
  { index: 15, row: 3, col: 3, x: 3.5, y: 3.5, role: "smiley", label: "Smiley (layer)" },
];

/** Encoder de cada canto superior (para editar o click junto da rotação). */
export const ENCODER_OF_SLOT: Record<number, number> = { 0: 0, 3: 1 };

/** Cor do halo RGB por layer (payoff visual do §1.5). Casa com os frames do Figma. */
export const LAYER_COLORS = ["#22c55e", "#6366f1", "#a855f7", "#14b8a6"] as const;

export function layerColor(index: number): string {
  return LAYER_COLORS[index % LAYER_COLORS.length];
}
