/**
 * Conversões entre os três artefatos da fonte única (§6): VIA JSON, Preset e
 * bytes de keymap. Puro e testável sem hardware.
 */
import { encodeKeycode, decodeKeycode } from "./keycodes.ts";
import { packKeycodes, unpackKeycodes } from "../protocol/codec.ts";
import { viaLayoutSchema, type ViaLayout } from "./schema.ts";
import type { EncoderMap, Layer, Macro, Preset } from "./types.ts";

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface ImportOptions {
  id?: string;
  name?: string;
  /** Notação alvo. O backup usa Mac (LGUI/LALT); default "mac". */
  targetOS?: Preset["targetOS"];
}

/**
 * Importa um export do VIA (`*.layout.json`) para um Preset. Preserva a ordem
 * row-major das teclas e o par [ccw, cw] dos encoders. Não recomeça do zero.
 */
export function importViaJson(raw: unknown, opts: ImportOptions = {}): Preset {
  const via: ViaLayout = viaLayoutSchema.parse(raw);

  const layers: Layer[] = via.layers.map((keys, layerIndex) => {
    const encoders: EncoderMap[] = (via.encoders ?? []).map((perEncoder) => {
      const pair = perEncoder[layerIndex];
      return pair ? { ccw: pair[0], cw: pair[1] } : { ccw: "KC_NO", cw: "KC_NO" };
    });
    return {
      index: layerIndex,
      name: `Layer ${layerIndex}`,
      keys: [...keys],
      encoders,
    };
  });

  const macros: Macro[] = via.macros.map((actions, index) => ({ index, actions }));

  const name = opts.name ?? `${via.name} (VIA import)`;
  return {
    id: opts.id ?? slug(name),
    name,
    targetOS: opts.targetOS ?? "mac",
    layers,
    macros,
  };
}

/** Preset -> objeto no formato de export do VIA (para salvar/round-trip). */
export function presetToViaJson(preset: Preset, vendorProductId: number): ViaLayout {
  const encoderCount = preset.layers[0]?.encoders.length ?? 0;
  const encoders: Array<Array<[string, string]>> = [];
  for (let e = 0; e < encoderCount; e++) {
    encoders.push(preset.layers.map((layer) => [layer.encoders[e].ccw, layer.encoders[e].cw]));
  }
  return {
    name: preset.name.replace(/ \(VIA import\)$/, ""),
    vendorProductId,
    macros: [...preset.macros].sort((a, b) => a.index - b.index).map((m) => m.actions),
    layers: preset.layers.map((l) => [...l.keys]),
    encoders,
  };
}

/**
 * Serializa as teclas de todas as layers em um único buffer de bytes, na ordem
 * do keymap dinâmico (layer-major, row-major). Usado no upload (0x13) e nos
 * testes de round-trip. Keycodes que não resolvem viram KC_NO (0x0000) — o
 * guard de validação (§8, regra 3) roda antes, então isto não deve acontecer.
 */
export function layersToKeymapBuffer(layers: Layer[]): Uint8Array {
  const values: number[] = [];
  for (const layer of layers) {
    for (const kc of layer.keys) {
      values.push(encodeKeycode(kc) ?? 0x0000);
    }
  }
  return packKeycodes(values);
}

/** Buffer de bytes -> matriz de keycodes string por layer (decodifica). */
export function keymapBufferToLayers(
  bytes: Uint8Array,
  layerCount: number,
  matrixSize: number,
): string[][] {
  const values = unpackKeycodes(bytes);
  const layers: string[][] = [];
  for (let l = 0; l < layerCount; l++) {
    const start = l * matrixSize;
    layers.push(values.slice(start, start + matrixSize).map(decodeKeycode));
  }
  return layers;
}
