import type { ReactNode } from "react";
import { CHROME_H } from "./cinematic/stage.ts";

/**
 * Header (Figma V 2.0, node 75:911): só o logo, flutuando sobre o render. As
 * abas Presets/Actions e o controle do drawer foram para o topo do drawer.
 * `children` fica à direita (controles de dev, fora do design).
 */
export function Header({ children }: { children?: ReactNode }) {
  return (
    <header
      className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6"
      style={{ height: CHROME_H }}
    >
      <span className="font-[family-name:var(--font-logo)] text-[15.333px] lowercase text-[var(--color-accent)]">
        keymap
      </span>
      {children}
    </header>
  );
}
