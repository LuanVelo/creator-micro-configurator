import { describe, it, expect } from "vitest";
import { MockTransport } from "../src/protocol/mock-transport.ts";
import { ViaClient } from "../src/protocol/via.ts";
import { GuardedTransport, GuardError } from "../src/protocol/guards.ts";
import { VIA_CMD } from "../src/protocol/commands.ts";
import { makeReport } from "../src/protocol/codec.ts";
import { layersToKeymapBuffer } from "../src/model/serialize.ts";
import { importViaJson } from "../src/model/serialize.ts";
import { encodeKeycode } from "../src/model/keycodes.ts";
import backup from "../backup_VIA/creator_micro.layout.json";

const preset = importViaJson(backup);

async function connectedMock(): Promise<MockTransport> {
  const t = new MockTransport(preset);
  await t.connect();
  return t;
}

describe("ViaClient leituras contra o MockTransport", () => {
  it("protocol version e layer count", async () => {
    const via = new ViaClient(await connectedMock());
    expect(await via.getProtocolVersion()).toBe(0x0009);
    expect(await via.getLayerCount()).toBe(4);
  });

  it("getKeymapBuffer bate com o buffer semeado", async () => {
    const via = new ViaClient(await connectedMock());
    const buf = await via.getKeymapBuffer(4 * 16 * 2);
    expect(Array.from(buf)).toEqual(Array.from(layersToKeymapBuffer(preset.layers)));
  });

  it("getKeycode devolve a posição correta", async () => {
    const via = new ViaClient(await connectedMock());
    // layer 0, pos 0 (row 0, col 0) = "G(KC_T)" = 0x0817
    expect(await via.getKeycode(0, 0, 0)).toBe(encodeKeycode("G(KC_T)"));
  });

  it("getAllEncoders devolve [ccw, cw] por layer", async () => {
    const via = new ViaClient(await connectedMock());
    const enc = await via.getAllEncoders(4, 2);
    expect(enc[0][0]).toEqual({
      ccw: encodeKeycode("KC_MINS"),
      cw: encodeKeycode("KC_EQL"),
    });
  });
});

describe("GuardedTransport — segurança §8", () => {
  it("rejeita 0x0A/0x0B sem confirmação", async () => {
    const guarded = new GuardedTransport(await connectedMock(), { isWriteEnabled: () => true });
    await expect(guarded.send(makeReport(VIA_CMD.eeprom_reset))).rejects.toBeInstanceOf(GuardError);
    await expect(guarded.send(makeReport(VIA_CMD.bootloader_jump))).rejects.toBeInstanceOf(
      GuardError,
    );
  });

  it("permite 0x0A só com allowForbidden", async () => {
    const guarded = new GuardedTransport(await connectedMock(), {
      isWriteEnabled: () => true,
      allowForbidden: () => true,
    });
    await expect(guarded.send(makeReport(VIA_CMD.eeprom_reset))).resolves.toBeInstanceOf(Uint8Array);
  });

  it("bloqueia escrita em read-only", async () => {
    const guarded = new GuardedTransport(await connectedMock(), { isWriteEnabled: () => false });
    await expect(
      guarded.send(makeReport(VIA_CMD.dynamic_keymap_set_keycode, [0, 0, 0, 0x00, 0x04])),
    ).rejects.toBeInstanceOf(GuardError);
    // leitura passa mesmo em read-only
    await expect(
      guarded.send(makeReport(VIA_CMD.dynamic_keymap_get_layer_count)),
    ).resolves.toBeInstanceOf(Uint8Array);
  });

  it("rejeita report com tamanho != 32", async () => {
    const guarded = new GuardedTransport(await connectedMock(), { isWriteEnabled: () => true });
    await expect(guarded.send(new Uint8Array(16))).rejects.toBeInstanceOf(GuardError);
  });
});

describe("round-trip de escrita (Fase 1) via mock", () => {
  it("set_keycode reflete no get_keycode", async () => {
    const mock = await connectedMock();
    const guarded = new GuardedTransport(mock, { isWriteEnabled: () => true });
    const via = new ViaClient(guarded);
    const newKc = encodeKeycode("KC_B")!;
    await guarded.send(
      makeReport(VIA_CMD.dynamic_keymap_set_keycode, [0, 0, 0, (newKc >> 8) & 0xff, newKc & 0xff]),
    );
    expect(await via.getKeycode(0, 0, 0)).toBe(newKc);
  });
});
