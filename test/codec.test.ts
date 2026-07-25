import { describe, it, expect } from "vitest";
import {
  makeReport,
  keycodeToBytes,
  bytesToKeycode,
  packKeycodes,
  unpackKeycodes,
  bufferChunks,
  offsetToBytes,
  MAX_BUFFER_CHUNK,
  totalKeymapBytes,
} from "../src/protocol/codec.ts";

describe("codec", () => {
  it("makeReport tem 32 bytes e command no byte 0", () => {
    const r = makeReport(0x12, [0x00, 0x1c, 0x1c]);
    expect(r.length).toBe(32);
    expect(r[0]).toBe(0x12);
    expect(Array.from(r.subarray(1, 4))).toEqual([0x00, 0x1c, 0x1c]);
    expect(r[4]).toBe(0); // zero-pad
  });

  it("makeReport rejeita payload grande demais", () => {
    expect(() => makeReport(0x01, new Array(32).fill(0))).toThrow();
  });

  it("keycode <-> bytes é big-endian e round-trips", () => {
    expect(keycodeToBytes(0x0817)).toEqual([0x08, 0x17]);
    expect(bytesToKeycode(0x08, 0x17)).toBe(0x0817);
    for (const kc of [0x0000, 0x0004, 0x0a1d, 0x5201, 0x770c, 0xffff]) {
      const [hi, lo] = keycodeToBytes(kc);
      expect(bytesToKeycode(hi, lo)).toBe(kc);
    }
  });

  it("pack/unpack keycodes round-trip", () => {
    const kcs = [0x0004, 0x0019, 0x0817, 0x5201];
    expect(unpackKeycodes(packKeycodes(kcs))).toEqual(kcs);
  });

  it("unpackKeycodes rejeita tamanho ímpar", () => {
    expect(() => unpackKeycodes(new Uint8Array(3))).toThrow();
  });

  it("bufferChunks cobre o total sem sobrepor (128 bytes)", () => {
    const total = totalKeymapBytes(4, 16); // 128
    const chunks = bufferChunks(total);
    expect(chunks[0]).toEqual({ offset: 0, size: MAX_BUFFER_CHUNK });
    const covered = chunks.reduce((sum, c) => sum + c.size, 0);
    expect(covered).toBe(total);
    // offsets contíguos
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].offset).toBe(chunks[i - 1].offset + chunks[i - 1].size);
    }
  });

  it("offsetToBytes é big-endian", () => {
    expect(offsetToBytes(0x011c)).toEqual([0x01, 0x1c]);
  });
});
