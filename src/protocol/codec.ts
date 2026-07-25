/**
 * Empacotamento/desempacotamento de bytes do protocolo VIA. Puro e testável
 * sem hardware. Keycode = 16 bits, big-endian no payload (§4).
 */
import { CREATOR_MICRO } from "./device.ts";

const REPORT_SIZE = CREATOR_MICRO.reportSize;

/** Header do get_buffer/set_buffer: cmd(1) + offset(2) + size(1). */
export const BUFFER_HEADER = 4;
/** Bytes de dados por pacote de buffer: 32 - 4. */
export const MAX_BUFFER_CHUNK = REPORT_SIZE - BUFFER_HEADER;

/** Monta um report de 32 bytes: byte 0 = commandId, resto = payload (zero-pad). */
export function makeReport(commandId: number, payload: readonly number[] = []): Uint8Array {
  if (payload.length > REPORT_SIZE - 1) {
    throw new RangeError(`Payload de ${payload.length} bytes excede o report de ${REPORT_SIZE}.`);
  }
  const report = new Uint8Array(REPORT_SIZE);
  report[0] = commandId & 0xff;
  for (let i = 0; i < payload.length; i++) {
    report[i + 1] = payload[i] & 0xff;
  }
  return report;
}

/** Keycode 16 bits -> [hi, lo] big-endian. */
export function keycodeToBytes(keycode: number): [number, number] {
  return [(keycode >> 8) & 0xff, keycode & 0xff];
}

/** [hi, lo] big-endian -> keycode 16 bits. */
export function bytesToKeycode(hi: number, lo: number): number {
  return ((hi & 0xff) << 8) | (lo & 0xff);
}

/** Vetor de keycodes 16 bits -> bytes (2 por keycode, big-endian). */
export function packKeycodes(keycodes: readonly number[]): Uint8Array {
  const bytes = new Uint8Array(keycodes.length * 2);
  for (let i = 0; i < keycodes.length; i++) {
    const [hi, lo] = keycodeToBytes(keycodes[i]);
    bytes[i * 2] = hi;
    bytes[i * 2 + 1] = lo;
  }
  return bytes;
}

/** Bytes -> vetor de keycodes 16 bits. `length` deve ser par. */
export function unpackKeycodes(bytes: Uint8Array): number[] {
  if (bytes.length % 2 !== 0) {
    throw new RangeError(`Buffer de keycodes deve ter tamanho par, tem ${bytes.length}.`);
  }
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i += 2) {
    out.push(bytesToKeycode(bytes[i], bytes[i + 1]));
  }
  return out;
}

/** Offset em bytes de uma posição no keymap dinâmico (row-major, flat). */
export function keymapBufferOffset(layer: number, position: number, matrixSize: number): number {
  return (layer * matrixSize + position) * 2;
}

/** Tamanho total do keymap dinâmico, em bytes. */
export function totalKeymapBytes(layerCount: number, matrixSize: number): number {
  return layerCount * matrixSize * 2;
}

/** Offset (2 bytes, big-endian) para o header de get_buffer/set_buffer. */
export function offsetToBytes(offset: number): [number, number] {
  return [(offset >> 8) & 0xff, offset & 0xff];
}

/** Divide um total de bytes em janelas [offset, size] de até MAX_BUFFER_CHUNK. */
export function bufferChunks(totalBytes: number): Array<{ offset: number; size: number }> {
  const chunks: Array<{ offset: number; size: number }> = [];
  for (let offset = 0; offset < totalBytes; offset += MAX_BUFFER_CHUNK) {
    chunks.push({ offset, size: Math.min(MAX_BUFFER_CHUNK, totalBytes - offset) });
  }
  return chunks;
}
