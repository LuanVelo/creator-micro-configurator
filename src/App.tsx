import { useState } from "react";
import { AppShell } from "./ui/AppShell.tsx";
import { FixedFrame } from "./ui/FixedFrame.tsx";
import { DiscoveryPanel } from "./features/discovery/DiscoveryPanel.tsx";

type View = "configurator" | "discovery";

export function App() {
  const [view, setView] = useState<View>("configurator");

  if (view === "discovery") {
    return (
      <div>
        <div className="bg-[var(--color-chip)] px-6 pt-4">
          <button
            onClick={() => setView("configurator")}
            className="text-sm text-[var(--color-ink-soft)] underline-offset-2 hover:underline"
          >
            ← Voltar ao configurador
          </button>
        </div>
        <DiscoveryPanel />
      </div>
    );
  }

  return (
    <FixedFrame>
      <AppShell onOpenDiscovery={() => setView("discovery")} />
    </FixedFrame>
  );
}
