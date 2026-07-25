/**
 * Estado da UI do configurador (Fase 1, em memória). Semeado com o backup do
 * VIA importado. Ainda não escreve no hardware — só edita o modelo; o upload
 * (0x05/0x13/0x15) entra numa tarefa seguinte, atrás do modo escrita.
 */
import { create } from "zustand";
import { importViaJson } from "../model/serialize.ts";
import backupJson from "../../backup_VIA/creator_micro.layout.json";
import type { Preset } from "../model/types.ts";

const seed = importViaJson(backupJson, { id: "figma-design", name: "Figma Design" });

export type SidePanelTab = "presets" | "actions";

interface AppState {
  presets: Preset[];
  activePresetId: string;
  activeLayer: number;
  selectedSlot: number | null;
  panelTab: SidePanelTab;
  panelCollapsed: boolean;

  setActiveLayer: (n: number) => void;
  selectSlot: (n: number | null) => void;
  setActivePresetId: (id: string) => void;
  setPanelTab: (tab: SidePanelTab) => void;
  toggleCollapsed: () => void;
  setKeycode: (slotIndex: number, keycode: string) => void;
  setEncoder: (encoderIndex: number, dir: "ccw" | "cw", keycode: string) => void;
}

function updateActivePreset(state: AppState, fn: (p: Preset) => Preset): Partial<AppState> {
  return {
    presets: state.presets.map((p) => (p.id === state.activePresetId ? fn(p) : p)),
  };
}

export const useApp = create<AppState>((set) => ({
  presets: [seed],
  activePresetId: seed.id,
  activeLayer: 0,
  selectedSlot: null,
  panelTab: "presets",
  panelCollapsed: false,

  setActiveLayer: (n) => set({ activeLayer: n, selectedSlot: null }),
  selectSlot: (n) => set({ selectedSlot: n }),
  setActivePresetId: (id) => set({ activePresetId: id, selectedSlot: null }),
  setPanelTab: (tab) => set({ panelTab: tab }),
  toggleCollapsed: () => set((s) => ({ panelCollapsed: !s.panelCollapsed })),

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
}));

/** Helper: o preset ativo dado o estado atual. */
export function selectActivePreset(s: {
  presets: Preset[];
  activePresetId: string;
}): Preset {
  return s.presets.find((p) => p.id === s.activePresetId) ?? s.presets[0];
}
