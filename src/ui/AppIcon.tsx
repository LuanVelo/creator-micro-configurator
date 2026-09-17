import type React from "react";
import type { AppIconKey } from "../model/actions.ts";

/**
 * Ícones de app do drawer, fiéis ao componente "Software logos" do Figma
 * (node 50:498): tile escuro arredondado (29px) + logo da marca colorido.
 * Figma/Photoshop/Blender saem do vetor oficial; Básico/Sistema usam glifos
 * simples no mesmo tile (não existem no Figma, mantidos por decisão do usuário).
 */
export function AppIcon({
  icon,
  size = 29,
  selected = false,
  dimmed = false,
}: {
  icon: AppIconKey;
  size?: number;
  selected?: boolean;
  dimmed?: boolean;
}) {
  return (
    <Tile size={size} selected={selected} dimmed={dimmed}>
      <Logo icon={icon} size={size} />
    </Tile>
  );
}

/**
 * Tile fiel ao componente "Software logos": inativo = tile cinza, logo em
 * grayscale; selecionado = tile escuro, logo colorido + fio azul. (grayscale por inline
 * style: a composição de `filter` do Tailwind v4 não aplica de forma confiável.)
 */
function Tile({
  size,
  selected,
  dimmed,
  children,
}: {
  size: number;
  selected: boolean;
  dimmed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        // Software logos (V 2.0): ativo = tile preto + fio azul; inativo = tile cinza claro, logo em cinza
        background: dimmed ? "#cfcfcf" : "var(--color-icon-tile)",
        boxShadow: `inset 0 0 0 ${selected ? 1 : 0.5}px ${selected ? "#2045fd" : "#d9d9d9"}`,
      }}
      className="grid place-items-center transition hover:brightness-95"
    >
      <span className="grid place-items-center" style={{ filter: dimmed ? "grayscale(1) brightness(0.45)" : undefined }}>
        {children}
      </span>
    </div>
  );
}

