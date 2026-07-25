import { useApp } from "../store/app.ts";
import { KeyboardRender } from "./KeyboardRender.tsx";
import { LayerSelector } from "./LayerSelector.tsx";
import { RightPanel } from "./RightPanel.tsx";

/**
 * Layout web (Figma node 48:193) travado na altura da tela: sem scroll na página
 * nem na coluna esquerda; o teclado fica centralizado na altura. Só a lista da
 * coluna direita rola, dentro do próprio frame.
 */
export function AppShell({ onOpenDiscovery }: { onOpenDiscovery: () => void }) {
  const { panelCollapsed, toggleCollapsed } = useApp();

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-800">
      {/* Coluna esquerda — produto (sem scroll, teclado centralizado) */}
      <section className="relative flex min-w-0 flex-[767] flex-col">
        <header className="flex shrink-0 items-center justify-between px-8 py-4">
          <span className="text-2xl font-extrabold lowercase tracking-tight text-[var(--color-accent)]">
            keymap
          </span>
          <button
            onClick={toggleCollapsed}
            title={panelCollapsed ? "Abrir painel" : "Recolher painel"}
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white shadow-md transition hover:bg-slate-700"
          >
            {panelCollapsed ? "‹" : "›"}
          </button>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center px-8 py-2">
          <div
            className="h-full max-h-[620px] w-auto"
            style={{ aspectRatio: "409 / 469" }}
          >
            <KeyboardRender />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-center pb-8">
          <LayerSelector />
        </div>

        <button
          onClick={onOpenDiscovery}
          className="absolute bottom-3 left-6 text-[11px] text-slate-300 transition hover:text-slate-500"
        >
          Fase 0 · Discovery
        </button>
      </section>

      {/* Drawer direito — interações */}
      {!panelCollapsed && (
        <aside className="flex min-w-0 flex-[668] flex-col border-l border-slate-100 bg-[#fafafa]">
          <RightPanel />
        </aside>
      )}
    </div>
  );
}
