import { useState } from "react";
import { useApp, selectActivePreset } from "../store/app.ts";
import { SLOT_LAYOUT, ENCODER_OF_SLOT } from "../model/layout.ts";
import { isValidKeycode } from "../model/keycodes.ts";
import { keyLabel } from "./labels.ts";
import { ActionPicker } from "./ActionPicker.tsx";
import { Keycap3D } from "./Keycap3D.tsx";

type Target = "click" | "ccw" | "cw";

export function KeyEditor() {
  const selectedSlot = useApp((s) => s.selectedSlot);
  if (selectedSlot === null) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-sm text-[var(--color-ink-soft)]">
        Clique numa tecla do teclado para escolher o que ela faz.
      </div>
    );
  }
  return <SlotEditor key={selectedSlot} slotIndex={selectedSlot} />;
}

function SlotEditor({ slotIndex }: { slotIndex: number }) {
  const { activeLayer, selectSlot, setKeycode, setEncoder } = useApp();
  const preset = useApp(selectActivePreset);

  const slot = SLOT_LAYOUT[slotIndex];
  const layer = preset.layers[activeLayer];
  const encoderIndex = ENCODER_OF_SLOT[slotIndex];
  const isEncoder = encoderIndex !== undefined;
  const targets: Target[] = isEncoder ? ["click", "ccw", "cw"] : ["click"];

  // valor já gravado (no preset) para cada alvo do slot
  const committed = (t: Target): string => {
    if (!isEncoder || t === "click") return layer.keys[slotIndex] ?? "KC_NO";
    return layer.encoders[encoderIndex]?.[t] ?? "KC_NO";
  };

  // rascunho: só entra no preset ao clicar Salvar (decisão A = save explícito)
  const [target, setTarget] = useState<Target>("click");
  const [drafts, setDrafts] = useState<Record<Target, string>>(() => ({
    click: committed("click"),
    ccw: committed("ccw"),
    cw: committed("cw"),
  }));

  const draft = drafts[target];
  const setDraft = (kc: string) => setDrafts((d) => ({ ...d, [target]: kc }));

  const dirtyTargets = targets.filter((t) => drafts[t] !== committed(t));
  const dirty = dirtyTargets.length > 0;
  const allValid = dirtyTargets.every((t) => isValidKeycode(drafts[t].trim()));

  const save = () => {
    if (!dirty || !allValid) return;
    for (const t of dirtyTargets) {
      const kc = drafts[t].trim();
      if (!isEncoder || t === "click") setKeycode(slotIndex, kc);
      else setEncoder(encoderIndex, t, kc);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* topo: keycap 3D + fechar */}
      <div className="relative shrink-0">
        <button
          onClick={() => selectSlot(null)}
          title="Fechar"
          className="absolute right-4 top-3 z-10 grid h-7 w-7 place-items-center rounded-full text-[var(--color-ink-soft)] transition hover:bg-[var(--color-chip)] hover:text-[var(--color-ink)]"
        >
          ✕
        </button>
        <Keycap3D className="h-[150px] w-full" />
      </div>

      {/* conteúdo rolável */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-4">
        {/* Código da tecla */}
        <section className="shrink-0 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">
                {isEncoder ? slot.label : "Código da tecla"}
              </h3>
              <p className="text-xs text-[var(--color-ink-soft)]">Formato VIA</p>
            </div>
            <CodePill value={draft} onChange={setDraft} />
          </div>

          {isEncoder && (
            <div className="mt-3 inline-flex rounded-lg bg-[var(--color-surface)] p-0.5 text-xs">
              <TargetTab tab="click" target={target} setTarget={setTarget} dirty={drafts.click !== committed("click")}>
                Click
              </TargetTab>
              <TargetTab tab="ccw" target={target} setTarget={setTarget} dirty={drafts.ccw !== committed("ccw")}>
                ↺ Anti-horário
              </TargetTab>
              <TargetTab tab="cw" target={target} setTarget={setTarget} dirty={drafts.cw !== committed("cw")}>
                ↻ Horário
              </TargetTab>
            </div>
          )}
        </section>

        {/* Preset de apps */}
        <ActionPicker value={draft} onSelect={setDraft} />
      </div>

      {/* rodapé: Salvar explícito (Frame 33) */}
      <div className="flex shrink-0 items-center justify-center gap-3 border-t border-[var(--color-line)] px-6 py-3">
        {dirty && allValid && <span className="text-xs text-[var(--color-ink-soft)]">alterações não salvas</span>}
        <button
          onClick={save}
          disabled={!dirty || !allValid}
          className="rounded-[var(--radius-pill)] bg-[var(--color-btn)] px-8 py-2 text-sm font-semibold text-[var(--color-btn-ink)] shadow-sm transition enabled:hover:bg-[var(--color-btn-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

function TargetTab({
  tab,
  target,
  setTarget,
  dirty,
  children,
}: {
  tab: Target;
  target: Target;
  setTarget: (t: Target) => void;
  dirty: boolean;
  children: string;
}) {
  const active = tab === target;
  return (
    <button
      onClick={() => setTarget(tab)}
      className={`rounded-md px-2.5 py-1 font-medium transition ${
        active ? "bg-[var(--color-card)] text-[var(--color-ink)] shadow-sm" : "text-[var(--color-ink-soft)]"
      }`}
    >
      {children}
      {dirty && <span className="ml-1 text-[var(--color-accent)]">•</span>}
    </button>
  );
}

/**
 * Pill do código atual: mostra "label (KC_...)" e vira input ao clicar. Digita o
 * keycode cru com validação viva (§8, regra 3); escreve no rascunho, não no preset.
 */
function CodePill({ value, onChange }: { value: string; onChange: (kc: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const valid = isValidKeycode((editing ? draft : value).trim());
  const label = keyLabel(value) || "—";

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (isValidKeycode(e.target.value.trim())) onChange(e.target.value.trim());
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur();
        }}
        className={`w-[150px] rounded-[var(--radius-pill)] border px-4 py-2 text-right font-mono text-sm outline-none ${
          valid ? "border-[var(--color-accent)]" : "border-red-400 bg-red-500/12"
        }`}
        spellCheck={false}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Clique para digitar o keycode"
      className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-2 transition hover:border-[var(--color-line-strong)]"
    >
      <span className="text-sm font-semibold text-[var(--color-ink)]">{label}</span>
      <span className="font-mono text-xs text-[var(--color-ink-soft)]">({value})</span>
    </button>
  );
}