function Logo({ icon, size }: { icon: AppIconKey; size: number }) {
  if (icon === "figma") {
    const h = size * 0.66;
    return (
      <svg viewBox="0 0 14.4 21.6" width={h * (14.4 / 21.6)} height={h} aria-hidden>
        <path d="M7.199 10.796a3.599 3.599 0 1 1 7.198 0 3.599 3.599 0 0 1-7.198 0Z" fill="#1ABCFE" />
        <path d="M.001 17.994a3.599 3.599 0 0 1 3.599-3.599h3.599v3.599a3.599 3.599 0 1 1-7.198 0Z" fill="#0ACF83" />
        <path d="M7.199 0v7.197h3.599a3.599 3.599 0 1 0 0-7.197H7.199Z" fill="#FF7262" />
        <path d="M.002 3.599a3.599 3.599 0 0 0 3.599 3.599h3.599V0H3.6A3.599 3.599 0 0 0 .002 3.599Z" fill="#F24E1E" />
        <path d="M.001 10.796a3.599 3.599 0 0 0 3.599 3.599h3.599V7.197H3.6a3.599 3.599 0 0 0-3.599 3.599Z" fill="#A259FF" />
      </svg>
    );
  }
  if (icon === "photoshop") {
    return (
      <span style={{ color: "#31A8FF", fontSize: size * 0.44 }} className="font-bold leading-none tracking-tight">
        Ps
      </span>
    );
  }
  if (icon === "illustrator") {
    return (
      <span style={{ color: "#FF9A00", fontSize: size * 0.44 }} className="font-bold leading-none tracking-tight">
        Ai
      </span>
    );
  }
  if (icon === "blender") {
    const w = size * 0.72;
    return (
      <svg viewBox="0 0 21.8011 17.4583" width={w} height={w * (17.4583 / 21.8011)} aria-hidden>
        <path
          d="M17.6337 12.8447C16.7698 13.7262 15.5613 14.2246 14.2522 14.2263C12.9423 14.229 11.733 13.734 10.869 12.8552C10.4466 12.4267 10.1371 11.9353 9.94471 11.4098C9.75671 10.8938 9.685 10.3421 9.7331 9.79552C9.77944 9.26211 9.93684 8.74356 10.1966 8.27486C10.4493 7.81665 10.7964 7.40304 11.2249 7.05326C12.0644 6.36857 13.1329 5.99868 14.2522 5.99693C15.3715 5.99518 16.4392 6.36332 17.2796 7.04451C17.7072 7.39342 18.0543 7.80528 18.3062 8.26262C18.5659 8.73132 18.7242 9.24899 18.7705 9.78241C18.8186 10.3298 18.746 10.8807 18.558 11.3975C18.3656 11.9222 18.0552 12.4145 17.6337 12.8447Z"
          fill="white"
        />
        <path
          d="M11.4594 9.8515C11.4987 9.13883 11.8485 8.5101 12.3749 8.06501C12.8917 7.62691 13.5878 7.36021 14.3459 7.36021C15.1049 7.36108 15.8001 7.62779 16.3169 8.06501C16.8433 8.51098 17.1931 9.13883 17.2333 9.8515C17.2736 10.5843 16.9789 11.2655 16.4621 11.77C15.9357 12.2833 15.1854 12.606 14.3459 12.606C13.5064 12.606 12.7553 12.2833 12.2289 11.77C11.713 11.2655 11.4191 10.5843 11.4594 9.8515Z"
          fill="#005385"
        />
        <path
          d="M6.86061 11.2943C6.86586 11.5724 6.95506 12.1146 7.08797 12.5387C7.36867 13.435 7.84437 14.2648 8.5072 14.9959C9.18752 15.747 10.0235 16.3504 10.9906 16.778C12.0076 17.2283 13.1085 17.4583 14.2514 17.4557C15.3943 17.4539 16.4953 17.2204 17.5114 16.7666C18.4776 16.3338 19.3136 15.7286 19.993 14.9757C20.655 14.2412 21.1298 13.4105 21.4105 12.5142C21.5504 12.0673 21.6405 11.6065 21.6772 11.1404C21.7122 10.6857 21.6973 10.2275 21.6335 9.77541C21.5076 8.88872 21.2007 8.05712 20.7285 7.29898C20.2956 6.60292 19.7395 5.99256 19.0775 5.47838L19.0784 5.47751L12.3994 0.349754C12.3941 0.345382 12.388 0.340136 12.3827 0.335763C11.9429 -2.4072e-05 11.2066 0.000850428 10.7248 0.338387C10.2369 0.679421 10.1818 1.24344 10.6146 1.59934L10.6129 1.60021L13.3988 3.86678L4.90535 3.87552H4.89399C4.19268 3.8764 3.51761 4.33723 3.38382 4.91874C3.2474 5.51161 3.72398 6.00305 4.45414 6.00655L4.45326 6.00917L8.75816 6.00043L1.07615 11.8968C1.06653 11.9047 1.05604 11.9117 1.0473 11.9187C0.323255 12.4731 0.0889034 13.3965 0.54449 13.9806C1.00795 14.5744 1.99257 14.5752 2.72536 13.9832L6.91745 10.5528C6.91745 10.5528 6.85624 11.0163 6.86061 11.2943ZM17.6338 12.8447C16.7698 13.7262 15.5614 14.2246 14.2523 14.2263C12.9424 14.229 11.733 13.734 10.8691 12.8552C10.4467 12.4267 10.1372 11.9353 9.94479 11.4098C9.75678 10.8938 9.68508 10.3421 9.73317 9.79552C9.77952 9.26211 9.93692 8.74356 10.1966 8.27486C10.4493 7.81665 10.7965 7.40304 11.225 7.05326C12.0644 6.36857 13.133 5.99868 14.2523 5.99693C15.3716 5.99518 16.4393 6.36332 17.2796 7.04451C17.7072 7.39342 18.0544 7.80528 18.3062 8.26262C18.566 8.73132 18.7242 9.24899 18.7706 9.78241C18.8187 10.3298 18.7461 10.8807 18.5581 11.3975C18.3657 11.9222 18.0553 12.4145 17.6338 12.8447Z"
          fill="#FF7021"
        />
      </svg>
    );
  }
  if (icon === "basic") {
    return <Glyph glyph="⌨" size={size} />;
  }
  return <Glyph glyph="▤" size={size} />;
}

function Glyph({ glyph, size }: { glyph: string; size: number }) {
  return (
    <span style={{ color: "#cbd5e1", fontSize: size * 0.5 }} className="leading-none">
      {glyph}
    </span>
  );
}
