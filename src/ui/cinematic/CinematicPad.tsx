import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useApp, selectActivePreset } from "../../store/app.ts";
import { SLOT_LAYOUT } from "../../model/layout.ts";
import { actionLabelFor, keyLabel } from "../labels.ts";
import {
  APP_W,
  DRAWER_W,
  STAGE_H,
  STAGE_W,
} from "./stage.ts";
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

type Slot = 0 | 1;

interface Playing {
  clip: CinematicClip;
  plan: ClipStep[];
  startAt: number; // segundos, para retomar rebobinando
  /** qual dos dois <video> toca este clipe (sempre o que está escondido) */
  slot: Slot;
  token: number;
}

/**
 * Still ↔ vídeo sem piscar. Três camadas, de baixo para cima: vídeo A, vídeo B,
 * still. Regras:
 *  - nada é mostrado antes de estar PINTÁVEL: o clipe carrega no vídeo
 *    escondido e só vira o visível quando entrega o primeiro frame; o still só
 *    aparece depois de `decode()`;
 *  - nunca se esconde uma camada sem outra equivalente embaixo: o vídeo que
 *    acabou fica parado no último frame (= a pose de destino) enquanto o still
 *    entra por cima; trocar `src` só acontece no vídeo que não aparece.
 * Sem isso, cada troca de src ou still não decodificado vira um frame preto.
 */
const STILL_IN_MS = 240; // longo o bastante para esconder a diferença vídeo↔still
const STILL_OUT_MS = 90;

function Player({ manifest, interactive }: { manifest: CinematicManifest; interactive: boolean }) {
  const { connection, selectedSlot, panelCollapsed, selectSlot } = useApp();
  const preset = useApp(selectActivePreset);
  const activeLayer = useApp((s) => s.activeLayer);
  const keys = preset.layers[activeLayer]?.keys ?? [];

  const target = poseForState({ connection, selectedSlot, panelCollapsed });
  const [pose, setPose] = useState<PoseId>(target);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [front, setFront] = useState<Slot>(0);
  const [stillOn, setStillOn] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);
  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);
  const still = useRef<HTMLImageElement>(null);
  const frontRef = useRef<Slot>(0);
  const tokenRef = useRef(0);
  const videoOf = (s: Slot) => (s === 0 ? videoA : videoB).current;

  const poseData = useMemo(
    () => manifest.poses.find((p) => p.id === pose) ?? manifest.poses[0],
    [manifest, pose],
  );

  // aquece o acervo: stills decodificados em memória e clipes no cache HTTP,
  // para a primeira transição não esperar rede
  useEffect(() => {
    const held = manifest.poses.map((p) => {
      const img = new Image();
      img.src = assetUrl(manifest, p.still.beauty);
      void img.decode().catch(() => {});
      return img;
    });
    for (const c of manifest.clips) void fetch(assetUrl(manifest, c.file)).catch(() => {});
    return () => void held.splice(0);
  }, [manifest]);

  const start = useCallback((plan: ClipStep[], at = 0) => {
    const [step, ...rest] = plan;
    if (!step) return false;
    const token = ++tokenRef.current;
    const slot: Slot = frontRef.current === 0 ? 1 : 0;
    setPlaying({ clip: step.clip, plan: rest, startAt: at, slot, token });
    return true;
  }, []);

  // alvo mudou → planeja
  useEffect(() => {
    if (target === pose && !playing) return;
    if (!playing) {
      const plan = route(manifest, pose, target);
      if (!plan || plan.length === 0) {
        setPose(target); // sem clipe: corta (o still só troca depois de decodificado)
        return;
      }
      start(plan);
      return;
    }
    // já está tocando: continua ou rebobina. Se o plano atual já chega no alvo
    // (ex.: edit→top→knob), não mexe — reescrever `playing` aqui realimenta o
    // efeito e atropela o próximo clipe quando o atual termina.
    const destination = playing.plan.at(-1)?.clip.to ?? playing.clip.to;
    if (destination === target) return;
    const decision = reroute(manifest, { clip: playing.clip }, target);
    if (!decision) return;
    if (decision.kind === "continue") {
      setPlaying({ ...playing, plan: decision.plan });
    } else {
      const t = videoOf(playing.slot)?.currentTime ?? 0;
      start([{ clip: decision.clip }, ...decision.plan], mirrorTime(playing.clip, t));
    }
    // videoOf lê refs; não entra nas dependências
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, pose, playing, manifest, start]);

  // toca o clipe no vídeo escondido; só o revela quando o 1º frame existe
  const playingToken = playing?.token;
  useEffect(() => {
    if (!playing) return;
    const el = videoOf(playing.slot);
    if (!el) return;
    const { slot, token } = playing;
    let done = false;
    const reveal = () => {
      if (done || tokenRef.current !== token) return;
      done = true;
      const other = videoOf(slot === 0 ? 1 : 0);
      frontRef.current = slot;
      setFront(slot);
      setStillOn(false);
      other?.pause();
    };
    el.src = assetUrl(manifest, playing.clip.file);
    el.currentTime = playing.startAt;
    el.play().then(
      () => {
        if (typeof el.requestVideoFrameCallback === "function") el.requestVideoFrameCallback(reveal);
        // rede de segurança: alguns WebViews não chamam o callback em vídeo invisível
        setTimeout(reveal, 150);
      },
      () => {
        // sem codec (Windows N, WebView sem Media Foundation): corta para o destino
        if (tokenRef.current !== token) return;
        setPose(playing.clip.to);
        setPlaying(null);
      },
    );
    return () => {
      done = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingToken, manifest]);

  const onEnded = (slot: Slot) => {
    if (!playing || playing.slot !== slot) return; // fim de um clipe já abandonado
    setPose(playing.clip.to);
    // encadeado (via hub): o último frame fica na tela até o próximo clipe pintar
    if (!start(playing.plan)) setPlaying(null);
  };

  // em repouso: o still entra por cima do vídeo parado, só depois de decodificado
  useEffect(() => {
    if (playing || stillOn) return;
    const img = still.current;
    if (!img) return;
    let alive = true;
    img
      .decode()
      .catch(() => {})
      .then(() => alive && setStillOn(true));
    return () => {
      alive = false;
    };
  }, [playing, stillOn, pose]);

  useEffect(() => {
    document.body.style.cursor = hovered !== null ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  const clickable = interactive && !playing && stillOn;
  const onSelect = (slot: number) =>
    selectSlot(panelCollapsed ? slot : selectedSlot === slot ? null : slot);

  const videoProps = (slot: Slot) => ({
    ref: slot === 0 ? videoA : videoB,
    muted: true,
    playsInline: true,
    preload: "auto" as const,
    onEnded: () => onEnded(slot),
    className: "absolute inset-0 h-full w-full object-cover",
    // sem `filter`: medido no Chrome, vídeo e still diferem ~0,3% de brilho
    style: { opacity: front === slot ? 1 : 0 },
  });

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b0b0d]" onMouseLeave={() => setHovered(null)}>
      {/* o render cobre a tela: quem tira o pad de baixo do drawer é o clipe */}
      <div className="absolute inset-0">
        <video {...videoProps(0)} />
        <video {...videoProps(1)} />
        <img
          ref={still}
          src={assetUrl(manifest, poseData.still.beauty)}
          alt=""
          draggable={false}
          decoding="sync"
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: stillOn ? 1 : 0,
            transition: `opacity ${stillOn ? STILL_IN_MS : STILL_OUT_MS}ms ease`,
          }}
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
    </div>
  );
}

