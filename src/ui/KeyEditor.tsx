import { useState } from "react";
import { useApp, selectActivePreset } from "../store/app.ts";
import { SLOT_LAYOUT, ENCODER_OF_SLOT } from "../model/layout.ts";
import { isValidKeycode } from "../model/keycodes.ts";
import { keyLabel } from "./labels.ts";
import { ActionPicker } from "./ActionPicker.tsx";

export function KeyEditor() {
  const selectedSlot = useApp((s) => s.selectedSlot);
  if (selectedSlot === null) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-sm text-slate-400">
        Clique numa tecla do teclado para escolher o que ela faz.
      </div>
    );
  }
  return <SlotEditor key={selectedSlot} slotIndex={selectedSlot} />;
}

type Target = "click" | "ccw" | "cw";

function SlotEditor({ slotIndex }: { slotIndex: number }) {
  const { activeLayer, selectSlot, setKeycode, setEncoder } = useApp();
  const preset = useApp(selectActivePreset);
  const [target, setTarget] = useState<Target>("click");

  const slot = SLOT_LAYOUT[slotIndex];
  const layer = preset.layers[activeLayer];
  const encoderIndex = ENCODER_OF_SLOT[slotIndex];
  const isEncoder = encoderIndex !== undefined;

  const currentValue =
    !isEncoder || target === "click"
      ? (layer.keys[slotIndex] ?? "KC_NO")
      : (layer.encoders[encoderIndex]?.[target] ?? "KC_NO");

  const commit = (kc: string) => {
    if (!isEncoder || target === "click") setKeycode(slotIndex, kc);
    else setEncoder(encoderIndex, target, kc);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex shrink-0 items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-700">{slot.label}</h3>
          <p className="text-xs text-slate-400">
            slot {slot.index} · row {slot.row}, col {slot.col}
          </p>
        </div>
        <button
          onClick={() => selectSlot(null)}
          className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕ fechar
        </button>
      </div>

      {isEncoder && (
        <div className="inline-flex shrink-0 rounded-lg bg-slate-100 p-0.5 text-xs">
          <TargetTab tab="click" target={target} setTarget={setTarget}>
            Click
          </TargetTab>
          <TargetTab tab="ccw" target={target} setTarget={setTarget}>
            ↺ Anti-horário
          </TargetTab>
          <TargetTab tab="cw" target={target} setTarget={setTarget}>
            ↻ Horário
          </TargetTab>
        </div>
      )}

      {/* atual + digitar direto */}
      <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-2 text-sm">
          <span className="text-slate-400">Atual:</span>
          <span className="text-xl">{keyLabel(currentValue) || "—"}</span>
          <span className="ml-auto font-mono text-xs text-slate-400">{currentValue}</span>
        </div>
        <label className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-slate-400">ou digite:</span>
          <RawInput value={currentValue} onCommit={commit} />
        </label>
      </div>

      {/* seletor por app (lista rola aqui dentro) */}
      <ActionPicker value={currentValue} onSelect={commit} />
    </div>
  );
}

function TargetTab({
  tab,
  target,
  setTarget,
  children,
}: {
  tab: Target;
  target: Target;
  setTarget: (t: Target) => void;
  children: string;
}) {
  const active = tab === target;
  return (
    <button
      onClick={() => setTarget(tab)}
      className={`rounded-md px-2.5 py-1 font-medium transition ${
        active ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}

/** Campo cru de keycode com validação viva (§8, regra 3). Comita só se válido. */
function RawInput({ value, onCommit }: { value: string; onCommit: (kc: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const shown = focused ? draft : value;
  const valid = isValidKeycode(shown.trim());
  return (
    <input
      value={shown}
      onFocus={() => {
        setFocused(true);
        setDraft(value);
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setDraft(e.target.value);
        if (isValidKeycode(e.target.value.trim())) onCommit(e.target.value.trim());
      }}
      className={`w-full rounded-md border px-2 py-1 font-mono text-sm outline-none ${
        valid ? "border-slate-300 focus:border-[var(--color-accent)]" : "border-red-400 bg-red-50"
      }`}
      spellCheck={false}
    />
  );
}
