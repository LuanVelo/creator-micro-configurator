/**
 * Cliente VIA de alto nível. Fala só com um `Transport` (idealmente já
 * embrulhado por `GuardedTransport`). Na Fase 0 expõe apenas leitura; escritas
 * entram na Fase 1.
 */
import { VIA_CMD } from "./commands.ts";
import {
  BUFFER_HEADER,
  bufferChunks,
  keycodeToBytes,
  makeReport,
  offsetToBytes,
} from "./codec.ts";
import type { Transport } from "./transport.ts";

export class ViaClient {
  constructor(private readonly transport: Transport) {}

  private async command(id: number, payload: readonly number[] = []): Promise<Uint8Array> {
    return this.transport.send(makeReport(id, payload));
  }

  /** 0x01 — handshake. Retorna a versão do protocolo (16 bits). */
  async getProtocolVersion(): Promise<number> {
    const r = await this.command(VIA_CMD.get_protocol_version);
    return (r[1] << 8) | r[2];
  }

  /** 0x11 — quantas layers o keymap dinâmico tem. */
  async getLayerCount(): Promise<number> {
    const r = await this.command(VIA_CMD.dynamic_keymap_get_layer_count);
    return r[1];
  }

  /** 0x04 — lê 1 tecla (layer,row,col) como keycode 16 bits. */
  async getKeycode(layer: number, row: number, col: number): Promise<number> {
    const r = await this.command(VIA_CMD.dynamic_keymap_get_keycode, [layer, row, col]);
    return (r[4] << 8) | r[5];
  }

  /** 0x12 — lê `totalBytes` do keymap dinâmico, em pacotes de até 28 bytes. */
  async getKeymapBuffer(totalBytes: number): Promise<Uint8Array> {
    const out = new Uint8Array(totalBytes);
    for (const { offset, size } of bufferChunks(totalBytes)) {
      const [hi, lo] = offsetToBytes(offset);
      const r = await this.command(VIA_CMD.dynamic_keymap_get_buffer, [hi, lo, size]);
      out.set(r.subarray(BUFFER_HEADER, BUFFER_HEADER + size), offset);
    }
    return out;
  }

  /** 0x14 — lê uma direção de um encoder. `clockwise` false=ccw, true=cw. */
  async getEncoder(layer: number, encoderId: number, clockwise: boolean): Promise<number> {
    const r = await this.command(VIA_CMD.dynamic_keymap_get_encoder, [
      layer,
      encoderId,
      clockwise ? 1 : 0,
    ]);
    return (r[4] << 8) | r[5];
  }

  /**
   * Lê todos os encoders de todas as layers como [ccw, cw].
   * Retorno: encoders[layer][encoderId] = { ccw, cw } (valores 16 bits).
   */
  async getAllEncoders(
    layerCount: number,
    encoderCount: number,
  ): Promise<Array<Array<{ ccw: number; cw: number }>>> {
    const result: Array<Array<{ ccw: number; cw: number }>> = [];
    for (let layer = 0; layer < layerCount; layer++) {
      const perLayer: Array<{ ccw: number; cw: number }> = [];
      for (let enc = 0; enc < encoderCount; enc++) {
        const ccw = await this.getEncoder(layer, enc, false);
        const cw = await this.getEncoder(layer, enc, true);
        perLayer.push({ ccw, cw });
      }
      result.push(perLayer);
    }
    return result;
  }

  /** 0x0C — número de macros. */
  async getMacroCount(): Promise<number> {
    const r = await this.command(VIA_CMD.dynamic_keymap_macro_get_count);
    return r[1];
  }

  /** 0x0D — tamanho do buffer de macros. */
  async getMacroBufferSize(): Promise<number> {
    const r = await this.command(VIA_CMD.dynamic_keymap_macro_get_buffer_size);
    return (r[1] << 8) | r[2];
  }

  /** 0x0E — lê o buffer bruto de macros. */
  async getMacroBuffer(totalBytes: number): Promise<Uint8Array> {
    const out = new Uint8Array(totalBytes);
    for (const { offset, size } of bufferChunks(totalBytes)) {
      const [hi, lo] = offsetToBytes(offset);
      const r = await this.command(VIA_CMD.dynamic_keymap_macro_get_buffer, [hi, lo, size]);
      out.set(r.subarray(BUFFER_HEADER, BUFFER_HEADER + size), offset);
    }
    return out;
  }

  // ── Escrita (Fase 1). Só passa se o modo escrita estiver habilitado no guard. ──

  /** 0x05 — grava 1 tecla (layer,row,col) com keycode 16 bits. */
  async setKeycode(layer: number, row: number, col: number, keycode: number): Promise<void> {
    const [hi, lo] = keycodeToBytes(keycode);
    await this.command(VIA_CMD.dynamic_keymap_set_keycode, [layer, row, col, hi, lo]);
  }

  /** 0x15 — grava uma direção de encoder. `clockwise` false=ccw, true=cw. */
  async setEncoder(
    layer: number,
    encoderId: number,
    clockwise: boolean,
    keycode: number,
  ): Promise<void> {
    const [hi, lo] = keycodeToBytes(keycode);
    await this.command(VIA_CMD.dynamic_keymap_set_encoder, [
      layer,
      encoderId,
      clockwise ? 1 : 0,
      hi,
      lo,
    ]);
  }

  /**
   * 0x13 — grava `bytes` no keymap dinâmico a partir de `baseOffset`, em pacotes
   * de até MAX_BUFFER_CHUNK. Upload em lote: as 4 layers saem em ~4 pacotes.
   */
  async setKeymapBuffer(bytes: Uint8Array, baseOffset = 0): Promise<void> {
    for (const { offset, size } of bufferChunks(bytes.length)) {
      const [hi, lo] = offsetToBytes(baseOffset + offset);
      const chunk = Array.from(bytes.subarray(offset, offset + size));
      await this.command(VIA_CMD.dynamic_keymap_set_buffer, [hi, lo, size, ...chunk]);
    }
  }

  /** 0x06 — reseta o keymap dinâmico (recuperação, §8). Não toca no resto da EEPROM. */
  async resetDynamicKeymap(): Promise<void> {
    await this.command(VIA_CMD.dynamic_keymap_reset);
  }
}
