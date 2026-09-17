import { useApp, selectDirty } from "../store/app.ts";
import { LayerSelector } from "./LayerSelector.tsx";
import { CHROME_H } from "./cinematic/stage.ts";

/**
 * Rodapé (Figma V 2.0, node 75:884), flutuando sobre o render: status de
 * conexão (esq.), seletor de layer (centro) e o CTA "fazer upload" (dir.).
 * Sem device não existe (frame 75:334 não tem footer): entra com fade.
 */
export function Footer({ visible }: { visible: boolean }) {
  return (
    <footer
      inert={!visible}
      className="absolute inset-x-0 bottom-0 z-20 flex items-center px-6"
      style={{
        height: CHROME_H,
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? 0 : 8}px)`,
        transition: "opacity 400ms ease, transform 400ms ease",
      }}
    >
      <div className="flex flex-1 justify-start">
        <ConnectionStatus />
      </div>
      <div className="flex flex-1 justify-center">
        <LayerSelector />
      </div>
      <div className="flex flex-1 justify-end">
        <UploadButton />
      </div>
    </footer>
  );
}

function ConnectionStatus() {
  const connection = useApp((s) => s.connection);
  const map = {
    disconnected: { dot: "bg-[var(--color-ink-soft)]", text: "text-[var(--color-ink-soft)]", label: "Disconnected" },
    connecting: { dot: "bg-amber-400 animate-pulse", text: "text-amber-400", label: "Connecting…" },
    connected: { dot: "bg-[var(--color-online)]", text: "text-[var(--color-online)]", label: "Connected" },
  }[connection];
  return (
    <span className="inline-flex items-center gap-2 text-[10px]">
      <span className={`h-4 w-4 rounded-full ${map.dot}`} />
      <span className={map.text}>{map.label}</span>
    </span>
  );
}

function UploadButton() {
  const { connection, uploading, uploadToPad } = useApp();
  const dirty = useApp(selectDirty);
  const enabled = connection === "connected" && dirty && !uploading;

  const onClick = () => {
    if (!enabled) return;
    // §8: escrita explícita e consciente. Backup de sessão já foi feito no connect.
    const ok = window.confirm(
      "Gravar o preset ativo no teclado?\nUm backup do estado atual foi feito ao conectar.",
    );
    if (ok) void uploadToPad();
  };

  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      title={
        connection !== "connected"
          ? "Conecte um device para enviar"
          : enabled
            ? "Gravar o preset ativo no teclado"
            : "Sem alterações para enviar"
      }
      // CTA upload (node 75:906): pílula escura com borda branca
      className={`inline-flex w-full max-w-[180px] items-center justify-center gap-2.5 rounded-[40px] border bg-[var(--color-cta-ghost)] px-3 py-1.5 text-sm transition ${
        enabled
          ? "border-white text-white hover:bg-white hover:text-black"
          : "cursor-not-allowed border-white/30 text-white/40"
      }`}
    >
      {uploading ? "enviando…" : "fazer upload"}
      <UploadIcon />
    </button>
  );
}

/** lucide/upload */
function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v12m0-12 5 5m-5-5L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
