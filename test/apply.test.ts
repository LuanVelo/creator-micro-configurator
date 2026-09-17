import { describe, it, expect } from "vitest";
import { MockTransport } from "../src/protocol/mock-transport.ts";
import { ViaClient } from "../src/protocol/via.ts";
import { GuardedTransport, GuardError } from "../src/protocol/guards.ts";
import { WRITE_COMMANDS } from "../src/protocol/commands.ts";
import { CREATOR_MICRO } from "../src/protocol/device.ts";
import { importViaJson, layersToKeymapBuffer } from "../src/model/serialize.ts";
import { encodeKeycode } from "../src/model/keycodes.ts";
import {
  uploadPreset,
  uploadLayer,
  validatePreset,
  readSnapshot,
  restoreSnapshot,
  presetMatchesSnapshot,
  ApplyError,
} from "../src/protocol/apply.ts";
import type { Preset } from "../src/model/types.ts";
import backup from "../backup_VIA/creator_micro.layout.json";

const basePreset = importViaJson(backup);
const clone = (p: Preset): Preset => structuredClone(p);
const KEYMAP_BYTES = CREATOR_MICRO.layerCount * CREATOR_MICRO.matrixSize * 2;

async function setup(preset: Preset = basePreset, writeEnabled = true) {
  const mock = new MockTransport(preset);
  await mock.connect();
  const via = new ViaClient(new GuardedTransport(mock, { isWriteEnabled: () => writeEnabled }));
  return { mock, via };
}

describe("apply — upload de preset e layer (Fase 1)", () => {
  it("uploadPreset grava keymap + encoders e lê de volta idêntico", async () => {
    const modified = clone(basePreset);
    modified.layers[0].keys[1] = "KC_B";
    modified.layers[1].encoders[0].cw = "KC_A";
    const { via } = await setup();

    await uploadPreset(via, modified, CREATOR_MICRO);

    const buf = await via.getKeymapBuffer(KEYMAP_BYTES);
    expect(Array.from(buf)).toEqual(Array.from(layersToKeymapBuffer(modified.layers)));
    const enc = await via.getAllEncoders(CREATOR_MICRO.layerCount, CREATOR_MICRO.encoderCount);
    expect(enc[1][0].cw).toBe(encodeKeycode("KC_A"));
  });

  it("uploadLayer só altera a layer escolhida", async () => {
    const modified = clone(basePreset);
    modified.layers[2].keys[5] = "KC_Z"; // pos 5 = row 1, col 1
    const { via } = await setup();

    await uploadLayer(via, modified, 2, CREATOR_MICRO);

    expect(await via.getKeycode(2, 1, 1)).toBe(encodeKeycode("KC_Z"));
    // layer 0 intacta (igual ao base)
    const buf = await via.getKeymapBuffer(KEYMAP_BYTES);
    const base = layersToKeymapBuffer(basePreset.layers);
    expect(Array.from(buf.subarray(0, 32))).toEqual(Array.from(base.subarray(0, 32)));
  });
});

describe("apply — validação (§8.3: nada de escrita parcial)", () => {
  it("validatePreset aponta a posição do keycode inválido", () => {
    const bad = clone(basePreset);
    bad.layers[0].keys[3] = "KC_NOPE";
    const issues = validatePreset(bad);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ layer: 0, keycode: "KC_NOPE" });
  });

  it("uploadPreset recusa keycode inválido e NÃO envia nenhuma escrita", async () => {
    const bad = clone(basePreset);
    bad.layers[0].keys[3] = "KC_NOPE";
    const { mock, via } = await setup();

    await expect(uploadPreset(via, bad, CREATOR_MICRO)).rejects.toBeInstanceOf(ApplyError);
    const writes = mock.sentLog.filter((r) => WRITE_COMMANDS.has(r[0]));
    expect(writes).toHaveLength(0);
  });
});

describe("apply — backup de sessão (§8.2)", () => {
  it("snapshot → escreve por cima → restore volta ao estado original", async () => {
    const { via } = await setup();
    const snap = await readSnapshot(via, CREATOR_MICRO);

    const modified = clone(basePreset);
    modified.layers[0].keys[1] = "KC_B";
    await uploadPreset(via, modified, CREATOR_MICRO);
    expect(await via.getKeycode(0, 0, 1)).toBe(encodeKeycode("KC_B"));

    await restoreSnapshot(via, snap);
    const buf = await via.getKeymapBuffer(KEYMAP_BYTES);
    expect(Array.from(buf)).toEqual(Array.from(layersToKeymapBuffer(basePreset.layers)));
  });
});

describe("apply — diff preset × pad (habilita o upload)", () => {
  it("igual ao snapshot = não há o que enviar; diferente = há", async () => {
    const { via } = await setup();
    const snap = await readSnapshot(via, CREATOR_MICRO);
    expect(presetMatchesSnapshot(basePreset, snap)).toBe(true);

    const changed = clone(basePreset);
    changed.layers[0].keys[1] = "KC_B";
    expect(presetMatchesSnapshot(changed, snap)).toBe(false);

    const encChanged = clone(basePreset);
    encChanged.layers[1].encoders[0].cw = "KC_A";
    expect(presetMatchesSnapshot(encChanged, snap)).toBe(false);
  });
});

describe("apply — guard de write-mode (§8.4)", () => {
  it("em read-only, uma escrita do ViaClient é bloqueada pelo guard", async () => {
    const { via } = await setup(basePreset, false);
    await expect(via.setKeycode(0, 0, 0, encodeKeycode("KC_B")!)).rejects.toBeInstanceOf(GuardError);
  });
});
