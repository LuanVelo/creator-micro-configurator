/**
 * Fronteira modelo → hardware (§5, §10): tudo que "aplica" um Preset ou uma Layer
 * no pad passa por aqui. Regras de segurança materializadas:
 *  - §8.3: valida TODO keycode contra a tabela antes de qualquer 0x05/0x13/0x15.
 *          Se algo não resolve, LANÇA e não escreve nada (nunca escrita parcial).
 *  - §8.2: snapshot/restore do estado do pad para o backup de sessão.
 * A guarda de write-mode e a de comandos proibidos vivem no GuardedTransport,
 * abaixo do ViaClient — este módulo não relaxa nenhuma delas.
 */
import { ViaClient } from "./via.ts";
import { packKeycodes, totalKeymapBytes } from "./codec.ts";
import type { DeviceGeometry } from "./device.ts";
import { encodeKeycode, isValidKeycode } from "../model/keycodes.ts";
import { layersToKeymapBuffer } from "../model/serialize.ts";
import type { Layer, Preset } from "../model/types.ts";

export interface InvalidKeycode {
  layer: number;
  where: string; // "tecla 5" | "encoder 0 ↻" etc.
  keycode: string;
}

export class ApplyError extends Error {
  constructor(
    message: string,
    readonly invalid: InvalidKeycode[] = [],
  ) {
    super(message);
    this.name = "ApplyError";
  }
}

/** Valida os keycodes de uma layer (teclas + encoders). Não escreve nada. */
export function validateLayer(layer: Layer, layerIndex: number): InvalidKeycode[] {
  const bad: InvalidKeycode[] = [];
  layer.keys.forEach((kc, pos) => {
    if (!isValidKeycode(kc)) bad.push({ layer: layerIndex, where: `tecla ${pos}`, keycode: kc });
  });
  layer.encoders.forEach((e, enc) => {
    if (!isValidKeycode(e.ccw))
      bad.push({ layer: layerIndex, where: `encoder ${enc} ↺`, keycode: e.ccw });
    if (!isValidKeycode(e.cw))
      bad.push({ layer: layerIndex, where: `encoder ${enc} ↻`, keycode: e.cw });
  });
  return bad;
}

/** Valida o preset inteiro. Vazio = pronto para upload. */
export function validatePreset(preset: Preset): InvalidKeycode[] {
  return preset.layers.flatMap((layer, i) => validateLayer(layer, i));
}

async function writeEncoders(via: ViaClient, layer: Layer, layerIndex: number): Promise<void> {
  for (let enc = 0; enc < layer.encoders.length; enc++) {
    const e = layer.encoders[enc];
    await via.setEncoder(layerIndex, enc, false, encodeKeycode(e.ccw)!);
    await via.setEncoder(layerIndex, enc, true, encodeKeycode(e.cw)!);
  }
}

/**
 * Upload de um preset inteiro (feature 06): valida tudo, grava as 4 layers em
 * lote (0x13) e depois os encoders (0x15). As teclas de clique dos encoders são
 * posições de matriz e já vão no buffer de keymap.
 */
export async function uploadPreset(
  via: ViaClient,
  preset: Preset,
  _geo: DeviceGeometry,
): Promise<void> {
  const bad = validatePreset(preset);
  if (bad.length) throw new ApplyError(`${bad.length} keycode(s) inválido(s); nada foi escrito.`, bad);

  await via.setKeymapBuffer(layersToKeymapBuffer(preset.layers), 0);
  for (let li = 0; li < preset.layers.length; li++) {
    await writeEncoders(via, preset.layers[li], li);
  }
}

/**
 * Upload de UMA layer só (feature 08 — "escolher em qual layer gravar"): valida
 * a layer, grava suas 16 teclas na região certa do buffer e seus encoders.
 */
export async function uploadLayer(
  via: ViaClient,
  preset: Preset,
  layerIndex: number,
  geo: DeviceGeometry,
): Promise<void> {
  const layer = preset.layers[layerIndex];
  if (!layer) throw new ApplyError(`Layer ${layerIndex} não existe no preset.`);
  const bad = validateLayer(layer, layerIndex);
  if (bad.length) throw new ApplyError(`${bad.length} keycode(s) inválido(s); nada foi escrito.`, bad);

  const bytes = packKeycodes(layer.keys.map((kc) => encodeKeycode(kc)!));
  await via.setKeymapBuffer(bytes, layerIndex * geo.matrixSize * 2);
  await writeEncoders(via, layer, layerIndex);
}

// ── Backup de sessão (§8.2) ─────────────────────────────────────────────────

/**
 * Estado bruto do pad, lido antes do primeiro write. Guardado em bytes crus para
 * um restore byte-exato (sem passar por decode/encode, que poderia perder um
 * keycode especial ainda não mapeado).
 */
export interface PadSnapshot {
  layerCount: number;
  /** buffer bruto do keymap dinâmico (todas as layers). */
  keymap: number[];
  /** [layer][encoder] = [ccw, cw] cru (16 bits). */
  encoders: number[][][];
}

/** Lê o estado atual do pad para servir de backup de sessão. */
export async function readSnapshot(via: ViaClient, geo: DeviceGeometry): Promise<PadSnapshot> {
  const layerCount = await via.getLayerCount();
  const keymap = await via.getKeymapBuffer(totalKeymapBytes(layerCount, geo.matrixSize));
  const enc = await via.getAllEncoders(layerCount, geo.encoderCount);
  return {
    layerCount,
    keymap: Array.from(keymap),
    encoders: enc.map((perLayer) => perLayer.map((e) => [e.ccw, e.cw])),
  };
}

/** Restaura um snapshot no pad (byte-exato). Requer write habilitado. */
export async function restoreSnapshot(via: ViaClient, snap: PadSnapshot): Promise<void> {
  await via.setKeymapBuffer(Uint8Array.from(snap.keymap), 0);
  for (let li = 0; li < snap.encoders.length; li++) {
    for (let enc = 0; enc < snap.encoders[li].length; enc++) {
      const [ccw, cw] = snap.encoders[li][enc];
      await via.setEncoder(li, enc, false, ccw);
      await via.setEncoder(li, enc, true, cw);
    }
  }
}

/**
 * true se o preset já é exatamente o que está no pad (snapshot). Usado para
 * decidir se o botão de upload fica habilitado (só há o que enviar se diferir).
 * Compara keymap (bytes) e encoders (valores), sem tocar no hardware.
 */
export function presetMatchesSnapshot(preset: Preset, snap: PadSnapshot): boolean {
  const buf = layersToKeymapBuffer(preset.layers);
  if (buf.length !== snap.keymap.length) return false;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== snap.keymap[i]) return false;
  }
  for (let li = 0; li < preset.layers.length; li++) {
    const encs = preset.layers[li].encoders;
    for (let e = 0; e < encs.length; e++) {
      const pair = snap.encoders[li]?.[e];
      if (!pair) return false;
      if ((encodeKeycode(encs[e].ccw) ?? 0) !== pair[0]) return false;
      if ((encodeKeycode(encs[e].cw) ?? 0) !== pair[1]) return false;
    }
  }
  return true;
}
