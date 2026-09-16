import { z } from "zod";
import { STAGE_H, STAGE_W } from "./stage.ts";

/**
 * Contrato entre o render do Blender e o app. Gerado por
 * `3d/scripts/render_states.py`, servido de `public/cinematic/manifest.json`.
 *
 * Lido por fetch (não por import) de propósito: re-renderizar o acervo não
 * exige rebuild do app.
 *
 * Coordenadas normalizadas 0..1 sobre o palco, ORIGEM TOP-LEFT (o Blender
 * devolve bottom-left; o script já faz o flip).
 */
const p2 = z.tuple([z.number(), z.number()]);

export const poseIdSchema = z.enum(["idle", "top", "edit", "knob", "wheel"]);
export type PoseId = z.infer<typeof poseIdSchema>;

const anchorSchema = z.object({
  slot: z.number().int().min(0).max(15),
  visible: z.boolean(),
  /** cantos do topo do keycap, em ordem horária na tela */
  quad: z.tuple([p2, p2, p2, p2]),
  center: p2,
  /** onde ancorar o tooltip (acima do cap) */
  tip: p2,
  /** distância à câmera em mm — ordena o hit test quando caps se sobrepõem */
  depth: z.number(),
});
export type SlotAnchor = z.infer<typeof anchorSchema>;

const poseSchema = z.object({
  id: poseIdSchema,
  drawer: z.enum(["open", "closed"]),
  glow: z.boolean(),
  shiftX: z.number().optional(),
  shiftY: z.number().optional(),
  still: z.object({
    beauty: z.string(),
    emission: z.string().nullable(),
    width: z.number().int(),
    height: z.number().int(),
  }),
  anchors: z.array(anchorSchema).length(16),
});
export type CinematicPose = z.infer<typeof poseSchema>;

const clipSchema = z.object({
  id: z.string(),
  from: poseIdSchema,
  to: poseIdSchema,
  file: z.string(),
  fps: z.number(),
  frames: z.number().int(),
  duration: z.number(),
  width: z.number().int(),
  height: z.number().int(),
});
export type CinematicClip = z.infer<typeof clipSchema>;

export const manifestSchema = z.object({
  version: z.literal(1),
  rev: z.string(),
  generatedAt: z.string(),
  blend: z.string(),
  origin: z.literal("top-left"),
  stage: z.object({ width: z.number().int(), height: z.number().int() }),
  hub: poseIdSchema,
  emissionMode: z.enum(["single", "indexed"]),
  poses: z.array(poseSchema).min(1),
  clips: z.array(clipSchema),
});
export type CinematicManifest = z.infer<typeof manifestSchema>;

export const MANIFEST_URL = "/cinematic/manifest.json";
const BASE = "/cinematic/";

/** URL de um arquivo do acervo, com a revisão para furar cache. */
export function assetUrl(manifest: CinematicManifest, file: string): string {
  return `${BASE}${file}?r=${manifest.rev}`;
}

/** Invariantes que o schema não pega. Falhar aqui = cair para o modo fast. */
export function checkGraph(m: CinematicManifest): string[] {
  const problems: string[] = [];
  if (m.stage.width !== STAGE_W || m.stage.height !== STAGE_H) {
    problems.push(
      `palco do render (${m.stage.width}×${m.stage.height}) ≠ do app (${STAGE_W}×${STAGE_H})`,
    );
  }
  const ids = new Set(m.poses.map((p) => p.id));
  if (!ids.has(m.hub)) problems.push(`hub "${m.hub}" não está entre as poses`);
  for (const c of m.clips) {
    if (!ids.has(c.from) || !ids.has(c.to)) problems.push(`clipe ${c.id} aponta para pose inexistente`);
    if (!m.clips.some((r) => r.from === c.to && r.to === c.from)) {
      problems.push(`clipe ${c.id} não tem volta`);
    }
  }
  // toda pose tem que ser alcançável a partir do hub
  const seen = new Set<PoseId>([m.hub]);
  for (let changed = true; changed; ) {
    changed = false;
    for (const c of m.clips) {
      if (seen.has(c.from) && !seen.has(c.to)) (seen.add(c.to), (changed = true));
    }
  }
  for (const id of ids) {
    if (!seen.has(id) && m.clips.length) problems.push(`pose "${id}" não é alcançável do hub`);
  }
  return problems;
}

export async function loadManifest(): Promise<CinematicManifest | null> {
  try {
    const res = await fetch(MANIFEST_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const parsed = manifestSchema.safeParse(await res.json());
    if (!parsed.success) {
      console.error("[cinematic] manifest inválido:", parsed.error.issues.slice(0, 3));
      return null;
    }
    const problems = checkGraph(parsed.data);
    if (problems.length) console.warn("[cinematic] manifest inconsistente:", problems);
    return parsed.data;
  } catch (e) {
    console.error("[cinematic] não consegui carregar o acervo:", e);
    return null;
  }
}
