import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { useApp, selectActivePreset } from "../../store/app.ts";
import { SLOT_LAYOUT } from "../../model/layout.ts";
import { actionLabelFor, keyLabel } from "../labels.ts";
import { DRAWER_FRAC, STAGE_H, STAGE_W } from "./stage.ts";
import {
  assetUrl,
  loadManifest,
  type CinematicClip,
  type CinematicManifest,
  type CinematicPose,
  type PoseId,
  type SlotAnchor,
} from "./manifest.ts";
import { mirrorTime, poseForState, reroute, route, type ClipStep } from "./planner.ts";

/**
 * Pad cinematográfico: o MUNDO é imagem pré-renderizada do Blender; o DADO
 * (hover, seleção, tooltip) é desenhado por cima, ancorado nas coordenadas que
 * o próprio render exportou. Ver docs/cinematic-instrucoes.md.
 *
 * Em repouso mostra o still de alta resolução. Em transição toca o clipe e, ao
 * terminar, o still entra num fade — nunca se descansa num frame de vídeo.
 */

const SELECT = "#ff9f0a"; // laranja dos mockups
const HOVER = "#9aa3b2";

export function CinematicPad({
  interactive,
  fallback,
}: {
  interactive: boolean;
  fallback: ReactNode;
}) {
  const [manifest, setManifest] = useState<CinematicManifest | null | "loading">("loading");
  useEffect(() => {
    let alive = true;
    void loadManifest().then((m) => alive && setManifest(m));
    return () => {
      alive = false;
    };
  }, []);

  if (manifest === "loading") return <div className="h-full w-full bg-[#0b0b0d]" />;
  if (!manifest) return <>{fallback}</>; // acervo ausente ou inválido → modo fast
  return <Player manifest={manifest} interactive={interactive} />;
}

// ── Player ──────────────────────────────────────────────────────────────────

interface Playing {
  clip: CinematicClip;
  plan: ClipStep[];
  startAt: number; // segundos, para retomar rebobinando
}

function Player({ manifest, interactive }: { manifest: CinematicManifest; interactive: boolean }) {
  const { connection, selectedSlot, panelCollapsed, selectSlot } = useApp();
  const preset = useApp(selectActivePreset);
  const activeLayer = useApp((s) => s.activeLayer);
  const keys = preset.layers[activeLayer]?.keys ?? [];

  const target = poseForState({ connection, selectedSlot, panelCollapsed });
  const [pose, setPose] = useState<PoseId>(target);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const poseData = useMemo(
    () => manifest.poses.find((p) => p.id === pose) ?? manifest.poses[0],
    [manifest, pose],
  );

  const start = useCallback((plan: ClipStep[], at = 0) => {
    const [step, ...rest] = plan;
    if (!step) return false;
    setPlaying({ clip: step.clip, plan: rest, startAt: at });
    return true;
  }, []);

  // alvo mudou → planeja
  useEffect(() => {
    if (target === pose && !playing) return;
    if (!playing) {
      const plan = route(manifest, pose, target);
      if (!plan || plan.length === 0) {
        setPose(target); // sem clipe: corta (o still entra com crossfade)
        return;
      }
      start(plan);
      return;
    }
    // já está tocando: continua ou rebobina
    if (playing.clip.to === target) return;
    const decision = reroute(manifest, { clip: playing.clip }, target);
    if (!decision) return;
    if (decision.kind === "continue") {
      setPlaying({ ...playing, plan: decision.plan });
    } else {
      const t = video.current?.currentTime ?? 0;
      setPlaying({ clip: decision.clip, plan: decision.plan, startAt: mirrorTime(playing.clip, t) });
    }
  }, [target, pose, playing, manifest, start]);

  // toca o clipe atual
  useEffect(() => {
    const el = video.current;
    if (!el || !playing) return;
    el.src = assetUrl(manifest, playing.clip.file);
    el.currentTime = playing.startAt;
    void el.play().catch(() => {
      // sem codec (Windows N, WebView sem Media Foundation): corta para o destino
      setPose(playing.clip.to);
      setPlaying(null);
    });
  }, [playing, manifest]);

  const onEnded = () => {
    if (!playing) return;
    setPose(playing.clip.to);
    if (!start(playing.plan)) setPlaying(null);
  };

  useEffect(() => {
    document.body.style.cursor = hovered !== null ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  const clickable = interactive && !playing;
  const onSelect = (slot: number) =>
    selectSlot(panelCollapsed ? slot : selectedSlot === slot ? null : slot);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b0b0d]" onMouseLeave={() => setHovered(null)}>
      <img
        src={assetUrl(manifest, poseData.still.beauty)}
        alt=""
        draggable={false}
        onLoad={bump}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-150"
        style={{ opacity: playing ? 0 : 1 }}
      />
      <video
        ref={video}
        muted
        playsInline
        preload="auto"
        onEnded={onEnded}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: playing ? 1 : 0 }}
      />

      {clickable && (
        <SlotOverlay
          pose={poseData}
          hovered={hovered}
          selected={selectedSlot}
          onHover={setHovered}
          onSelect={onSelect}
          keycodeOf={(slot) => keys[slot] ?? "KC_NO"}
        />
      )}
    </div>
  );
}

