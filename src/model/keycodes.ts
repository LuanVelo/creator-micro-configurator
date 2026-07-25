/**
 * Codec de keycodes (string <-> 16 bits) + validação.
 *
 * Estratégia (ver plano / §11):
 *  - Ranges ESTÁVEIS entre versões do QMK são exatos: básico (0x00–0xFF) e
 *    modificadores QK_MODS (0x0100–0x1FFF). Cobrem G()/A()/C()/S() e combos.
 *  - Ranges ESPECIAIS (TO/MO/TG/MACRO/RGB...): CONFIRMADOS contra o hardware na
 *    Fase 0 (protocol 0x000C, dump bateu 1:1 com o backup, 0 divergências) —
 *    `TO(n)`=0x5200+n, `MACRO(n)`=0x7700+n, `RGB_TOG`=0x7820. `isVerifyPending`
 *    segue disponível para keycodes ainda não vistos. Ver docs/phase0-findings.md.
 */

// ── Básico (0x00–0xFF): USB HID usage IDs. Estável. ────────────────────────
const BASIC: Record<string, number> = {
  KC_NO: 0x00,
  KC_TRNS: 0x01, // KC_TRANSPARENT
};

// Letras A–Z = 0x04–0x1D
for (let i = 0; i < 26; i++) {
  BASIC[`KC_${String.fromCharCode(65 + i)}`] = 0x04 + i;
}
// Dígitos 1–9,0 = 0x1E–0x27
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
DIGITS.forEach((d, i) => (BASIC[`KC_${d}`] = 0x1e + i));
// F1–F12 = 0x3A–0x45; F13–F24 = 0x68–0x73
for (let i = 0; i < 12; i++) BASIC[`KC_F${i + 1}`] = 0x3a + i;
for (let i = 0; i < 12; i++) BASIC[`KC_F${i + 13}`] = 0x68 + i;

Object.assign(BASIC, {
  KC_ENT: 0x28,
  KC_ESC: 0x29,
  KC_BSPC: 0x2a,
  KC_TAB: 0x2b,
  KC_SPC: 0x2c,
  KC_MINS: 0x2d,
  KC_EQL: 0x2e,
  KC_LBRC: 0x2f,
  KC_RBRC: 0x30,
  KC_BSLS: 0x31,
  KC_SCLN: 0x33,
  KC_QUOT: 0x34,
  KC_GRV: 0x35,
  KC_COMM: 0x36,
  KC_DOT: 0x37,
  KC_SLSH: 0x38,
  KC_CAPS: 0x39,
  KC_PSCR: 0x46,
  KC_SCRL: 0x47,
  KC_PAUS: 0x48,
  KC_INS: 0x49,
  KC_HOME: 0x4a,
  KC_PGUP: 0x4b,
  KC_DEL: 0x4c,
  KC_END: 0x4d,
  KC_PGDN: 0x4e,
  KC_RGHT: 0x4f,
  KC_LEFT: 0x50,
  KC_DOWN: 0x51,
  KC_UP: 0x52,
  // Modificadores (usados diretos ou como wrap)
  KC_LCTL: 0xe0,
  KC_LSFT: 0xe1,
  KC_LALT: 0xe2,
  KC_LGUI: 0xe3,
  KC_RCTL: 0xe4,
  KC_RSFT: 0xe5,
  KC_RALT: 0xe6,
  KC_RGUI: 0xe7,
});

const BASIC_REVERSE = new Map<number, string>(
  Object.entries(BASIC).map(([name, value]) => [value, name]),
);

// ── Modificadores QK_MODS (0x0100–0x1FFF). Estável. ────────────────────────
// keycode = (mods << 8) | basic. bit4 = usar mods da direita.
const MOD_BIT = { CTL: 0x01, SFT: 0x02, ALT: 0x04, GUI: 0x08 } as const;
const MOD_RIGHT = 0x10;

// Aliases de função de wrap do QMK -> conjunto de bits (lado esquerdo).
const WRAP_ALIASES: Record<string, number> = {
  LCTL: MOD_BIT.CTL,
  C: MOD_BIT.CTL,
  LSFT: MOD_BIT.SFT,
  S: MOD_BIT.SFT,
  LALT: MOD_BIT.ALT,
  A: MOD_BIT.ALT,
  LGUI: MOD_BIT.GUI,
  G: MOD_BIT.GUI,
  // pares de 2 modificadores
  LCA: MOD_BIT.CTL | MOD_BIT.ALT,
  LSG: MOD_BIT.SFT | MOD_BIT.GUI,
  LSA: MOD_BIT.SFT | MOD_BIT.ALT,
  LAG: MOD_BIT.ALT | MOD_BIT.GUI,
  LSC: MOD_BIT.SFT | MOD_BIT.CTL,
  LCG: MOD_BIT.CTL | MOD_BIT.GUI,
  // trios / quatro
  LCAG: MOD_BIT.CTL | MOD_BIT.ALT | MOD_BIT.GUI,
  LSCG: MOD_BIT.SFT | MOD_BIT.CTL | MOD_BIT.GUI,
  LSAG: MOD_BIT.SFT | MOD_BIT.ALT | MOD_BIT.GUI,
  MEH: MOD_BIT.CTL | MOD_BIT.SFT | MOD_BIT.ALT,
  HYPR: MOD_BIT.CTL | MOD_BIT.SFT | MOD_BIT.ALT | MOD_BIT.GUI,
};

