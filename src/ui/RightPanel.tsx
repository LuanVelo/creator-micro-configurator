import { useState } from "react";
import { useApp, selectActivePreset } from "../store/app.ts";
import { KeyEditor } from "./KeyEditor.tsx";
import { FigmaLogo } from "./FigmaLogo.tsx";
import type { Preset } from "../model/types.ts";

/**
 * Drawer direito. Altura fixa (= altura da tela); só o conteúdo interno rola.
 * Ao selecionar uma tecla, o editor toma o painel inteiro. Senão: abas
 * Presets/Actions. A aba Presets é a biblioteca do usuário (persistida em
 * localStorage): selecionar carrega, "+" cria cópia do estado atual, e cada
 * item pode ser renomeado/duplicado/excluído.
 */
export function RightPanel() {
  const { panelTab, selectedSlot } = useApp();

  if (selectedSlot !== null) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <KeyEditor />
      </div>
    );
  }

  // Abas ficam no header (node 56:3287); aqui só o conteúdo da aba ativa.
  return (
    <div className="flex h-full min-h-0 flex-col pt-6">
      {panelTab === "presets" ? (
        <PresetList />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3">
          <ActionsList />
        </div>
      )}
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
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-1">
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

      <div className="flex shrink-0 justify-center py-4">
        <button
          onClick={() => setRenamingId(createPresetFromCurrent())}
          title="Novo preset (cópia do estado atual)"
          className="grid h-8 w-8 place-items-center rounded-full border border-slate-300 text-lg leading-none text-slate-400 transition hover:bg-white hover:text-slate-600"
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
        className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition ${
          active ? "border-slate-300 shadow-sm" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <FigmaLogo className="h-5 w-auto shrink-0" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[11px] text-slate-400">Preset custom</span>
          {renaming ? (
            <RenameInput initial={preset.name} onCommit={onCommitRename} onCancel={onCancelRename} />
          ) : (
            <span className="block truncate text-sm font-semibold text-slate-700">{preset.name}</span>
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
      className="mt-0.5 block w-full rounded border border-slate-300 px-1.5 py-0.5 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-accent)]"
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
      className={`grid h-7 w-7 place-items-center rounded-md text-slate-400 transition disabled:opacity-30 ${
        danger ? "hover:bg-red-50 hover:text-red-500" : "hover:bg-slate-100 hover:text-slate-600"
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
    <ul className="space-y-2 py-1">
      {macros.map((m) => (
        <li key={m.index} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
            M{m.index}
          </span>
          <span className="font-mono text-xs text-slate-600">{m.actions}</span>
        </li>
      ))}
      {macros.length === 0 && <li className="px-2 text-sm text-slate-400">Nenhuma macro definida.</li>}
    </ul>
  );
}
