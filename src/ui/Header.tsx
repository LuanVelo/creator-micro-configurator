import { useApp, type SidePanelTab } from "../store/app.ts";

/**
 * Header (component "header" do Figma, node 56:3287): logo à esquerda; à direita
 * a nav Presets/Actions + a seta de controle do drawer. As abas abrem o drawer
 * na aba escolhida; a seta abre/fecha. Tudo desabilitado enquanto não há device.
 */
export function Header() {
  const { connection, panelTab, panelCollapsed, selectedSlot, showPanelTab, toggleCollapsed } =
    useApp();
  const connected = connection === "connected";
  const drawerOpen = connected && !panelCollapsed;
  const tabsActive = drawerOpen && selectedSlot === null;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between px-8">
      <span className="text-2xl font-extrabold lowercase tracking-tight text-[var(--color-accent)]">
        keymap
      </span>

      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-full bg-[var(--color-chip)] p-0.5 text-sm">
          <Tab tab="presets" active={tabsActive && panelTab === "presets"} disabled={!connected}
            onClick={() => (tabsActive && panelTab === "presets" ? toggleCollapsed() : showPanelTab("presets"))}>
            Presets
          </Tab>
          <Tab tab="actions" active={tabsActive && panelTab === "actions"} disabled={!connected}
            onClick={() => (tabsActive && panelTab === "actions" ? toggleCollapsed() : showPanelTab("actions"))}>
            Actions
          </Tab>
        </div>

        <button
          onClick={toggleCollapsed}
          disabled={!connected}
          title={panelCollapsed ? "Abrir painel" : "Recolher painel"}
          className={`grid h-7 w-7 place-items-center rounded-full shadow-sm transition disabled:opacity-30 ${
            drawerOpen ? "bg-[var(--color-btn)] text-[var(--color-btn-ink)] hover:bg-[var(--color-btn-hover)]" : "bg-[var(--color-chip)] text-[var(--color-ink-soft)] hover:bg-[var(--color-chip-hover)]"
          }`}
        >
          <span className={`text-sm transition-transform ${drawerOpen ? "rotate-180" : ""}`}>›</span>
        </button>
      </div>
    </header>
  );
}

function Tab({
  active,
  disabled,
  onClick,
  children,
}: {
  tab: SidePanelTab;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-5 py-1 font-medium transition disabled:opacity-40 ${
        active ? "bg-[var(--color-btn)] text-[var(--color-btn-ink)] shadow-sm" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
      }`}
    >
      {children}
    </button>
  );
}