// Nome canônico para cada conjunto de bits (esquerda) na hora de decodificar.
const MODS_CANONICAL: Array<[number, string]> = [
  [MOD_BIT.CTL, "C"],
  [MOD_BIT.SFT, "S"],
  [MOD_BIT.ALT, "A"],
  [MOD_BIT.GUI, "G"],
  [MOD_BIT.SFT | MOD_BIT.GUI, "LSG"],
  [MOD_BIT.CTL | MOD_BIT.ALT, "LCA"],
  [MOD_BIT.SFT | MOD_BIT.ALT, "LSA"],
  [MOD_BIT.ALT | MOD_BIT.GUI, "LAG"],
  [MOD_BIT.SFT | MOD_BIT.CTL, "LSC"],
  [MOD_BIT.CTL | MOD_BIT.GUI, "LCG"],
  [MOD_BIT.CTL | MOD_BIT.SFT | MOD_BIT.ALT, "MEH"],
  [MOD_BIT.CTL | MOD_BIT.ALT | MOD_BIT.GUI, "LCAG"],
  [MOD_BIT.SFT | MOD_BIT.CTL | MOD_BIT.GUI, "LSCG"],
  [MOD_BIT.SFT | MOD_BIT.ALT | MOD_BIT.GUI, "LSAG"],
  [MOD_BIT.CTL | MOD_BIT.SFT | MOD_BIT.ALT | MOD_BIT.GUI, "HYPR"],
];
const MODS_CANONICAL_MAP = new Map(MODS_CANONICAL.map(([bits, name]) => [bits, name]));

// ── Especiais (best-effort, QMK moderno). `verify` = confirmar na Fase 0. ───
interface SpecialRange {
  name: string; // nome da função, ex "TO", "MO", "MACRO"
  base: number; // valor base do range
  span: number; // nº de índices válidos (arg 0..span-1)
}
const SPECIAL_RANGES: SpecialRange[] = [
  { name: "TO", base: 0x5200, span: 32 },
  { name: "MO", base: 0x5220, span: 32 },
  { name: "DF", base: 0x5240, span: 32 },
  { name: "TG", base: 0x5260, span: 32 },
  { name: "OSL", base: 0x5280, span: 32 },
  { name: "TT", base: 0x52c0, span: 32 },
  { name: "MACRO", base: 0x7700, span: 256 }, // QK_MACRO — confirmar base
];

/** Keycodes especiais sem argumento (best-effort). Confirmar na Fase 0. */
const SPECIAL_SINGLE: Record<string, number> = {
  RGB_TOG: 0x7820, // confirmar base RGB
};
const SPECIAL_SINGLE_REVERSE = new Map<number, string>(
  Object.entries(SPECIAL_SINGLE).map(([n, v]) => [v, n]),
);

const FUNC_RE = /^([A-Z_]+)\((.+)\)$/;
const INDEX_FUNC_RE = /^([A-Z_]+)\((\d+)\)$/;

/**
 * Resolve keycode string -> 16 bits. Retorna null se desconhecido/ inválido.
 * Ranges estáveis são confiáveis; especiais são best-effort (ver módulo).
 */
export function encodeKeycode(kc: string): number | null {
  const s = kc.trim();
  if (s in BASIC) return BASIC[s];
  if (s in SPECIAL_SINGLE) return SPECIAL_SINGLE[s];

  const idxMatch = INDEX_FUNC_RE.exec(s);
  if (idxMatch) {
    const [, fn, argStr] = idxMatch;
    const arg = Number(argStr);
    const range = SPECIAL_RANGES.find((r) => r.name === fn);
    if (range && arg >= 0 && arg < range.span) return range.base + arg;
  }

  const modMatch = FUNC_RE.exec(s);
  if (modMatch) {
    const [, fn, inner] = modMatch;
    if (fn in WRAP_ALIASES) {
      const innerCode = encodeKeycode(inner);
      if (innerCode !== null && innerCode <= 0xff) {
        return (WRAP_ALIASES[fn] << 8) | innerCode;
      }
    }
  }
  return null;
}

/** Resolve 16 bits -> keycode string. Sempre retorna algo (fallback 0xHEX). */
export function decodeKeycode(value: number): string {
  const v = value & 0xffff;
  if (BASIC_REVERSE.has(v)) return BASIC_REVERSE.get(v)!;
  if (SPECIAL_SINGLE_REVERSE.has(v)) return SPECIAL_SINGLE_REVERSE.get(v)!;

  // Especiais com índice
  for (const range of SPECIAL_RANGES) {
    if (v >= range.base && v < range.base + range.span) {
      return `${range.name}(${v - range.base})`;
    }
  }

  // Modificadores
  if (v >= 0x0100 && v <= 0x1fff) {
    const basic = v & 0xff;
    let modBits = (v >> 8) & 0x1f;
    const right = (modBits & MOD_RIGHT) !== 0;
    modBits &= 0x0f;
    const basicName = BASIC_REVERSE.get(basic) ?? `0x${basic.toString(16)}`;
    const canonical = MODS_CANONICAL_MAP.get(modBits);
    if (canonical) {
      // Para nomes de 1 letra do lado direito, usa prefixo R…; senão mantém.
      return `${canonical}(${basicName})`;
    }
    return `${right ? "R" : "L"}MODS_${modBits.toString(16)}(${basicName})`;
  }

  return `0x${v.toString(16).toUpperCase().padStart(4, "0")}`;
}

/** true se a string resolve para um keycode conhecido (§8, regra 3). */
export function isValidKeycode(kc: string): boolean {
  return encodeKeycode(kc) !== null;
}

/** true se o valor cai em um range que ainda depende de confirmação (Fase 0). */
export function isVerifyPending(value: number): boolean {
  const v = value & 0xffff;
  if (SPECIAL_SINGLE_REVERSE.has(v)) return true;
  return SPECIAL_RANGES.some((r) => v >= r.base && v < r.base + r.span);
}

export const KEYCODE_TABLES = { BASIC, SPECIAL_RANGES, SPECIAL_SINGLE } as const;
