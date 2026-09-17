import { useApp, type PadView, type TransportKind } from "../store/app.ts";
import { KeyboardRender } from "./KeyboardRender.tsx";
import { CinematicPad } from "./cinematic/CinematicPad.tsx";
import { CHROME_H, DRAWER_EASE, DRAWER_MS, DRAWER_W } from "./cinematic/stage.ts";
import { RightPanel } from "./RightPanel.tsx";
import { Header } from "./Header.tsx";
import { Footer } from "./Footer.tsx";

/**
 * Layout V 2.0 (Figma nodes 75:334 → 75:1234): o pad ocupa a tela inteira e
 * header/footer flutuam por cima. O drawer é uma camada de altura cheia que
 * entra da direita para a esquerda, por cima de tudo (inclusive do footer).
 *
 * Não há botão para abrir o drawer: clicar numa tecla abre. Fechar e trocar
 * de aba ficam no topo do próprio drawer.
 */
export function AppShell({ onOpenDiscovery }: { onOpenDiscovery: () => void }) {
  const { panelCollapsed, connection, connect, connError, padView, setPadView } = useApp();
  const connected = connection === "connected";
  const connecting = connection === "connecting";
  const drawerOpen = connected && !panelCollapsed;

  return (
    <div className="relative h-full overflow-hidden bg-[var(--color-bg)] text-[var(--color-ink)]">
      {/* palco: tela inteira */}
      {padView === "cinematic" ? (
        <div className="absolute inset-0">
          <CinematicPad interactive={connected} fallback={<PadSvg connected={connected} drawerOpen={drawerOpen} />} />
        </div>
      ) : (
        <PadSvg connected={connected} drawerOpen={drawerOpen} />
      )}

      <Header>
        <DevLinks padView={padView} onPadView={setPadView} onOpenDiscovery={onOpenDiscovery} />
      </Header>

      {/* conectar: some com fade+slide quando conecta */}
      <div
        className="absolute left-1/2 flex flex-col items-center"
        style={{
          top: 778,
          transform: `translateX(-50%) translateY(${connected ? "10px" : "0"})`,
          opacity: connected ? 0 : 1,
          pointerEvents: connected ? "none" : "auto",
          transition: "opacity 400ms ease, transform 400ms ease",
        }}
      >
        <ConnectControls connecting={connecting} onConnect={connect} error={connError} />
      </div>

      <Footer visible={connected} />

      <Drawer open={drawerOpen} />
    </div>
  );
}

/**
 * Fica montado mesmo fechado para a saída também ser animada. Fechado, sai da
 * árvore de foco/leitura (`inert`) — senão Tab cairia em botões invisíveis.
 */
function Drawer({ open }: { open: boolean }) {
  return (
    <aside
      inert={!open}
      aria-hidden={!open}
      className="theme-drawer absolute right-0 top-0 z-30 h-full border-l border-[var(--color-drawer-edge)] text-[var(--color-ink)]"
      style={{
        width: DRAWER_W,
        background: "linear-gradient(to top, var(--color-surface-end), var(--color-surface))",
        transform: `translateX(${open ? "0" : "100%"})`,
        boxShadow: open ? "-24px 0 60px rgba(0,0,0,.35)" : "none",
        transition: `transform ${DRAWER_MS}ms ${DRAWER_EASE}, box-shadow ${DRAWER_MS}ms ease`,
        willChange: "transform",
      }}
    >
      <RightPanel />
    </aside>
  );
}

/**
 * Pad em SVG (modo fast): "acende" ao conectar e anda para a esquerda quando o
 * drawer abre, no mesmo tempo do drawer — nunca fica embaixo dele.
 */
function PadSvg({ connected, drawerOpen }: { connected: boolean; drawerOpen: boolean }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        paddingTop: CHROME_H,
        paddingBottom: CHROME_H,
        paddingRight: drawerOpen ? DRAWER_W : 0,
        transition: `padding ${DRAWER_MS}ms ${DRAWER_EASE}`,
      }}
    >
      <div
        className="w-auto"
        style={{
          aspectRatio: "409 / 469",
          height: 620, // px: dentro do FixedFrame, vh se refere ao viewport
          transform: connected ? "translateY(0) scale(1)" : "translateY(-26px) scale(0.985)",
          filter: connected ? "none" : "grayscale(0.9) brightness(1.15) opacity(0.5)",
          transition: "transform 700ms cubic-bezier(0.22,0.8,0.24,1), filter 700ms ease-out",
          willChange: "transform, filter",
        }}
      >
        <KeyboardRender interactive={connected} />
      </div>
    </div>
  );
}

/** Controles de desenvolvimento (não estão no Figma): discreto, no header. */
function DevLinks({
  padView,
  onPadView,
  onOpenDiscovery,
}: {
  padView: PadView;
  onPadView: (v: PadView) => void;
  onOpenDiscovery: () => void;
}) {
  return (
    <div className="flex items-center gap-3 text-[10px] text-[var(--color-ink-soft)]">
      <button onClick={onOpenDiscovery} className="transition hover:text-[var(--color-ink)]">
        Fase 0 · Discovery
      </button>
      <div className="inline-flex rounded-full bg-[var(--color-chip)] p-0.5">
        {(["fast", "cinematic"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onPadView(v)}
            className={`rounded-full px-2.5 py-0.5 uppercase transition ${
              padView === v ? "bg-[var(--color-chip-hover)] text-[var(--color-ink)]" : "hover:text-[var(--color-ink)]"
            }`}
          >
            {v === "fast" ? "fast" : "cine"}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConnectControls({
  connecting,
  onConnect,
  error,
}: {
  connecting: boolean;
  onConnect: (kind: TransportKind) => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* btn_find_device (node 75:1772) */}
      <button
        disabled={connecting}
        onClick={() => onConnect("webhid")}
        className="whitespace-nowrap rounded-[24px] bg-[var(--color-btn)] px-6 py-2 text-[18px] font-semibold text-[var(--color-btn-ink)] transition hover:bg-[var(--color-btn-hover)] disabled:opacity-60"
      >
        {connecting ? "Conectando…" : "Conectar device"}
      </button>
      <button
        disabled={connecting}
        onClick={() => onConnect("mock")}
        className="text-xs text-[var(--color-ink-soft)] underline-offset-2 transition hover:text-[var(--color-ink)] hover:underline disabled:opacity-60"
      >
        ou simular (mock)
      </button>
      {error && <p className="max-w-xs text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}
