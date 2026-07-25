import type React from "react";
import { useApp, selectActivePreset } from "../store/app.ts";
import { SLOT_LAYOUT, type Slot } from "../model/layout.ts";
import { keyLabel } from "./labels.ts";
import rawSvg from "../assets/keyboard49.svg?raw";

/**
 * Teclado = a arte SVG EXATA exportada do Figma (node 49:165: halo + vidro fosco
 * + sombras em camadas), embutida como <image> (data-URI SVG) para o browser
 * parsear no namespace SVG correto (gradientes/filtros do Figma renderizam). Por
 * cima, os 16 slots interativos no mesmo viewBox. viewBox CHEIO (sem crop) para
 * não cortar as sombras do modelo.
 */
const CLEAN_SVG = rawSvg
  .replace('<rect width="409" height="469" fill="#CECECE"/>', "")
  // Vidro mais opaco (macOS glass): sobe a opacidade do vidro tintado e adiciona
  // uma camada de "frost" branco por cima — dentro do grupo glass (sob as teclas),
  // então ainda translúcido o suficiente para o halo tingir (vibrancy).
  .replace(
    '<rect x="39" y="7" width="331" height="327" rx="48" fill="url(#paint1_linear_38_2307)" fill-opacity="0.2"/>',
    '<rect x="39" y="7" width="331" height="327" rx="48" fill="url(#paint1_linear_38_2307)" fill-opacity="0.55"/>' +
      '<rect x="39" y="7" width="331" height="327" rx="48" fill="white" fill-opacity="0.42"/>' +
      // sheen: brilho suave vindo do topo (vidro "iluminado" estilo macOS)
      '<linearGradient id="kbGlassSheen" x1="0" y1="7" x2="0" y2="210" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="white" stop-opacity="0.65"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>' +
      '<rect x="39" y="7" width="331" height="210" rx="48" fill="url(#kbGlassSheen)"/>',
  );

const ART_URI = `data:image/svg+xml;utf8,${encodeURIComponent(CLEAN_SVG)}`;

const ART_W = 409;
const ART_H = 469;
const VB = { x: 0, y: 0, w: ART_W, h: ART_H };
// Centros dos slots — medidos por centroides de pixel na própria arte (409×469).
const COLX = [125, 178, 231, 284];
const ROWY = [86, 144.5, 203.5, 262.5];
const KW = 48.75;
const KH = 51.92;

function center(slot: Slot): { cx: number; cy: number } {
  return { cx: COLX[slot.col], cy: ROWY[slot.row] };
}

export function KeyboardRender() {
  const { activeLayer, selectedSlot, selectSlot } = useApp();
  const preset = useApp(selectActivePreset);
  const keys = preset.layers[activeLayer]?.keys ?? [];

  return (
    <svg
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      className="block h-full max-h-full w-full select-none"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Creator Micro"
    >
      {/* arte exata do Figma (vetor, gradientes preservados) */}
      <image href={ART_URI} x="0" y="0" width={ART_W} height={ART_H} />


      {/* camada interativa */}
      {SLOT_LAYOUT.map((slot) => {
        const { cx, cy } = center(slot);
        const kc = keys[slot.index] ?? "KC_NO";
        const selected = selectedSlot === slot.index;
        const clickable = slot.role !== "logo";
        const isKey = slot.role === "key";

        const handlers = clickable
          ? {
              onClick: () => selectSlot(selected ? null : slot.index),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectSlot(selected ? null : slot.index);
                }
              },
              role: "button",
              tabIndex: 0,
              "aria-label": `${slot.label}: ${kc}`,
              className: "cursor-pointer outline-none",
            }
          : { className: "cursor-default" };

        const w = slot.role === "wheel" ? 56 : KW;
        const h = slot.role === "wheel" ? 42 : KH;
        return (
          <g key={slot.index} {...handlers}>
            <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx="8" fill="transparent" />
            {isKey && (
              <text
                x={cx}
                y={cy + 4.5}
                textAnchor="middle"
                fontSize="12.5"
                fontWeight="600"
                fill="#f4f4f5"
                className="pointer-events-none"
              >
                {keyLabel(kc)}
              </text>
            )}
            {selected && (
              <rect
                x={cx - w / 2 - 1.5}
                y={cy - h / 2 - 1.5}
                width={w + 3}
                height={h + 3}
                rx="7"
                fill="none"
                stroke="var(--color-key-selected)"
                strokeWidth="2.5"
                className="pointer-events-none"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
