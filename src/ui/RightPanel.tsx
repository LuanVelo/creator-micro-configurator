import { useState } from "react";
import { useApp, selectActivePreset, type SidePanelTab } from "../store/app.ts";
import { KeyEditor } from "./KeyEditor.tsx";
import { FigmaLogo } from "./FigmaLogo.tsx";
import type { Preset } from "../model/types.ts";

/**
 * Drawer direito (Figma V 2.0, node 75:918). Altura fixa (= altura da tela); só
 * o conteúdo interno rola. No topo, onde antes ficava a keycap 3D: fechar +
 * seletor Presets/Actions. Presets com tecla selecionada = editor da tecla;
 * sem tecla = biblioteca de presets (localStorage). Actions = macros.
 */
export function RightPanel() {
  const { panelTab, selectedSlot } = useApp();

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-8">
      <DrawerNav />
      <div className="flex min-h-0 flex-1 flex-col">
        {panelTab === "actions" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ActionsList />
          </div>
        ) : selectedSlot !== null ? (
          <KeyEditor />
        ) : (
          <PresetList />
        )}
      </div>
    </div>
  );
}

/** node 75:1049: "drawer control" (fechar) + "Component 1" (seletor). */
function DrawerNav() {
  const { panelTab, setPanelTab, closeDrawer } = useApp();
  const tabs: { id: SidePanelTab; label: string }[] = [
    { id: "presets", label: "Presets" },
    { id: "actions", label: "Actions" },
  ];

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        onClick={closeDrawer}
        title="Fechar painel"
        aria-label="Fechar painel"
        className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-btn)] text-[var(--color-btn-ink)] transition hover:scale-110"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div role="tablist" className="relative flex flex-1 rounded-[40px] bg-[var(--color-chip)]">
        {/* pílula ativa desliza entre as abas */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1/2 rounded-[40px] bg-[var(--color-btn)] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${panelTab === "actions" ? "100%" : "0"})` }}
        />
        {tabs.map((t) => {
          const active = panelTab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setPanelTab(t.id)}
              className={`relative flex-1 px-3 py-1.5 text-xs transition-colors duration-300 ${
                active ? "text-[var(--color-btn-ink)]" : "text-[var(--color-chip-ink)] hover:text-[var(--color-ink-soft)]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PresetList() {
  const {
    presets,
    activePresetId,
    setActivePresetId,
    createPresetFromCurrent,
    duplicatePreset,
    renamePreset,
    deletePreset,
  } = useApp();
  const [renamingId, setRenamingId] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto">
        {presets.map((p) => (
          <PresetRow
            key={p.id}
            preset={p}
            active={p.id === activePresetId}
            renaming={renamingId === p.id}
            canDelete={presets.length > 1}
            onSelect={() => setActivePresetId(p.id)}
            onStartRename={() => setRenamingId(p.id)}
            onCommitRename={(name) => {
              renamePreset(p.id, name);
              setRenamingId(null);
            }}
            onCancelRename={() => setRenamingId(null)}
            onDuplicate={() => setRenamingId(duplicatePreset(p.id))}
            onDelete={() => deletePreset(p.id)}
          />
        ))}
      </ul>

      <div className="flex shrink-0 justify-center pt-4">
        <button
          onClick={() => setRenamingId(createPresetFromCurrent())}
          title="Novo preset (cópia do estado atual)"
          className="grid h-8 w-8 place-items-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-card)] text-lg leading-none text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)]"
        >
          +
        </button>
      </div>
    </div>
  );
}

function PresetRow({
  preset,
  active,
  renaming,
  canDelete,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDuplicate,
  onDelete,
}: {
  preset: Preset;
  active: boolean;
  renaming: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group relative">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`flex items-center gap-3 rounded-[var(--radius-card)] border bg-[var(--color-card)] px-6 py-4 text-left transition ${
          active ? "border-[var(--color-btn)]" : "border-transparent hover:border-[var(--color-line-strong)]"
        }`}
      >
        <FigmaLogo className="h-5 w-auto shrink-0" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-xs text-[var(--color-ink-soft)]">Preset custom</span>
          {renaming ? (
            <RenameInput initial={preset.name} onCommit={onCommitRename} onCancel={onCancelRename} />
          ) : (
            <span className="block truncate text-base text-[var(--color-ink)]">{preset.name}</span>
          )}
        </span>

        {!renaming && (
          <span className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex">
            <IconBtn title="Renomear" onClick={onStartRename}>
              <PencilIcon />
            </IconBtn>
            <IconBtn title="Duplicar" onClick={onDuplicate}>
              <CopyIcon />
            </IconBtn>
            <IconBtn
              title={canDelete ? "Excluir" : "Não é possível excluir o último preset"}
              disabled={!canDelete}
              danger
              onClick={onDelete}
            >
              <TrashIcon />
            </IconBtn>
          </span>
        )}
      </div>
    </li>
  );
}

function RenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <input
      autoFocus
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onCommit(value);
        if (e.key === "Escape") onCancel();
      }}
      onBlur={() => onCommit(value)}
      className="mt-0.5 block w-full rounded border border-[var(--color-line-strong)] px-1.5 py-0.5 text-base text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
      spellCheck={false}
    />
  );
}

function IconBtn({
  title,
  onClick,
  disabled = false,
  danger = false,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`grid h-7 w-7 place-items-center rounded-md text-[var(--color-ink-soft)] transition disabled:opacity-30 ${
        danger ? "hover:bg-red-500/10 hover:text-red-500" : "hover:bg-[var(--color-chip)] hover:text-[var(--color-ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActionsList() {
  const preset = useApp(selectActivePreset);
  const macros = preset.macros.filter((m) => m.actions.trim() !== "");
  return (
    <ul className="space-y-2.5">
      {macros.map((m) => (
        <li key={m.index} className="rounded-[var(--radius-card)] bg-[var(--color-card)] px-6 py-4">
          <span className="mr-2 rounded bg-[var(--color-chip)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-ink-soft)]">
            M{m.index}
          </span>
          <span className="font-mono text-xs text-[var(--color-ink)]">{m.actions}</span>
        </li>
      ))}
      {macros.length === 0 && <li className="px-2 text-sm text-[var(--color-ink-soft)]">Nenhuma macro definida.</li>}
    </ul>
  );
}
