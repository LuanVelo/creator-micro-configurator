import { describe, it, expect } from "vitest";
import { ACTION_CATALOG } from "../src/model/actions.ts";
import { encodeKeycode, isValidKeycode, decodeKeycode } from "../src/model/keycodes.ts";

describe("catálogo de ações", () => {
  const all = ACTION_CATALOG.flatMap((g) => g.actions.map((a) => ({ ...a, app: g.app })));

  it("toda ação resolve para um keycode válido", () => {
    const invalid = all.filter((a) => !isValidKeycode(a.keycode));
    expect(invalid.map((a) => `${a.app}/${a.label}: ${a.keycode}`)).toEqual([]);
  });

  it("ids são únicos", () => {
    const ids = all.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("combos de modificador novos codificam corretamente", () => {
    expect(encodeKeycode("LAG(KC_K)")).toBe(0x0c0e); // ⌥⌘K = (ALT|GUI)<<8 | KC_K
    expect(encodeKeycode("LCA(KC_H)")).toBe(0x050b); // ⌃⌥H = (CTL|ALT)<<8 | KC_H
    // round-trip
    for (const kc of ["LAG(KC_K)", "LCA(KC_H)", "LSA(KC_X)", "LCG(KC_U)"]) {
      expect(decodeKeycode(encodeKeycode(kc)!)).toBe(kc);
    }
  });
});
