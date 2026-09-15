import { describe, expect, it } from "vitest";
import { SLOT_LAYOUT } from "../src/model/layout.ts";
import {
  fitDistance,
  keycapNodeName,
  orbitPosition,
  poseFor,
  POSES,
  slotForNode,
} from "../src/ui/keyboard3d/parts.ts";

describe("keyboard3d parts", () => {
  it("mapeia os 12 keycaps do glb exatamente para os slots de tecla", () => {
    const keySlots = SLOT_LAYOUT.filter((s) => s.role === "key");
    expect(keySlots).toHaveLength(12);
    for (const s of keySlots) {
      const name = keycapNodeName(s.index)!;
      expect(name).toBe(`keycap_r${s.row}c${s.col}`);
      expect(slotForNode(name)).toBe(s.index);
    }
  });

  it("cantos não têm keycap; roda e knob apontam para os slots dos encoders", () => {
    for (const i of [0, 3, 12, 15]) expect(keycapNodeName(i)).toBeNull();
    expect(slotForNode("roller_wheel")).toBe(0);
    expect(slotForNode("roller_bracket")).toBe(0);
    expect(slotForNode("knob")).toBe(3);
    expect(slotForNode("plate_top")).toBeNull();
    expect(SLOT_LAYOUT[0].role).toBe("wheel");
    expect(SLOT_LAYOUT[3].role).toBe("knob");
  });

  it("escolhe a pose pelo estado", () => {
    expect(poseFor(false, 5)).toBe(POSES.hero);
    expect(poseFor(true, null)).toBe(POSES.edit);
    expect(poseFor(true, 5)).toBe(POSES.edit);
    expect(poseFor(true, 0)).toBe(POSES.wheel);
    expect(poseFor(true, 3)).toBe(POSES.knob);
  });

  it("câmera: topo fica acima do alvo e o raio cabe no fov mais estreito", () => {
    const [x, y, z] = orbitPosition([0, 0, 0], 0, 90, 100);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(100);
    expect(z).toBeCloseTo(0);
    // tela estreita (aspect < 1) precisa de mais distância que tela larga
    expect(fitDistance(60, 22, 0.6)).toBeGreaterThan(fitDistance(60, 22, 1.6));
  });
});
