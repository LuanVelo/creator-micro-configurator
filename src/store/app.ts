/**
 * Estado da UI do configurador (Fase 1). Semeado com o backup do VIA importado.
 * A biblioteca de presets (presets + activePresetId) é persistida em localStorage
 * — base pro "config como código" (§1.3). Ainda não escreve no hardware; o upload
 * (0x05/0x13/0x15) entra numa tarefa seguinte, atrás do modo escrita.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { importViaJson } from "../model/serialize.ts";
import backupJson from "../../backup_VIA/creator_micro.layout.json";
import type { Preset } from "../model/types.ts";
import type { Transport } from "../protocol/transport.ts";
import { MockTransport } from "../protocol/mock-transport.ts";
import { WebHIDTransport } from "../protocol/webhid-transport.ts";
import { GuardedTransport } from "../protocol/guards.ts";
import { ViaClient } from "../protocol/via.ts";
import { CREATOR_MICRO } from "../protocol/device.ts";
import {
  readSnapshot,
  uploadPreset,
  presetMatchesSnapshot,
  type PadSnapshot,
} from "../protocol/apply.ts";

const seed = importViaJson(backupJson, { id: "figma-design", name: "Figma Design" });

export type SidePanelTab = "presets" | "actions";
export type ConnectionState = "disconnected" | "connecting" | "connected";
export type TransportKind = "webhid" | "mock";
/**
 * Modo do pad: "fast" = SVG do Figma (ferramenta do dia a dia); "cinematic" =
 * imagem pré-renderizada do Blender (vitrine). Ver docs/cinematic-instrucoes.md.
 */
export type PadView = "fast" | "cinematic";

// Singletons não-reativos do transporte. `writeArmed` só fica true durante um
// upload explícito — fora disso o GuardedTransport mantém tudo read-only (§8.4).
let transport: Transport | null = null;
let via: ViaClient | null = null;
let writeArmed = false;

interface AppState {
  presets: Preset[];
  activePresetId: string;
  activeLayer: number;
  selectedSlot: number | null;
  panelTab: SidePanelTab;
  panelCollapsed: boolean;
  padView: PadView;

  // conexão com o hardware
  connection: ConnectionState;
  deviceName: string | null;
  connError: string | null;
  uploading: boolean;
  /** estado lido do pad no connect: baseline p/ o diff + backup de sessão (§8.2). */
  padBaseline: PadSnapshot | null;

  setActiveLayer: (n: number) => void;
  selectSlot: (n: number | null) => void;
  setActivePresetId: (id: string) => void;
  setPanelTab: (tab: SidePanelTab) => void;
  showPanelTab: (tab: SidePanelTab) => void;
  toggleCollapsed: () => void;
  setPadView: (v: PadView) => void;
  setKeycode: (slotIndex: number, keycode: string) => void;
  setEncoder: (encoderIndex: number, dir: "ccw" | "cw", keycode: string) => void;

  // biblioteca de presets
  createPresetFromCurrent: () => string; // snapshot do keymap em edição → novo preset
  duplicatePreset: (id: string) => string;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;

  // hardware
  connect: (kind: TransportKind) => Promise<void>;
  disconnect: () => Promise<void>;
  uploadToPad: () => Promise<void>;
}

