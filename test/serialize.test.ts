import { describe, it, expect } from "vitest";
import {
  importViaJson,
  presetToViaJson,
  layersToKeymapBuffer,
  keymapBufferToLayers,
} from "../src/model/serialize.ts";
import backup from "../backup_VIA/creator_micro.layout.json";

describe("importViaJson (backup real)", () => {
  const preset = importViaJson(backup);

  it("4 layers × 16 teclas", () => {
    expect(preset.layers).toHaveLength(4);
    for (const layer of preset.layers) {
      expect(layer.keys).toHaveLength(16);
    }
  });

  it("preserva ordem row-major das teclas", () => {
    expect(preset.layers[0].keys[0]).toBe("G(KC_T)");
    expect(preset.layers[0].keys[1]).toBe("KC_V");
    expect(preset.layers[0].keys[15]).toBe("TO(1)");
  });

  it("encoders no par [ccw, cw] por layer", () => {
    // encoder 0, layer 0 = ["KC_MINS", "KC_EQL"]
    expect(preset.layers[0].encoders[0]).toEqual({ ccw: "KC_MINS", cw: "KC_EQL" });
    // encoder 1, layer 0 = ["G(KC_Z)", "LSG(KC_Z)"]
    expect(preset.layers[0].encoders[1]).toEqual({ ccw: "G(KC_Z)", cw: "LSG(KC_Z)" });
  });

  it("importa as 16 macros", () => {
    expect(preset.macros).toHaveLength(16);
    expect(preset.macros[0].actions).toBe("{+KC_LALT}a{-KC_LALT}");
  });

  it("targetOS default mac (notação LGUI/LALT)", () => {
    expect(preset.targetOS).toBe("mac");
  });
});

describe("round-trip Preset <-> VIA JSON", () => {
  it("presetToViaJson reproduz layers/encoders/macros do backup", () => {
    const preset = importViaJson(backup);
    const out = presetToViaJson(preset, backup.vendorProductId);
    expect(out.layers).toEqual(backup.layers);
    expect(out.encoders).toEqual(backup.encoders);
    expect(out.macros).toEqual(backup.macros);
    expect(out.vendorProductId).toBe(backup.vendorProductId);
  });
});

describe("round-trip Preset <-> bytes de keymap", () => {
  it("layersToKeymapBuffer -> keymapBufferToLayers reproduz as strings", () => {
    const preset = importViaJson(backup);
    const bytes = layersToKeymapBuffer(preset.layers);
    expect(bytes.length).toBe(4 * 16 * 2);
    const decoded = keymapBufferToLayers(bytes, 4, 16);
    expect(decoded).toEqual(preset.layers.map((l) => l.keys));
  });
});
