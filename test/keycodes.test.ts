import { describe, it, expect } from "vitest";
import {
  encodeKeycode,
  decodeKeycode,
  isValidKeycode,
} from "../src/model/keycodes.ts";

describe("keycodes — ranges estáveis (básico + mods)", () => {
  it("básico: valores USB HID corretos", () => {
    expect(encodeKeycode("KC_NO")).toBe(0x00);
    expect(encodeKeycode("KC_TRNS")).toBe(0x01);
    expect(encodeKeycode("KC_A")).toBe(0x04);
    expect(encodeKeycode("KC_V")).toBe(0x19);
    expect(encodeKeycode("KC_MINS")).toBe(0x2d);
    expect(encodeKeycode("KC_EQL")).toBe(0x2e);
  });

  it("mods: (mods << 8) | basic", () => {
    expect(encodeKeycode("G(KC_T)")).toBe(0x0817);
    expect(encodeKeycode("A(KC_A)")).toBe(0x0404);
    expect(encodeKeycode("A(KC_D)")).toBe(0x0407);
    expect(encodeKeycode("G(KC_Z)")).toBe(0x081d);
    expect(encodeKeycode("LSG(KC_Z)")).toBe(0x0a1d);
  });

  it("decode inverte encode (básico + mods)", () => {
    for (const kc of ["KC_A", "KC_V", "KC_MINS", "G(KC_T)", "A(KC_A)", "LSG(KC_Z)"]) {
      expect(decodeKeycode(encodeKeycode(kc)!)).toBe(kc);
    }
  });

  it("valor desconhecido decodifica para hex", () => {
    expect(decodeKeycode(0xabcd)).toBe("0xABCD");
  });

  it("validação", () => {
    expect(isValidKeycode("KC_A")).toBe(true);
    expect(isValidKeycode("G(KC_T)")).toBe(true);
    expect(isValidKeycode("KC_NAO_EXISTE")).toBe(false);
    expect(isValidKeycode("Z(KC_A)")).toBe(false); // wrap inválido
  });
});

describe("keycodes — ranges especiais (best-effort, confirmar Fase 0)", () => {
  it("TO/MACRO round-trip consistente (independe da base real)", () => {
    for (const kc of ["TO(0)", "TO(1)", "TO(2)", "TO(3)", "MACRO(0)", "MACRO(12)", "RGB_TOG"]) {
      const code = encodeKeycode(kc);
      expect(code).not.toBeNull();
      expect(decodeKeycode(code!)).toBe(kc);
    }
  });
});
