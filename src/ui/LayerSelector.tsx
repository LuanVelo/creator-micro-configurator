import { useApp } from "../store/app.ts";
import { CREATOR_MICRO } from "../protocol/device.ts";

/**
 * Chips 1–4 no rodapé central (Figma node 75:890). Rótulo "Presets" conforme o
 * design; funcionalmente selecionam a layer de hardware ativa (0–3).
 */
export function LayerSelector() {
  const { activeLayer, setActiveLayer } = useApp();
  const layers = Array.from({ length: CREATOR_MICRO.layerCount }, (_, i) => i);

  return (
    <div className="flex items-center gap-[11px]">
      <span className="text-[10px] text-white">Presets</span>
      <div className="flex gap-0.5">
        {layers.map((i) => {
          const active = i === activeLayer;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveLayer(i)}
              aria-pressed={active}
              className={`h-[19px] w-[28px] rounded-[4px] text-xs leading-none transition ${
                active
                  ? "bg-[var(--color-layer-on)] text-[var(--color-layer-on-ink)]"
                  : "bg-[var(--color-layer-off)] text-[var(--color-ink-faint)] hover:brightness-110"
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
