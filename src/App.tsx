import { useState } from "react";
import { AppShell } from "./ui/AppShell.tsx";
import { DiscoveryPanel } from "./features/discovery/DiscoveryPanel.tsx";

type View = "configurator" | "discovery";

export function App() {
  const [view, setView] = useState<View>("configurator");

  if (view === "discovery") {
    return (
      <div>
        <div className="bg-slate-100 px-6 pt-4">
          <button
            onClick={() => setView("configurator")}
            className="text-sm text-slate-500 underline-offset-2 hover:underline"
          >
            ← Voltar ao configurador
          </button>
        </div>
        <DiscoveryPanel />
      </div>
    );
  }

  return <AppShell onOpenDiscovery={() => setView("discovery")} />;
}
