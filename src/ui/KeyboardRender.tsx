import type React from "react";
import { useState } from "react";
import { useApp, selectActivePreset } from "../store/app.ts";
import { SLOT_LAYOUT, type Slot } from "../model/layout.ts";
import { ACTION_CATALOG } from "../model/actions.ts";
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

/** Rótulo amigável do atalho (para o tooltip), buscado no catálogo por keycode. */
function actionLabelFor(kc: string): string | undefined {
  for (const g of ACTION_CATALOG) {
    const a = g.actions.find((x) => x.keycode === kc);
    if (a) return a.label;
  }
  return undefined;
}

export function KeyboardRender({ interactive = true }: { interactive?: boolean }) {
  const { activeLayer, selectedSlot, selectSlot, panelCollapsed } = useApp();
  const preset = useApp(selectActivePreset);
  const keys = preset.layers[activeLayer]?.keys ?? [];
  const [hovered, setHovered] = useState<number | null>(null);

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

      {/* camada interativa — só quando há device conectado */}
      {interactive &&
        SLOT_LAYOUT.map((slot) => {
        const { cx, cy } = center(slot);
        const kc = keys[slot.index] ?? "KC_NO";
        const selected = selectedSlot === slot.index;
        const clickable = slot.role !== "logo";
        const isKey = slot.role === "key";

        // drawer fechado → sempre abre nessa tecla; aberto → alterna (clicar a
        // selecionada desmarca). "sempre deve abrir" ao clicar com o drawer fechado.
        const toggle = () =>
          selectSlot(panelCollapsed ? slot.index : selected ? null : slot.index);

        const handlers = clickable
          ? {
              onClick: toggle,
              onMouseEnter: () => setHovered(slot.index),
              onMouseLeave: () => setHovered((h) => (h === slot.index ? null : h)),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
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
            <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx="10" fill="transparent" />
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
            {/* seleção = variante "square selected" do Figma (box azul no keycap) */}
            {selected && (
              <rect
                x={cx - w / 2}
                y={cy - h / 2}
                width={w}
                height={h}
                rx="10"
                fill="none"
                stroke="var(--color-key-selected)"
                strokeWidth="2.5"
                className="pointer-events-none"
              />
            )}
          </g>
        );
      })}

      {/* tooltip do hover (por cima de tudo) */}
      {hovered !== null && <KeyTooltip slotIndex={hovered} kc={keys[hovered] ?? "KC_NO"} />}
    </svg>
  );
}

/** Tooltip SVG: código + atalho, acima do keycap (abaixo, se for a fileira de cima). */
function KeyTooltip({ slotIndex, kc }: { slotIndex: number; kc: string }) {
  const slot = SLOT_LAYOUT[slotIndex];
  const { cx, cy } = center(slot);
  const label = actionLabelFor(kc) ?? keyLabel(kc);
  const text = label ? `${label} · ${kc}` : kc;

  const fs = 11;
  const padX = 8;
  const width = Math.max(44, text.length * fs * 0.56 + padX * 2);
  const height = 22;
  const gap = 34;
  const below = slot.row === 0; // fileira de cima: tooltip abaixo para não cortar
  const y = below ? cy + gap - height / 2 : cy - gap - height / 2;
  const x = Math.min(Math.max(cx - width / 2, 4), ART_W - width - 4);
  const ty = y + height / 2 + fs * 0.35;

  return (
    <g className="pointer-events-none">
      <rect x={x} y={y} width={width} height={height} rx="6" fill="#0f172a" opacity="0.92" />
      <text x={x + width / 2} y={ty} textAnchor="middle" fontSize={fs} fontWeight="500" fill="#f8fafc">
        {text}
      </text>
    </g>
  );
}
