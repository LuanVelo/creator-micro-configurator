import { useCallback, useMemo, useRef, useState } from "react";
import { CREATOR_MICRO } from "../../protocol/device.ts";
import { WebHIDTransport, isWebHidSupported } from "../../protocol/webhid-transport.ts";
import { MockTransport } from "../../protocol/mock-transport.ts";
import { GuardedTransport } from "../../protocol/guards.ts";
import { ViaClient } from "../../protocol/via.ts";
import type { Transport } from "../../protocol/transport.ts";
import { importViaJson } from "../../model/serialize.ts";
import { decodeKeycode } from "../../model/keycodes.ts";
import backupJson from "../../../backup_VIA/creator_micro.layout.json";
import {
  readDump,
  reconcile,
  findingsMarkdown,
  type DiscoveryDump,
  type ReconcileResult,
} from "./dump.ts";

const backupPreset = importViaJson(backupJson);
const hex = (v: number) => `0x${v.toString(16).toUpperCase().padStart(4, "0")}`;

type Status = "idle" | "connecting" | "ready" | "error";

interface Result {
  dump: DiscoveryDump;
  rec: ReconcileResult;
}

export function DiscoveryPanel() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const transportRef = useRef<Transport | null>(null);

  const run = useCallback(async (makeTransport: () => Transport) => {
    setStatus("connecting");
    setError(null);
    try {
      const inner = makeTransport();
      // Fase 0: read-only. O guard bloqueia qualquer escrita e 0x0A/0x0B.
      const transport = new GuardedTransport(inner, { isWriteEnabled: () => false });
      await transport.connect();
      transportRef.current = transport;
      const via = new ViaClient(transport);
      const dump = await readDump(via, CREATOR_MICRO, inner.name);
      const rec = reconcile(dump, backupPreset);
      setResult({ dump, rec });
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, []);

  const connectReal = useCallback(() => run(() => new WebHIDTransport()), [run]);
  const connectMock = useCallback(() => run(() => new MockTransport(backupPreset)), [run]);

  return (
    <div className="mx-auto max-w-5xl p-6 text-slate-800">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">
          <span className="text-[var(--color-accent)]">keymap</span> — Fase 0 · Discovery
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Leitura read-only do Creator Micro e diff contra o backup do VIA. Nenhuma escrita.
        </p>
      </header>

      {!isWebHidSupported() && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          WebHID não está disponível neste navegador. Use <b>Chrome</b> ou <b>Edge</b> para conectar
          o teclado. Você ainda pode usar o modo simulado abaixo.
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={connectReal}
          disabled={status === "connecting" || !isWebHidSupported()}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 font-medium text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Conectar teclado (WebHID)
        </button>
        <button
          onClick={connectMock}
          disabled={status === "connecting"}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
        >
          Simular com backup (mock)
        </button>
        {status === "connecting" && <span className="self-center text-sm text-slate-500">Lendo…</span>}
      </div>

      {status === "error" && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && <DumpView dump={result.dump} rec={result.rec} />}
    </div>
  );
}

function DumpView({ dump, rec }: Result) {
  const md = useMemo(() => findingsMarkdown(dump, rec, CREATOR_MICRO), [dump, rec]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Transporte" value={dump.transportName} />
        <Stat label="Protocol" value={hex(dump.protocolVersion)} />
        <Stat label="Layers" value={String(dump.layerCount)} />
        <Stat label="Macros" value={String(dump.macroCount)} />
      </section>

      <section
        className={`rounded-lg border p-3 text-sm ${
          rec.keymapMatches
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-amber-300 bg-amber-50 text-amber-800"
        }`}
      >
        {rec.keymapMatches ? (
          <b>Keymap bate 1:1 com o backup VIA ✅</b>
        ) : (
          <b>
            {rec.mismatches.length} divergência(s) vs backup — ver tabela de encoding aprendido
            abaixo.
          </b>
        )}
      </section>

      {dump.layers.map((layer, l) => (
        <LayerGrid key={l} index={l} values={layer} rec={rec} />
      ))}

      <EncoderTable dump={dump} />

      {rec.learned.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Encoding especial aprendido (pad ↔ backup)</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2">keycode</th>
                  <th className="px-3 py-2">valor real (pad)</th>
                  <th className="px-3 py-2">nosso palpite</th>
                </tr>
              </thead>
              <tbody>
                {rec.learned.map((m) => (
                  <tr key={m.keycode} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono">{m.keycode}</td>
                    <td className="px-3 py-2 font-mono">{hex(m.padValue)}</td>
                    <td className="px-3 py-2 font-mono">
                      {m.ourGuess === null ? "—" : hex(m.ourGuess)}
                      {m.ourGuess === m.padValue ? " ✅" : " ⚠️"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center gap-3">
          <h2 className="font-semibold">docs/phase0-findings.md</h2>
          <button
            onClick={() => navigator.clipboard?.writeText(md)}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            Copiar
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{md}</pre>
      </section>
    </div>
  );
}

function LayerGrid({ index, values, rec }: { index: number; values: number[]; rec: ReconcileResult }) {
  const slotOf = (pos: number) => rec.slots.find((s) => s.layer === index && s.pos === pos);
  return (
    <section>
      <h2 className="mb-2 font-semibold">Layer {index}</h2>
      <div className="grid grid-cols-4 gap-2">
        {values.map((value, pos) => {
          const slot = slotOf(pos);
          const agree = slot?.agree ?? true;
          return (
            <div
              key={pos}
              className={`rounded-lg border p-2 text-center ${
                agree ? "border-slate-200 bg-white" : "border-amber-400 bg-amber-50"
              }`}
              title={`pos ${pos} · ${hex(value)}${slot ? ` · backup: ${slot.backup}` : ""}`}
            >
              <div className="text-[10px] text-slate-400">
                {pos} · {hex(value)}
              </div>
              <div className="truncate font-mono text-xs">{decodeKeycode(value)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EncoderTable({ dump }: { dump: DiscoveryDump }) {
  return (
    <section>
      <h2 className="mb-2 font-semibold">Encoders (ccw / cw)</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2">layer</th>
              <th className="px-3 py-2">encoder</th>
              <th className="px-3 py-2">ccw</th>
              <th className="px-3 py-2">cw</th>
            </tr>
          </thead>
          <tbody>
            {dump.encoders.flatMap((perLayer, l) =>
              perLayer.map((e, enc) => (
                <tr key={`${l}-${enc}`} className="border-t border-slate-100">
                  <td className="px-3 py-2">{l}</td>
                  <td className="px-3 py-2">{enc === 0 ? "roda" : "knob"}</td>
                  <td className="px-3 py-2 font-mono">{decodeKeycode(e.ccw)}</td>
                  <td className="px-3 py-2 font-mono">{decodeKeycode(e.cw)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-mono text-lg">{value}</div>
    </div>
  );
}
