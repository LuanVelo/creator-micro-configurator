import { useMemo, useState } from "react";
import { ACTION_CATALOG, findAppForKeycode, type ActionDef } from "../model/actions.ts";
import { AppIcon } from "./AppIcon.tsx";

/**
 * Card "Preset de apps" (node 50:353/659). Escolhe o software pelos ícones no
 * canto do header; abaixo, busca (filtra dentro do app) e lista plana de atalhos
 * mapeados. Clicar numa linha = selecionar → onSelect(keycode). Só a lista rola.
 */
export function ActionPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (keycode: string) => void;
}) {
  const [appName, setAppName] = useState(
    () => findAppForKeycode(value)?.app ?? ACTION_CATALOG[0].app,
  );
  const [query, setQuery] = useState("");

  const group = ACTION_CATALOG.find((g) => g.app === appName) ?? ACTION_CATALOG[0];
  const actions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return group.actions;
    return group.actions.filter((a) => `${a.label} ${a.hint ?? ""}`.toLowerCase().includes(q));
  }, [group, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-[var(--radius-card)] bg-[var(--color-card)]">
      {/* header: título + subtítulo à esquerda, ícones de app à direita */}
      <div className="flex h-[69px] shrink-0 items-center justify-between gap-2.5 px-6">
        <div className="min-w-0">
          <h3 className="text-base text-[var(--color-ink)]">Preset de apps</h3>
          <p className="text-xs text-[var(--color-ink-soft)]">Selecione um app para ver os atalhos</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {ACTION_CATALOG.map((g) => {
            const active = g.app === appName;
            return (
              <div key={g.app} className="group relative">
                <button
                  onClick={() => {
                    setAppName(g.app);
                    setQuery("");
                  }}
                  aria-label={g.app}
                  className="block rounded-[8px]"
                >
                  <AppIcon icon={g.icon} size={29} selected={active} dimmed={!active} />
                </button>
                {/* tooltip: nome do app no hover */}
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--color-btn)] px-2 py-1 text-[11px] text-[var(--color-btn-ink)] opacity-0 shadow-md transition group-hover:opacity-100">
                  {g.app}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* busca */}
      <div className="shrink-0 px-6">
        <div className="flex items-center gap-2 rounded-[50px] border border-[var(--color-field-line)] bg-[var(--color-field)] py-[7px] pl-4 pr-[27px]">
          <SearchGlyph />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar atalho"
            className="w-full bg-transparent text-xs text-[var(--color-ink)] outline-none placeholder:text-[var(--color-row-ink)]"
            spellCheck={false}
          />
        </div>
      </div>

      {/* lista rolável de atalhos */}
      <div className="mt-2.5 min-h-0 flex-1 overflow-y-auto px-6 pb-5">
        {actions.map((a) => (
          <ActionRow key={a.id} action={a} selected={a.keycode === value} onClick={() => onSelect(a.keycode)} />
        ))}
        {actions.length === 0 && (
          <p className="px-1 py-3 text-sm text-[var(--color-ink-soft)]">Nada encontrado em {group.app}.</p>
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
      aria-pressed={selected}
      className={`flex w-full items-center justify-between gap-2.5 border-b border-[var(--color-line)] py-2 text-left text-xs transition ${
        selected ? "text-[var(--color-ink)]" : "text-[var(--color-row-ink)] hover:text-[var(--color-ink)]"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2 truncate">
        {selected && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-key-selected)]" />}
        {action.label}
      </span>
      {action.hint && (
        <span className="shrink-0 text-[var(--color-ink-faint)]">{action.hint}</span>
      )}
    </button>
  );
}

function SearchGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--color-ink-soft)]" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
