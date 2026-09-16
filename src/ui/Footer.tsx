import { useApp, selectDirty } from "../store/app.ts";
import { LayerSelector } from "./LayerSelector.tsx";

/**
 * Rodapé largura cheia (node 56:2789): status de conexão (esq.), seletor de
 * layer (centro) e o CTA "fazer upload" (dir.). Presente em qualquer estado;
 * o que muda é o status e se o upload está habilitado.
 */
export function Footer() {
  return (
    <footer className="flex h-[60px] shrink-0 items-center border-t border-[var(--color-line)] px-6">
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
    disconnected: { dot: "bg-slate-300", text: "text-slate-400", label: "Não conectado" },
    connecting: { dot: "bg-amber-400 animate-pulse", text: "text-amber-600", label: "Conectando…" },
    connected: { dot: "bg-[var(--color-accent)]", text: "text-[var(--color-accent)]", label: "Conectado" },
  }[connection];
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium">
      <span className={`h-3.5 w-3.5 rounded-full ${map.dot}`} />
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
      className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-5 py-2 text-sm font-semibold transition ${
        enabled
          ? "bg-slate-900 text-white shadow-sm hover:bg-slate-700"
          : "cursor-not-allowed bg-slate-100 text-slate-400"
      }`}
    >
      {uploading ? "enviando…" : "fazer upload"}
      <UploadIcon />
    </button>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
