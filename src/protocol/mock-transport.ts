/**
 * Device VIA falso, em memória, para dev e testes sem hardware (§10: camada de
 * protocolo testável com mock do send()). Semeado com um Preset (ex: o backup
 * do VIA importado) e responde às leituras da Fase 0; também aceita as escritas
 * da Fase 1 mutando o estado interno, para testes de round-trip.
 */
import { VIA_CMD } from "./commands.ts";
import { CREATOR_MICRO, type DeviceGeometry } from "./device.ts";
import { BUFFER_HEADER, keycodeToBytes } from "./codec.ts";
import { encodeKeycode } from "../model/keycodes.ts";
import { layersToKeymapBuffer } from "../model/serialize.ts";
import type { Preset } from "../model/types.ts";
import { type Transport } from "./transport.ts";

const PROTOCOL_VERSION = 0x0009;

export class MockTransport implements Transport {
  readonly name = "Mock";
  private connected = false;

  private readonly geo: DeviceGeometry;
  private keymap: Uint8Array;
  /** encoders[layer][enc] = { ccw, cw } (valores 16 bits). */
  private encoders: Array<Array<{ ccw: number; cw: number }>>;
  private macroBuffer: Uint8Array;
  /** Log de todos os reports enviados — útil p/ testes e p/ o painel de bytes. */
  readonly sentLog: Uint8Array[] = [];

  constructor(preset: Preset, geometry: DeviceGeometry = CREATOR_MICRO) {
    this.geo = geometry;
    this.keymap = layersToKeymapBuffer(preset.layers);
    this.encoders = preset.layers.map((layer) =>
      layer.encoders.map((e) => ({
        ccw: encodeKeycode(e.ccw) ?? 0,
        cw: encodeKeycode(e.cw) ?? 0,
      })),
    );
    this.macroBuffer = new Uint8Array(1024);
  }

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async send(report: Uint8Array): Promise<Uint8Array> {
    this.sentLog.push(report.slice());
    const res = new Uint8Array(this.geo.reportSize);
    res.set(report.subarray(0, 4)); // ecoa o header por padrão
    const cmd = report[0];

    switch (cmd) {
      case VIA_CMD.get_protocol_version:
        res[1] = (PROTOCOL_VERSION >> 8) & 0xff;
        res[2] = PROTOCOL_VERSION & 0xff;
        break;

      case VIA_CMD.dynamic_keymap_get_layer_count:
        res[1] = this.geo.layerCount;
        break;

      case VIA_CMD.dynamic_keymap_get_keycode: {
        const [layer, row, col] = [report[1], report[2], report[3]];
        const pos = row * this.geo.matrixCols + col;
        const off = (layer * this.geo.matrixSize + pos) * 2;
        res[4] = this.keymap[off];
        res[5] = this.keymap[off + 1];
        break;
      }

      case VIA_CMD.dynamic_keymap_set_keycode: {
        const [layer, row, col] = [report[1], report[2], report[3]];
        const pos = row * this.geo.matrixCols + col;
        const off = (layer * this.geo.matrixSize + pos) * 2;
        this.keymap[off] = report[4];
        this.keymap[off + 1] = report[5];
        break;
      }

      case VIA_CMD.dynamic_keymap_get_buffer: {
        const offset = (report[1] << 8) | report[2];
        const size = report[3];
        res.set(this.keymap.subarray(offset, offset + size), BUFFER_HEADER);
        break;
      }

      case VIA_CMD.dynamic_keymap_set_buffer: {
        const offset = (report[1] << 8) | report[2];
        const size = report[3];
        this.keymap.set(report.subarray(BUFFER_HEADER, BUFFER_HEADER + size), offset);
        break;
      }

      case VIA_CMD.dynamic_keymap_get_encoder: {
        const [layer, enc, cw] = [report[1], report[2], report[3]];
        const value = cw ? this.encoders[layer][enc].cw : this.encoders[layer][enc].ccw;
        const [hi, lo] = keycodeToBytes(value);
        res[4] = hi;
        res[5] = lo;
        break;
      }

      case VIA_CMD.dynamic_keymap_set_encoder: {
        const [layer, enc, cw] = [report[1], report[2], report[3]];
        const value = (report[4] << 8) | report[5];
        if (cw) this.encoders[layer][enc].cw = value;
        else this.encoders[layer][enc].ccw = value;
        break;
      }

      case VIA_CMD.dynamic_keymap_macro_get_count:
        res[1] = 16;
        break;

      case VIA_CMD.dynamic_keymap_macro_get_buffer_size:
        res[1] = (this.macroBuffer.length >> 8) & 0xff;
        res[2] = this.macroBuffer.length & 0xff;
        break;

      case VIA_CMD.dynamic_keymap_macro_get_buffer: {
        const offset = (report[1] << 8) | report[2];
        const size = report[3];
        res.set(this.macroBuffer.subarray(offset, offset + size), BUFFER_HEADER);
        break;
      }

      default:
        // Comando não simulado: devolve o eco do header (comportamento benigno).
        break;
    }
    return res;
  }
}
