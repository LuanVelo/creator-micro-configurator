/**
 * Contrato entre o .glb (public/models/creator-micro.glb, gerado por
 * 3d/scripts/export_glb.py) e a UI. Puro — sem three — para ser testável.
 *
 * Coordenadas do glTF: 1 unidade = 1 mm, Y-up. +Z é a frente (logo/smiley, lado
 * do usuário), −Z é o fundo (roda/knob). Origem = centro do pad em X/Z.
 */
import { SLOT_LAYOUT } from "../../model/layout.ts";

export const MODEL_URL = `${import.meta.env.BASE_URL}models/creator-micro.glb`;

export type Vec3 = [number, number, number];

const KEYCAP_RE = /^keycap_r(\d)c(\d)$/;

/** Peças do encoder da roda (slot 0) e do knob (slot 3), clicáveis como uma unidade. */
export const WHEEL_PARTS = ["roller_wheel", "roller_bracket", "roller_base"] as const;
export const KNOB_PARTS = ["knob"] as const;

/** Nome do nó no glb → índice do slot (row*4+col, mesmo do layout.ts). */
export function slotForNode(name: string): number | null {
  const m = KEYCAP_RE.exec(name);
  if (m) return Number(m[1]) * 4 + Number(m[2]);
  if ((WHEEL_PARTS as readonly string[]).includes(name)) return 0;
  if ((KNOB_PARTS as readonly string[]).includes(name)) return 3;
  return null;
}

/** Nome do keycap de um slot de tecla (null para cantos). */
export function keycapNodeName(slot: number): string | null {
  const s = SLOT_LAYOUT[slot];
  return s?.role === "key" ? `keycap_r${s.row}c${s.col}` : null;
}

/** O smiley é só serigrafia (sem malha): área clicável invisível sobre a placa. */
export const SMILEY_HIT: { slot: number; position: Vec3; size: Vec3 } = {
  slot: 15,
  position: [27, 5.4, 23.7],
  size: [15, 1, 15],
};

/** Altura do topo do keycap acima da origem dele (origem na base do cap). */
export const KEYCAP_TOP = 6.5;

/**
 * No .blend a placa é horizontal e o disco em cunha é que inclina. Na mesa é o
 * contrário: gira o modelo 3,99° (frente desce) para a borracha assentar no
 * chão. Ângulo vem de medidas ESTIMADAS do disco (3d/CLAUDE.md §4).
 */
export const PAD_TILT = (3.99 * Math.PI) / 180;
/** Altura do chão (contato da borracha) depois da inclinação. */
export const FLOOR_Y = -12.05;

// ── Câmera ──────────────────────────────────────────────────────────────────

/**
 * Pose da câmera em coordenadas esféricas em volta de um alvo.
 * az: 0 = de frente; + = câmera à direita. el: 0 = rente à mesa, 90 = topo.
 * radius: raio (mm) que precisa caber na tela — a distância sai do fov/aspect.
 * shiftY: fração da altura para deslocar o pad para cima (abre espaço embaixo).
 */
export interface CameraPose {
  target: Vec3;
  az: number;
  el: number;
  radius: number;
  shiftY: number;
}

const PAD_TARGET: Vec3 = [0, 6, 0];

export const POSES = {
  /** desconectado: 3/4, mostra que é objeto. */
  hero: { target: PAD_TARGET, az: 28, el: 32, radius: 68, shiftY: 0.08 },
  /** conectado: quase topo, rótulos legíveis e ainda com profundidade. */
  edit: { target: PAD_TARGET, az: 0, el: 68, radius: 66, shiftY: 0 },
  /** roda selecionada: é baixa — de lado a tecla vizinha tapa, então vem mais de cima. */
  wheel: { target: [-20, 9, -22], az: -38, el: 60, radius: 54, shiftY: 0 },
  /** knob selecionado: aproxima pela direita. */
  knob: { target: [18, 13, -20], az: 30, el: 42, radius: 52, shiftY: 0 },
} satisfies Record<string, CameraPose>;

export function poseFor(connected: boolean, selectedSlot: number | null): CameraPose {
  if (!connected) return POSES.hero;
  if (selectedSlot === 0) return POSES.wheel;
  if (selectedSlot === 3) return POSES.knob;
  return POSES.edit;
}

/** Limites do "espiar" arrastando (graus somados à pose; volta sozinho ao soltar). */
export const PEEK = { az: 25, elUp: 12, elDown: 20 };

/** Distância para um raio caber no menor dos dois fovs (vertical/horizontal). */
export function fitDistance(radius: number, vFovDeg: number, aspect: number): number {
  const v = (vFovDeg * Math.PI) / 360;
  const h = Math.atan(Math.tan(v) * aspect);
  return radius / Math.tan(Math.min(v, h));
}

/** Posição da câmera para (alvo, az, el, distância). */
export function orbitPosition(target: Vec3, azDeg: number, elDeg: number, dist: number): Vec3 {
  const az = (azDeg * Math.PI) / 180;
  const el = (elDeg * Math.PI) / 180;
  return [
    target[0] + Math.sin(az) * Math.cos(el) * dist,
    target[1] + Math.sin(el) * dist,
    target[2] + Math.cos(az) * Math.cos(el) * dist,
  ];
}