function newId(): string {
  const c = globalThis.crypto;
  return c?.randomUUID ? c.randomUUID() : `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Nome único "Cópia de X" (X 2, X 3… se colidir). */
function copyName(base: string, presets: Preset[]): string {
  const taken = new Set(presets.map((p) => p.name));
  let name = `Cópia de ${base}`;
  let n = 2;
  while (taken.has(name)) name = `Cópia de ${base} ${n++}`;
  return name;
}

function updateActivePreset(state: AppState, fn: (p: Preset) => Preset): Partial<AppState> {
  return {
    presets: state.presets.map((p) => (p.id === state.activePresetId ? fn(p) : p)),
  };
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      presets: [seed],
      activePresetId: seed.id,
      activeLayer: 0,
      selectedSlot: null,
      panelTab: "presets",
      panelCollapsed: true, // drawer fechado por padrão (idle conectado = 56:2700)
      padView: "cinematic",

      connection: "disconnected",
      deviceName: null,
      connError: null,
      uploading: false,
      padBaseline: null,

      setActiveLayer: (n) => set({ activeLayer: n, selectedSlot: null }),
      // selecionar uma tecla sempre abre o drawer; desmarcar (null) não força estado.
      selectSlot: (n) => set((s) => ({ selectedSlot: n, panelCollapsed: n === null ? s.panelCollapsed : false })),
      setActivePresetId: (id) => set({ activePresetId: id, selectedSlot: null }),
      setPanelTab: (tab) => set({ panelTab: tab }),
      // abas do header: abre o drawer naquela aba (sai do editor de tecla).
      showPanelTab: (tab) => set({ panelTab: tab, selectedSlot: null, panelCollapsed: false }),
      toggleCollapsed: () => set((s) => ({ panelCollapsed: !s.panelCollapsed })),
      setPadView: (padView) => set({ padView }),

      setKeycode: (slotIndex, keycode) =>
        set((s) =>
          updateActivePreset(s, (p) => ({
            ...p,
            layers: p.layers.map((layer, li) =>
              li === s.activeLayer
                ? { ...layer, keys: layer.keys.map((kc, i) => (i === slotIndex ? keycode : kc)) }
                : layer,
            ),
          })),
        ),

      setEncoder: (encoderIndex, dir, keycode) =>
        set((s) =>
          updateActivePreset(s, (p) => ({
            ...p,
            layers: p.layers.map((layer, li) =>
              li === s.activeLayer
                ? {
                    ...layer,
                    encoders: layer.encoders.map((e, ei) =>
                      ei === encoderIndex ? { ...e, [dir]: keycode } : e,
                    ),
                  }
                : layer,
            ),
          })),
        ),

      // "+" = cópia do estado atual (decisão B / feature 07). Vira o preset ativo.
      createPresetFromCurrent: () => {
        const s = get();
        const active = s.presets.find((p) => p.id === s.activePresetId) ?? s.presets[0];
        const clone = structuredClone(active) as Preset;
        clone.id = newId();
        clone.name = copyName(active.name, s.presets);
        set({ presets: [...s.presets, clone], activePresetId: clone.id, selectedSlot: null });
        return clone.id;
      },

      duplicatePreset: (id) => {
        const s = get();
        const idx = s.presets.findIndex((p) => p.id === id);
        if (idx === -1) return s.activePresetId;
        const clone = structuredClone(s.presets[idx]) as Preset;
        clone.id = newId();
        clone.name = copyName(s.presets[idx].name, s.presets);
        const presets = [...s.presets.slice(0, idx + 1), clone, ...s.presets.slice(idx + 1)];
        set({ presets, activePresetId: clone.id, selectedSlot: null });
        return clone.id;
      },

      renamePreset: (id, name) =>
        set((s) => ({
          presets: s.presets.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)),
        })),

      // não deixa a biblioteca ficar vazia (o app precisa de um preset ativo).
      deletePreset: (id) =>
        set((s) => {
          if (s.presets.length <= 1) return s;
          const presets = s.presets.filter((p) => p.id !== id);
          const activePresetId = s.activePresetId === id ? presets[0].id : s.activePresetId;
          return { presets, activePresetId, selectedSlot: s.activePresetId === id ? null : s.selectedSlot };
        }),

      // ── Hardware ────────────────────────────────────────────────────────────
      // Conecta (WebHID real ou mock), lê o estado do pad como baseline/backup.
      // Deve ser chamado de um gesto do usuário (WebHID exige clique).
      connect: async (kind) => {
        if (get().connection === "connecting") return;
        set({ connection: "connecting", connError: null });
        try {
          const inner: Transport = kind === "mock" ? new MockTransport(seed) : new WebHIDTransport();
          const guarded = new GuardedTransport(inner, { isWriteEnabled: () => writeArmed });
          await guarded.connect();
          transport = guarded;
          via = new ViaClient(guarded);
          const padBaseline = await readSnapshot(via, CREATOR_MICRO); // §8.2: backup de sessão
          set({ connection: "connected", deviceName: inner.name, padBaseline });
        } catch (e) {
          transport = null;
          via = null;
          set({
            connection: "disconnected",
            connError: e instanceof Error ? e.message : String(e),
          });
        }
      },

      disconnect: async () => {
        try {
          await transport?.disconnect();
        } catch {
          /* ignora erro ao desconectar */
        }
        transport = null;
        via = null;
        set({ connection: "disconnected", deviceName: null, padBaseline: null, selectedSlot: null });
      },

      // Envia o preset ativo pro pad. Arma a escrita só durante esta operação,
      // valida (dentro de uploadPreset) e relê o estado como novo baseline.
      uploadToPad: async () => {
        const s = get();
        if (!via || s.connection !== "connected" || s.uploading) return;
        const preset = selectActivePreset(s);
        set({ uploading: true, connError: null });
        writeArmed = true;
        try {
          await uploadPreset(via, preset, CREATOR_MICRO);
          const padBaseline = await readSnapshot(via, CREATOR_MICRO);
          set({ padBaseline });
        } catch (e) {
          set({ connError: e instanceof Error ? e.message : String(e) });
        } finally {
          writeArmed = false;
          set({ uploading: false });
        }
      },
    }),
    {
      name: "keymap-store",
      version: 3,
      // v1 chamava os modos de "2d"/"3d" e queriam dizer outra coisa: quem
      // escolheu "2d" lá não estava recusando o modo cinematográfico, que nem
      // existia. Então todo mundo que vem da v1 entra no cine e troca no toggle
      // se quiser. (Depois disso, a escolha do usuário é respeitada.)
      migrate: (persisted, from) => {
        const s = persisted as { padView?: string };
        return from < 3 ? { ...s, padView: "cinematic" } : s;
      },
      storage: createJSONStorage(() => localStorage),
      // biblioteca + preferência de render do pad; estado efêmero de UI não.
      partialize: (s) => ({ presets: s.presets, activePresetId: s.activePresetId, padView: s.padView }),
      merge: (persisted, current) => {
        const s = { ...current, ...(persisted as object) } as AppState;
        if (s.padView !== "fast" && s.padView !== "cinematic") s.padView = "fast";
        return s;
      },
    },
  ),
);

/** Helper: o preset ativo dado o estado atual. */
export function selectActivePreset(s: {
  presets: Preset[];
  activePresetId: string;
}): Preset {
  return s.presets.find((p) => p.id === s.activePresetId) ?? s.presets[0];
}

/**
 * Há algo a enviar? true só se conectado E o preset ativo difere do que está no
 * pad (baseline). É o que habilita o botão "fazer upload" (ponto 04).
 */
export function selectDirty(s: AppState): boolean {
  if (s.connection !== "connected" || !s.padBaseline) return false;
  return !presetMatchesSnapshot(selectActivePreset(s), s.padBaseline);
}
