import { useMemo, useState } from "react";
import { ACTION_CATALOG, findAppForKeycode, type ActionDef } from "../model/actions.ts";
import { AppIcon } from "./AppIcon.tsx";

/**
 * Seletor de ação: primeiro o app (ícones), depois os atalhos daquele app numa
 * lista rolável. Chama onSelect com o keycode. A rolagem fica só na lista.
 */
export function ActionPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (keycode: string) => void;
}) {
  const [appName, setAppName] = useState(() => findAppForKeycode(value)?.app ?? ACTION_CATALOG[0].app);
  const [query, setQuery] = useState("");

  const group = ACTION_CATALOG.find((g) => g.app === appName) ?? ACTION_CATALOG[0];
  const actions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return group.actions;
    return group.actions.filter((a) => `${a.label} ${a.hint ?? ""}`.toLowerCase().includes(q));
  }, [group, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* seletor de app */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {ACTION_CATALOG.map((g) => {
          const active = g.app === appName;
          return (
            <button
              key={g.app}
              onClick={() => {
                setAppName(g.app);
                setQuery("");
              }}
              title={g.app}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-xl p-1.5 transition ${
                active ? "bg-slate-100 ring-2 ring-[var(--color-accent)]" : "hover:bg-slate-50"
              }`}
            >
              <AppIcon icon={g.icon} size={38} />
              <span className="max-w-[54px] truncate text-[10px] text-slate-500">{g.app}</span>
            </button>
          );
        })}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Buscar em ${group.app}…`}
        className="mb-2 w-full shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        spellCheck={false}
      />

      {/* lista rolável de atalhos */}
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {actions.map((a) => (
          <ActionRow key={a.id} action={a} selected={a.keycode === value} onClick={() => onSelect(a.keycode)} />
        ))}
        {actions.length === 0 && (
          <p className="px-1 py-2 text-sm text-slate-400">Nada encontrado em {group.app}.</p>
        )}
      </div>
    </div>
  );
}

function ActionRow({
  action,
  selected,
  onClick,
}: {
  action: ActionDef;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
        selected
          ? "border-[var(--color-accent)] bg-emerald-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span className="text-slate-700">{action.label}</span>
      {action.hint && (
        <span className="ml-2 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
          {action.hint}
        </span>
      )}
    </button>
  );
}
