import { useApp } from "../store/app.ts";
import { CREATOR_MICRO } from "../protocol/device.ts";

/**
 * Chips 1–4 no rodapé central (Figma node 48:348). Rótulo "Presets" conforme o
 * design; funcionalmente selecionam a layer de hardware ativa (0–3).
 */
export function LayerSelector() {
  const { activeLayer, setActiveLayer } = useApp();
  const layers = Array.from({ length: CREATOR_MICRO.layerCount }, (_, i) => i);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[var(--color-ink-soft)]">Presets</span>
      <div className="flex gap-1.5">
        {layers.map((i) => {
          const active = i === activeLayer;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveLayer(i)}
              className={`h-[26px] w-[26px] rounded-md text-sm font-medium transition ${
                active
                  ? "bg-[var(--color-btn)] text-[var(--color-btn-ink)] shadow-sm"
                  : "bg-[var(--color-chip)] text-[var(--color-ink-soft)] hover:bg-[var(--color-chip-hover)]"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
