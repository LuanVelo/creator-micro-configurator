import { useState } from "react";
import { useApp, selectActivePreset } from "../store/app.ts";
import { SLOT_LAYOUT, ENCODER_OF_SLOT } from "../model/layout.ts";
import { isValidKeycode } from "../model/keycodes.ts";
import { keyLabel } from "./labels.ts";
import { ActionPicker } from "./ActionPicker.tsx";

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
  const { activeLayer, setKeycode, setEncoder } = useApp();
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
    // fechar e abas ficam no DrawerNav (RightPanel), no topo do drawer.
    // Remonta a cada tecla (key no pai), então a entrada anima a cada troca.
    <div className="flex h-full min-h-0 flex-col animate-[panel-in_280ms_cubic-bezier(0.22,0.8,0.24,1)]">
      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        {/* Código da tecla (node 75:929) */}
        <section className="shrink-0 rounded-[var(--radius-card)] bg-[var(--color-card)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-[316px] shrink-0">
              <h3 className="text-base text-[var(--color-ink)]">
                {isEncoder ? slot.label : "Código da tecla"}
              </h3>
              <p className="text-xs text-[var(--color-ink-soft)]">Formato VIA</p>
            </div>
            <CodePill value={draft} onChange={setDraft} />
          </div>

          {isEncoder && (
            <div className="mt-3 inline-flex rounded-[40px] bg-[var(--color-chip)] p-0.5 text-xs">
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

      {/* Salvar explícito — ocupa o espaço reservado no fim do drawer (node 75:1001) */}
      <div className="flex h-[54px] shrink-0 items-end justify-center gap-3">
        {dirty && allValid && <span className="text-xs text-[var(--color-ink-soft)]">alterações não salvas</span>}
        <button
          onClick={save}
          disabled={!dirty || !allValid}
          className="rounded-[var(--radius-pill)] bg-[var(--color-btn)] px-10 py-2 text-sm text-[var(--color-btn-ink)] shadow-sm transition enabled:hover:bg-[var(--color-btn-hover)] disabled:cursor-not-allowed disabled:opacity-40"
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
        active ? "rounded-[40px] bg-[var(--color-btn)] text-[var(--color-btn-ink)]" : "rounded-[40px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
      }`}
    >
      {children}
      {dirty && <span className="ml-1 text-[var(--color-key-selected)]">•</span>}
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
        className={`h-[33px] min-w-0 flex-1 rounded-[35px] border bg-[var(--color-card)] px-[26px] font-mono text-sm text-[var(--color-ink)] outline-none ${
          valid ? "border-[var(--color-ink)]" : "border-red-400 bg-red-500/10"
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
      className="flex h-[33px] min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap rounded-[35px] border border-[var(--color-line-strong)] bg-[var(--color-card)] px-[26px] text-base transition hover:border-[var(--color-ink-soft)]"
    >
      <span className="text-[var(--color-ink)]">{label}</span>
      <span className="truncate text-[#b4b4b4]">({value})</span>
    </button>
  );
}
