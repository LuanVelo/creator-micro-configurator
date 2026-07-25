import { useApp, selectActivePreset } from "../store/app.ts";
import { KeyEditor } from "./KeyEditor.tsx";
import { FigmaLogo } from "./FigmaLogo.tsx";

/**
 * Drawer direito. Altura fixa (= altura da tela); só o conteúdo interno rola.
 * Ao selecionar uma tecla, o editor toma o painel inteiro. Senão: abas
 * Presets/Actions + lista rolável + controle "+".
 */
export function RightPanel() {
  const { panelTab, selectedSlot } = useApp();

  if (selectedSlot !== null) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <KeyEditor />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-center px-6 py-4">
        <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-sm">
          <Tab tab="presets">Presets</Tab>
          <Tab tab="actions">Actions</Tab>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3">
        {panelTab === "presets" ? <PresetList /> : <ActionsList />}
      </div>

      <div className="flex shrink-0 justify-center py-4">
        <button
          title="Novo preset (em breve)"
          className="grid h-8 w-8 place-items-center rounded-full border border-slate-300 text-slate-400 transition hover:bg-white hover:text-slate-600"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Tab({ tab, children }: { tab: "presets" | "actions"; children: string }) {
  const { panelTab, setPanelTab } = useApp();
  const active = panelTab === tab;
  return (
    <button
      onClick={() => setPanelTab(tab)}
      className={`rounded-full px-6 py-1.5 font-medium transition ${
        active ? "bg-slate-900 text-white shadow-sm" : "text-slate-400"
      }`}
    >
      {children}
    </button>
  );
}

function PresetList() {
  const { presets, activePresetId, setActivePresetId } = useApp();
  return (
    <ul className="space-y-2 py-1">
      {presets.map((p) => (
        <li key={p.id}>
          <button
            onClick={() => setActivePresetId(p.id)}
            className={`flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition ${
              p.id === activePresetId ? "border-slate-300 shadow-sm" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <FigmaLogo className="h-5 w-auto shrink-0" />
            <span className="leading-tight">
              <span className="block text-[11px] text-slate-400">Preset custom</span>
              <span className="block text-sm font-semibold text-slate-700">{p.name}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ActionsList() {
  const preset = useApp(selectActivePreset);
  const macros = preset.macros.filter((m) => m.actions.trim() !== "");
  return (
    <ul className="space-y-2 py-1">
      {macros.map((m) => (
        <li key={m.index} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
            M{m.index}
          </span>
          <span className="font-mono text-xs text-slate-600">{m.actions}</span>
        </li>
      ))}
      {macros.length === 0 && <li className="px-2 text-sm text-slate-400">Nenhuma macro definida.</li>}
    </ul>
  );
}