// ── Overlay: o dado por cima do mundo ───────────────────────────────────────

function usable(pose: CinematicPose, a: SlotAnchor): boolean {
  if (!a.visible) return false;
  if (SLOT_LAYOUT[a.slot]?.role === "logo") return false;
  // com o drawer aberto, o que está embaixo dele não é clicável
  return pose.drawer === "closed" || a.center[0] * APP_W < APP_W - DRAWER_W;
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
  const selectedAnchor = anchors.find((a) => a.slot === selected) ?? null;

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
              stroke={isHov && !isSel ? HOVER : "none"}
              strokeWidth={2}
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
        {selectedAnchor && <SelectionOutline quad={selectedAnchor.quad} />}
      </svg>

      {tip && <Tooltip anchor={tip} kc={keycodeOf(tip.slot)} />}
    </>
  );
}

type Quad = SlotAnchor["quad"];
const SELECT_MS = 320;

/**
 * Contorno de seleção. Trocar de tecla não tem clipe (as duas estão na mesma
 * pose), então o movimento vem daqui: o quad desliza e se deforma da tecla
 * anterior até a nova. Sem seleção anterior, nasce com um leve "assentar".
 */
function SelectionOutline({ quad }: { quad: Quad }) {
  const [shape, setShape] = useState<Quad>(quad);
  const [born, setBorn] = useState(false);
  const current = useRef<Quad>(quad);

  useEffect(() => {
    const from = current.current;
    if (from === quad) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / SELECT_MS);
      const e = 1 - Math.pow(1 - u, 3); // ease-out cúbico
      const next = quad.map(([x, y], i) => [from[i][0] + (x - from[i][0]) * e, from[i][1] + (y - from[i][1]) * e]) as Quad;
      current.current = u < 1 ? next : quad;
      setShape(current.current);
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [quad]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBorn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const cx = (shape[0][0] + shape[2][0]) / 2;
  const cy = (shape[0][1] + shape[2][1]) / 2;
  return (
    <polygon
      points={shape.map(([x, y]) => `${x * STAGE_W},${y * STAGE_H}`).join(" ")}
      fill="rgba(255,159,10,.06)"
      stroke={SELECT}
      strokeWidth={3}
      strokeLinejoin="round"
      pointerEvents="none"
      style={{
        transformOrigin: `${cx * STAGE_W}px ${cy * STAGE_H}px`,
        transform: born ? "scale(1)" : "scale(1.12)",
        opacity: born ? 1 : 0,
        transition: "transform 260ms cubic-bezier(0.22,0.8,0.24,1), opacity 180ms ease",
      }}
    />
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
