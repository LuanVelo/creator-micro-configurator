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
    <div className="flex min-h-0 flex-1 flex-col rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)]">
      {/* header: título + subtítulo à esquerda, ícones de app à direita */}
      <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">Preset de apps</h3>
          <p className="text-xs text-[var(--color-ink-soft)]">Selecione um app para ver os atalhos</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
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
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--color-btn)] px-2 py-1 text-[11px] font-medium text-[var(--color-btn-ink)] opacity-0 shadow-md transition group-hover:opacity-100">
                  {g.app}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* busca */}
      <div className="shrink-0 px-5">
        <div className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2">
          <SearchGlyph />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar atalho"
            className="w-full bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-soft)]"
            spellCheck={false}
          />
        </div>
      </div>

      {/* lista rolável de atalhos */}
      <div className="mt-1 min-h-0 flex-1 overflow-y-auto px-5 pb-3">
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
      className={`flex w-full items-center justify-between gap-3 border-b border-[var(--color-line)] px-2 py-2.5 text-left text-sm transition last:border-b-0 ${
        selected
          ? "rounded-lg bg-[var(--color-accent)]/12 text-[var(--color-ink)]"
          : "text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
      }`}
    >
      <span className="truncate">{action.label}</span>
      {action.hint && (
        <span className="shrink-0 font-mono text-xs text-[var(--color-ink-soft)]">{action.hint}</span>
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
