import type { AppIconKey } from "../model/actions.ts";

/** Badge de app para o seletor. Figma usa o logo oficial; Adobe usa monograma
 * na cor da marca; Blender/Básico/Sistema usam glifos simples. */
export function AppIcon({ icon, size = 40 }: { icon: AppIconKey; size?: number }) {
  const s = { width: size, height: size };
  if (icon === "figma") {
    return (
      <div style={s} className="grid place-items-center rounded-xl bg-white ring-1 ring-slate-200">
        <svg viewBox="0 0 38 57" width={size * 0.48} height={size * 0.48} aria-hidden>
          <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z" fill="#1ABCFE" />
          <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0Z" fill="#0ACF83" />
          <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19Z" fill="#FF7262" />
          <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z" fill="#F24E1E" />
          <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z" fill="#A259FF" />
        </svg>
      </div>
    );
  }
  if (icon === "photoshop") {
    return <Monogram style={s} bg="#001E36" fg="#31A8FF" label="Ps" size={size} />;
  }
  if (icon === "illustrator") {
    return <Monogram style={s} bg="#330000" fg="#FF9A00" label="Ai" size={size} />;
  }
  if (icon === "blender") {
    return (
      <div style={s} className="grid place-items-center rounded-xl bg-[#f5f5f5] ring-1 ring-slate-200">
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} aria-hidden>
          <circle cx="12" cy="13" r="7.5" fill="#265787" />
          <circle cx="14.5" cy="11.5" r="4.5" fill="#ffffff" />
          <circle cx="15" cy="11.7" r="2.6" fill="#EA7600" />
          <path d="M4 12c2-3 6-4 9-3l-5 4z" fill="#EA7600" />
        </svg>
      </div>
    );
  }
  if (icon === "basic") {
    return <Glyph style={s} bg="#f1f5f9" fg="#64748b" glyph="⌨" size={size} />;
  }
  return <Glyph style={s} bg="#f1f5f9" fg="#64748b" glyph="▤" size={size} />;
}

function Monogram({
  style,
  bg,
  fg,
  label,
  size,
}: {
  style: { width: number; height: number };
  bg: string;
  fg: string;
  label: string;
  size: number;
}) {
  return (
    <div style={{ ...style, backgroundColor: bg }} className="grid place-items-center rounded-xl">
      <span style={{ color: fg, fontSize: size * 0.4 }} className="font-bold leading-none tracking-tight">
        {label}
      </span>
    </div>
  );
}

function Glyph({
  style,
  bg,
  fg,
  glyph,
  size,
}: {
  style: { width: number; height: number };
  bg: string;
  fg: string;
  glyph: string;
  size: number;
}) {
  return (
    <div style={{ ...style, backgroundColor: bg }} className="grid place-items-center rounded-xl ring-1 ring-slate-200">
      <span style={{ color: fg, fontSize: size * 0.5 }} className="leading-none">
        {glyph}
      </span>
    </div>
  );
}
