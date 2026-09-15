import { useApp, type PadView, type TransportKind } from "../store/app.ts";
import { KeyboardRender } from "./KeyboardRender.tsx";
import { Keyboard3D } from "./keyboard3d/Keyboard3D.tsx";
import { RightPanel } from "./RightPanel.tsx";
import { Header } from "./Header.tsx";
import { Footer } from "./Footer.tsx";

/**
 * Layout (nodes 56:3284 sem device → 56:2700 conectado): coluna do teclado
 * (header + pad + footer) à esquerda e o drawer como coluna própria de altura
 * cheia à direita. Header e footer ficam CONTIDOS na coluna do teclado — quando
 * o drawer abre, encolhem com ela em vez de passar por baixo. O pad "acende"
 * (fantasma → vivo) numa transição suave ao conectar.
 */
export function AppShell({ onOpenDiscovery }: { onOpenDiscovery: () => void }) {
  const { panelCollapsed, connection, connect, connError, padView, setPadView } = useApp();
  const connected = connection === "connected";
  const connecting = connection === "connecting";
  const drawerOpen = connected && !panelCollapsed;

  return (
    <div className="relative flex h-screen overflow-hidden bg-white text-slate-800">
      {/* coluna do teclado: header + pad + footer, contidos aqui */}
      <section className="flex min-w-0 flex-1 flex-col">
        <Header />

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-8">
          {padView === "3d" ? (
            // 3D ocupa a área toda: a câmera é que enquadra (hero → edição → close)
            <div className="absolute inset-0">
              <Keyboard3D
                interactive={connected}
                fallback={<PadSvg connected={connected} />}
              />
            </div>
          ) : (
            <PadSvg connected={connected} />
          )}

          <PadViewToggle value={padView} onChange={setPadView} />

          {/* controles de conexão: some com fade+slide quando conecta */}
          <div
            className="absolute bottom-[7%] flex flex-col items-center"
            style={{
              left: "50%",
              transform: `translateX(-50%) translateY(${connected ? "10px" : "0"})`,
              opacity: connected ? 0 : 1,
              pointerEvents: connected ? "none" : "auto",
              transition: "opacity 400ms ease, transform 400ms ease",
            }}
          >
            <ConnectControls connecting={connecting} onConnect={connect} error={connError} />
          </div>
        </div>

        <Footer />
      </section>

      {/* drawer: coluna própria de altura cheia à direita */}
      {drawerOpen && (
        <aside className="w-[668px] shrink-0 border-l border-slate-100 bg-[var(--color-surface)]">
          <RightPanel />
        </aside>
      )}

      <button
        onClick={onOpenDiscovery}
        className="absolute bottom-2 left-4 text-[11px] text-slate-300 transition hover:text-slate-500"
      >
        Fase 0 · Discovery
      </button>
    </div>
  );
}

/** Pad em SVG (v1): o pad "acende" (cor final) e desce até a posição de ativo ao conectar. */
function PadSvg({ connected }: { connected: boolean }) {
  return (
    <div
      className="w-auto"
      style={{
        aspectRatio: "409 / 469",
        height: "min(66vh, 540px)",
        transform: connected ? "translateY(0) scale(1)" : "translateY(-26px) scale(0.985)",
        filter: connected ? "none" : "grayscale(0.9) brightness(1.15) opacity(0.5)",
        transition: "transform 700ms cubic-bezier(0.22,0.8,0.24,1), filter 700ms ease-out",
        willChange: "transform, filter",
      }}
    >
      <KeyboardRender interactive={connected} />
    </div>
  );
}

/** Alterna SVG ↔ 3D pra comparar as duas versões (preferência persistida). */
function PadViewToggle({ value, onChange }: { value: PadView; onChange: (v: PadView) => void }) {
  return (
    <div className="absolute right-8 top-2 z-10 inline-flex rounded-full bg-slate-100 p-0.5 text-xs">
      {(["2d", "3d"] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1 font-semibold uppercase transition ${
            value === v ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {v}
        </button>
      ))}
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
      <button
        disabled={connecting}
        onClick={() => onConnect("webhid")}
        className="rounded-[var(--radius-pill)] bg-slate-900 px-8 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-700 disabled:opacity-60"
      >
        {connecting ? "Conectando…" : "Conectar device"}
      </button>
      <button
        disabled={connecting}
        onClick={() => onConnect("mock")}
        className="text-xs text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline disabled:opacity-60"
      >
        ou simular (mock)
      </button>
      {error && <p className="max-w-xs text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}
