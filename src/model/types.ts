/**
 * Modelo de dados — fonte única de verdade (§6 do CLAUDE.md), com os ajustes
 * dos achados desta sessão:
 *  - Layer.keys tem `matrixSize` (16) slots, não 12: a matriz é 4×4 e os 4
 *    cantos são encoders/smiley/logo. Ver `SLOT_ROLE`.
 *  - EncoderMap segue a API do VIA: só `ccw`/`cw`. `click` é opcional e não vem
 *    de 0x14/0x15 (é posição de matriz ou firmware — resolver na Fase 0).
 */

/** Ex: "KC_TRNS", "G(KC_T)", "LSFT(KC_A)", "MACRO(12)", "TO(1)". */
export type Keycode = string;

/** Ordem do VIA: [ccw, cw]. */
export interface EncoderMap {
  /** Girar anti-horário. */
  ccw: Keycode;
  /** Girar horário. */
  cw: Keycode;
  /** Clicar. Não vem da API de encoder; resolver na Fase 0. */
  click?: Keycode;
}

/** HSV 0..255 (formato do VIA). Aplicado por-layer só com firmware custom (Fase 3). */
export interface LayerRGB {
  hue: number;
  sat: number;
  val: number;
}

export interface Layer {
  index: number;
  name: string;
  /** `matrixSize` keycodes, row-major, mesma ordem do export do VIA. */
  keys: Keycode[];
  /** `encoderCount` mapas (2). */
  encoders: EncoderMap[];
  rgb?: LayerRGB;
}

/** Macro no formato-string do VIA (ex: "{+KC_LALT}a{-KC_LALT}"). */
export interface Macro {
  index: number;
  actions: string;
}

export type TargetOS = "mac" | "win" | "both";

/** RGB global (protocolo padrão, canal 3). */
export interface RGBGlobal {
  brightness: number;
  effect: number;
  effectSpeed: number;
  hue: number;
  sat: number;
}

export interface Preset {
  id: string;
  name: string;
  targetOS: TargetOS;
  layers: Layer[];
  macros: Macro[];
  rgbGlobal?: RGBGlobal;
}

/** Fase 2: liga um preset a um app em foco. */
export interface Profile {
  app: string;
  presetId: string;
}

/**
 * Papel de cada slot físico da matriz 4×4. Hipótese a confirmar na Fase 0
 * (mapa row,col → posição). "dead" = canto sem tecla; "encoder-click" = clique
 * do encoder, se for posição de matriz.
 */
export type SlotRole = "key" | "encoder-click" | "smiley" | "dead";
