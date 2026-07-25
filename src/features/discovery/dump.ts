/**
 * Leitura completa do estado do pad (Fase 0, read-only) e reconciliação contra
 * o backup do VIA. A reconciliação *aprende* o encoding real dos keycodes
 * especiais (TO/MACRO/RGB...) pareando o valor bruto lido do pad com a string
 * do backup na mesma posição row-major — sem depender do palpite de versão.
 */
import { unpackKeycodes, totalKeymapBytes } from "../../protocol/codec.ts";
import { ViaClient } from "../../protocol/via.ts";
import { decodeKeycode, encodeKeycode, isVerifyPending } from "../../model/keycodes.ts";
import type { DeviceGeometry } from "../../protocol/device.ts";
import type { Preset } from "../../model/types.ts";

export interface DiscoveryDump {
  transportName: string;
  protocolVersion: number;
  layerCount: number;
  /** [layer][pos] = valor bruto 16 bits. */
  layers: number[][];
  /** [layer][encoder] = { ccw, cw } bruto. */
  encoders: Array<Array<{ ccw: number; cw: number }>>;
  macroCount: number;
  macroBufferSize: number;
}

export async function readDump(
  via: ViaClient,
  geo: DeviceGeometry,
  transportName: string,
): Promise<DiscoveryDump> {
  const protocolVersion = await via.getProtocolVersion();
  const layerCount = await via.getLayerCount();

  const total = totalKeymapBytes(layerCount, geo.matrixSize);
  const bytes = await via.getKeymapBuffer(total);
  const flat = unpackKeycodes(bytes);
  const layers: number[][] = [];
  for (let l = 0; l < layerCount; l++) {
    layers.push(flat.slice(l * geo.matrixSize, (l + 1) * geo.matrixSize));
  }

  const encoders = await via.getAllEncoders(layerCount, geo.encoderCount);
  const macroCount = await via.getMacroCount();
  const macroBufferSize = await via.getMacroBufferSize();

  return { transportName, protocolVersion, layerCount, layers, encoders, macroCount, macroBufferSize };
}

// ── Reconciliação ──────────────────────────────────────────────────────────

export interface SlotDiff {
  layer: number;
  pos: number;
  padValue: number;
  padDecoded: string;
  backup: string;
  agree: boolean;
  /** valor cai num range especial ainda não confirmado. */
  verifyPending: boolean;
}

export interface LearnedMapping {
  /** string do backup (ground truth). */
  keycode: string;
  /** valor bruto real lido do pad. */
  padValue: number;
  /** o que o nosso codec produziria (pode divergir). */
  ourGuess: number | null;
}

export interface ReconcileResult {
  slots: SlotDiff[];
  mismatches: SlotDiff[];
  /** keycodes especiais cujo valor real difere do nosso palpite — o achado. */
  learned: LearnedMapping[];
  keymapMatches: boolean;
  comparedLayers: number;
}

export function reconcile(dump: DiscoveryDump, backup: Preset): ReconcileResult {
  const slots: SlotDiff[] = [];
  const learnedMap = new Map<string, LearnedMapping>();
  const comparedLayers = Math.min(dump.layers.length, backup.layers.length);

  for (let l = 0; l < comparedLayers; l++) {
    const backupKeys = backup.layers[l].keys;
    dump.layers[l].forEach((padValue, pos) => {
      const backupStr = backupKeys[pos] ?? "";
      const padDecoded = decodeKeycode(padValue);
      const agree = padDecoded === backupStr;
      slots.push({
        layer: l,
        pos,
        padValue,
        padDecoded,
        backup: backupStr,
        agree,
        verifyPending: isVerifyPending(padValue),
      });
      if (!agree && backupStr && !learnedMap.has(backupStr)) {
        learnedMap.set(backupStr, {
          keycode: backupStr,
          padValue,
          ourGuess: encodeKeycode(backupStr),
        });
      }
    });
  }

  const mismatches = slots.filter((s) => !s.agree);
  return {
    slots,
    mismatches,
    learned: [...learnedMap.values()],
    keymapMatches: mismatches.length === 0,
    comparedLayers,
  };
}

/** Gera o markdown de docs/phase0-findings.md a partir do dump + reconciliação. */
export function findingsMarkdown(
  dump: DiscoveryDump,
  rec: ReconcileResult,
  geo: DeviceGeometry,
): string {
  const hex = (v: number) => `0x${v.toString(16).toUpperCase().padStart(4, "0")}`;
  const lines: string[] = [
    "# Fase 0 — Findings",
    "",
    `- Transporte: **${dump.transportName}**`,
    `- Protocol version: **${hex(dump.protocolVersion)}**`,
    `- Layer count: **${dump.layerCount}** (esperado ${geo.layerCount})`,
    `- Matrix size (assumido): **${geo.matrixSize}** slots/layer`,
    `- Macros: count **${dump.macroCount}**, buffer size **${dump.macroBufferSize}** bytes`,
    `- Keymap bate 1:1 com o backup VIA: **${rec.keymapMatches ? "SIM ✅" : "NÃO ❌"}** ` +
      `(${rec.mismatches.length} divergência(s) em ${rec.comparedLayers} layers)`,
    "",
  ];

  if (rec.learned.length) {
    lines.push(
      "## Encoding especial aprendido (pad ↔ backup)",
      "",
      "| keycode | valor real (pad) | nosso palpite | ok |",
      "|---|---|---|---|",
      ...rec.learned.map(
        (m) =>
          `| \`${m.keycode}\` | ${hex(m.padValue)} | ${m.ourGuess === null ? "—" : hex(m.ourGuess)} | ${
            m.ourGuess === m.padValue ? "✅" : "⚠️ ajustar"
          } |`,
      ),
      "",
    );
  }

  lines.push(
    "## Gate de decisão (§3) — a preencher",
    "- [ ] MCU: AVR (ATmega32U4) vs RP2040 — `qmk info -kb work_louder/micro`",
    "- [ ] RGB: canal 3 (Matrix) vs 2 (RGBLIGHT)",
    "- [ ] Encoder click: posição de matriz ou firmware?",
    "- [ ] Mapa (row,col) → slot físico confirmado",
    "- [ ] Sensor capacitivo (smiley): tecla de matriz ou evento próprio?",
    "- [ ] Contagem/posição dos LEDs (RGB por layer)",
    "",
  );
  return lines.join("\n");
}
