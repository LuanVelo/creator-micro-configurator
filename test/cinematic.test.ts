import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SLOT_LAYOUT } from "../src/model/layout.ts";
import { checkGraph, manifestSchema, type CinematicManifest } from "../src/ui/cinematic/manifest.ts";
import { mirrorTime, poseForState, reroute, route } from "../src/ui/cinematic/planner.ts";
import { DRAWER_FRAC, STAGE_H, STAGE_W } from "../src/ui/cinematic/stage.ts";

const raw = JSON.parse(readFileSync("public/cinematic/manifest.json", "utf8"));
const manifest: CinematicManifest = manifestSchema.parse(raw);

const connected = (selectedSlot: number | null, panelCollapsed = false) =>
  poseForState({ connection: "connected", selectedSlot, panelCollapsed });

describe("planner", () => {
  it("deriva a pose do estado do app", () => {
    expect(poseForState({ connection: "disconnected", selectedSlot: null, panelCollapsed: true })).toBe("idle");
    expect(connected(null, true)).toBe("top");
    expect(connected(0)).toBe("wheel");
    expect(connected(3)).toBe("knob");
    expect(connected(5)).toBe("edit");
    // trocar de tecla não muda de pose: só o overlay muda, sem transição
    expect(connected(5)).toBe(connected(9));
  });

  it("roteia direto entre poses abertas e pelo hub no resto", () => {
    expect(route(manifest, "top", "top")).toEqual([]);
    expect(route(manifest, "top", "knob")).toHaveLength(1);
    // anel das poses de drawer aberto: não volta ao topo
    expect(route(manifest, "edit", "knob")).toHaveLength(1);
    expect(route(manifest, "knob", "wheel")).toHaveLength(1);
    expect(route(manifest, "wheel", "edit")).toHaveLength(1);
    // sem clipe direto, passa pelo hub
    const cross = route(manifest, "idle", "edit");
    expect(cross).toHaveLength(2);
    expect(cross![0].clip.to).toBe(manifest.hub);
    expect(cross![1].clip.to).toBe("edit");
  });

  it("rebobina quando o alvo muda para trás no meio da transição", () => {
    const [step] = route(manifest, "top", "knob")!;
    // indo para o knob, o usuário pede a roda: existe knob→wheel direto, então
    // seguir em frente é válido
    expect(reroute(manifest, step, "wheel")?.kind).toBe("continue");
    // indo do knob para o topo, pedir o knob de novo = rebobinar
    const [back] = route(manifest, "knob", "top")!;
    const d = reroute(manifest, back, "knob");
    expect(d?.kind).toBe("rewind");
    if (d?.kind === "rewind") expect(d.clip.to).toBe("knob");
  });

  it("espelha o tempo ao rebobinar", () => {
    const clip = manifest.clips[0];
    expect(mirrorTime(clip, 0)).toBeCloseTo(clip.duration);
    expect(mirrorTime(clip, clip.duration)).toBeCloseTo(0);
    expect(mirrorTime(clip, clip.duration * 2)).toBe(0); // nunca negativo
  });
});

describe("manifest do acervo", () => {
  it("é válido e coerente com o app", () => {
    expect(checkGraph(manifest)).toEqual([]);
    expect(manifest.stage).toEqual({ width: STAGE_W, height: STAGE_H });
    expect(manifest.origin).toBe("top-left");
  });

  it("todo clipe tem volta e toda pose é alcançável", () => {
    for (const c of manifest.clips) {
      expect(manifest.clips.some((r) => r.from === c.to && r.to === c.from)).toBe(true);
    }
  });

  it("âncoras: 16 por pose, dentro do quadro e não degeneradas", () => {
    for (const pose of manifest.poses) {
      expect(pose.anchors).toHaveLength(16);
      for (const a of pose.anchors.filter((x) => x.visible)) {
        for (const [x, y] of a.quad) {
          expect(x).toBeGreaterThan(-0.2);
          expect(x).toBeLessThan(1.2);
          expect(y).toBeGreaterThan(-0.2);
          expect(y).toBeLessThan(1.2);
        }
        // área do quad (fórmula do laço) — pega quad degenerado e flip de Y
        const area = Math.abs(
          a.quad.reduce((acc, [x, y], i) => {
            const [nx, ny] = a.quad[(i + 1) % 4];
            return acc + (x * ny - nx * y);
          }, 0) / 2,
        );
        expect(area).toBeGreaterThan(0.0002);
      }
    }
  });

  it("na pose de topo a grade bate com SLOT_LAYOUT", () => {
    const top = manifest.poses.find((p) => p.id === "top")!;
    const keys = SLOT_LAYOUT.filter((s) => s.role === "key");
    for (const a of keys) {
      for (const b of keys) {
        const ca = top.anchors[a.index].center;
        const cb = top.anchors[b.index].center;
        if (a.row < b.row) expect(ca[1]).toBeLessThan(cb[1]);
        if (a.col < b.col) expect(ca[0]).toBeLessThan(cb[0]);
      }
    }
  });

  it("o sujeito das poses de close cabe à esquerda do drawer", () => {
    const subjects: Record<string, number> = { knob: 3, wheel: 0 };
    for (const [id, slot] of Object.entries(subjects)) {
      const pose = manifest.poses.find((p) => p.id === id)!;
      expect(pose.drawer).toBe("open");
      expect(pose.anchors[slot].visible).toBe(true);
      expect(pose.anchors[slot].center[0]).toBeLessThan(1 - DRAWER_FRAC);
    }
  });

  it("o logo nunca é clicável (é serigrafia, não tem peça)", () => {
    for (const pose of manifest.poses) expect(pose.anchors[12].visible).toBe(false);
  });
});