// ── Overlay: o dado por cima do mundo ───────────────────────────────────────

function usable(pose: CinematicPose, a: SlotAnchor): boolean {
  if (!a.visible) return false;
  if (SLOT_LAYOUT[a.slot]?.role === "logo") return false;
  // com o drawer aberto, o que está embaixo dele não é clicável
  return pose.drawer === "closed" || a.center[0] < 1 - DRAWER_FRAC;
}

function SlotOverlay({
  pose,
  hovered,
  selected,
  onHover,
  onSelect,
  keycodeOf,
}: {
  pose: CinematicPose;
  hovered: number | null;
  selected: number | null;
  onHover: (slot: number | null) => void;
  onSelect: (slot: number) => void;
  keycodeOf: (slot: number) => string;
}) {
  // do mais distante para o mais próximo: a tecla da frente fica por cima e
  // ganha o clique quando os quads se sobrepõem numa vista 3/4
  const anchors = useMemo(
    () => pose.anchors.filter((a) => usable(pose, a)).sort((x, y) => y.depth - x.depth),
    [pose],
  );
  const tip = hovered !== null ? pose.anchors[hovered] : null;

  return (
    <>
      <svg
        viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {anchors.map((a) => {
          const isSel = selected === a.slot;
          const isHov = hovered === a.slot;
          return (
            <polygon
              key={a.slot}
              points={a.quad.map(([x, y]) => `${x * STAGE_W},${y * STAGE_H}`).join(" ")}
              fill={isHov ? "rgba(255,255,255,.08)" : "transparent"}
              stroke={isSel ? SELECT : isHov ? HOVER : "none"}
              strokeWidth={isSel ? 3 : 2}
              strokeLinejoin="round"
              className="cursor-pointer outline-none"
              tabIndex={0}
              role="button"
              aria-label={`${SLOT_LAYOUT[a.slot]?.label ?? a.slot}: ${keycodeOf(a.slot)}`}
              onMouseEnter={() => onHover(a.slot)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(a.slot)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(a.slot);
                }
              }}
            />
          );
        })}
      </svg>

      {tip && <Tooltip anchor={tip} kc={keycodeOf(tip.slot)} />}
    </>
  );
}

function Tooltip({ anchor, kc }: { anchor: SlotAnchor; kc: string }) {
  const label = actionLabelFor(kc) ?? keyLabel(kc);
  const text = label ? `${label} · ${kc}` : kc;
  return (
    <div
      className="pointer-events-none absolute z-20 whitespace-nowrap rounded-md bg-black/85 px-2 py-1 text-[11px] font-medium text-[var(--color-ink)] shadow-lg ring-1 ring-white/10"
      style={{
        left: `${anchor.tip[0] * 100}%`,
        top: `${anchor.tip[1] * 100}%`,
        transform: "translate(-50%, -115%)",
      }}
    >
      {text}
    </div>
  );
}
