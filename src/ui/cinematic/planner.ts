import type { CinematicClip, CinematicManifest, PoseId } from "./manifest.ts";

/**
 * Máquina de roteamento do modo cinematográfico. PURA — sem React, sem DOM —
 * para ser testável sem hardware e sem navegador.
 *
 * Todo caminho passa pelo hub (`top`): sair do knob para a roda é `knob→top`
 * seguido de `top→wheel`. É o que mantém o acervo pequeno e o movimento legível.
 */
export interface ClipStep {
  clip: CinematicClip;
}

/** Pose que o estado atual do app pede. */
export function poseForState(s: {
  connection: string;
  selectedSlot: number | null;
  panelCollapsed: boolean;
}): PoseId {
  if (s.connection !== "connected") return "idle";
  if (s.panelCollapsed) return "top";
  if (s.selectedSlot === 0) return "wheel";
  if (s.selectedSlot === 3) return "knob";
  return "edit";
}

function findClip(m: CinematicManifest, from: PoseId, to: PoseId): CinematicClip | undefined {
  return m.clips.find((c) => c.from === from && c.to === to);
}

/**
 * Passos para ir de uma pose a outra. Vazio = nada a fazer; null = não há
 * caminho (o player corta com crossfade, em vez de travar).
 */
export function route(m: CinematicManifest, from: PoseId, to: PoseId): ClipStep[] | null {
  if (from === to) return [];
  const direct = findClip(m, from, to);
  if (direct) return [{ clip: direct }];
  const toHub = findClip(m, from, m.hub);
  const fromHub = findClip(m, m.hub, to);
  if (toHub && fromHub) return [{ clip: toHub }, { clip: fromHub }];
  return null;
}

/**
 * O alvo mudou no meio de uma transição. Duas saídas:
 *  - "continue": o passo atual ainda serve (o destino dele está no caminho novo);
 *  - "rewind": rebobina o passo atual (toca o inverso a partir do frame
 *    espelhado) e segue dali. Com hub, mudar de destino quase sempre exige
 *    voltar mesmo — rebobinar É o caminho certo, e lê como movimento físico
 *    em vez de corte seco.
 */
export function reroute(
  m: CinematicManifest,
  playing: ClipStep,
  target: PoseId,
): { kind: "continue"; plan: ClipStep[] } | { kind: "rewind"; clip: CinematicClip; plan: ClipStep[] } | null {
  const back = findClip(m, playing.clip.to, playing.clip.from);
  // desistiu no meio do caminho: volta pelo mesmo caminho, não dá a volta toda
  if (target === playing.clip.from && back) {
    return { kind: "rewind", clip: back, plan: [] };
  }
  const ahead = route(m, playing.clip.to, target);
  if (ahead) return { kind: "continue", plan: ahead };
  if (!back) return null;
  const after = route(m, playing.clip.from, target);
  if (!after) return null;
  return { kind: "rewind", clip: back, plan: after };
}

/** Tempo espelhado ao rebobinar: quem está em t de um clipe entra no inverso em duration−t. */
export function mirrorTime(clip: CinematicClip, t: number): number {
  return Math.max(0, Math.min(clip.duration, clip.duration - t));
}
