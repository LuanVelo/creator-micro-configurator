import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Html, Lightformer, Outlines, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useApp, selectActivePreset } from "../../store/app.ts";
import { SLOT_LAYOUT, layerColor } from "../../model/layout.ts";
import { actionLabelFor, keyLabel } from "../labels.ts";
import { labelTexture } from "./labelTexture.ts";
import {
  FLOOR_Y,
  KEYCAP_TOP,
  KNOB_PARTS,
  MODEL_URL,
  PAD_TILT,
  PEEK,
  SMILEY_HIT,
  WHEEL_PARTS,
  fitDistance,
  keycapNodeName,
  orbitPosition,
  poseFor,
  type CameraPose,
} from "./parts.ts";

/**
 * Pad 3D (v0) — alternativa ao KeyboardRender (SVG), mesmo store e mesmo
 * comportamento: hover → tooltip, clique → seleciona o slot e abre o drawer.
 * Asset: public/models/creator-micro.glb (3d/scripts/export_glb.py).
 *
 * Câmera por ESTADO, não órbita livre: hero (desconectado) → edição (conectado)
 * → close no encoder selecionado. Arrastar só "espia" dentro de PEEK e volta.
 * frameloop="demand": só renderiza enquanto algo anima.
 */

const SELECTED = "#3b82f6"; // --color-key-selected
const HOVER = "#94a3b8";
const LABEL_PLANE = new THREE.PlaneGeometry(13, 13);
const SMOOTH = 7; // lambda do damp (maior = mais rápido)

/** dt limitado: no frameloop demand o primeiro frame depois de ocioso vem com dt enorme. */
const step = (dt: number) => Math.min(dt, 1 / 30);

export function Keyboard3D({
  interactive = true,
  fallback,
}: {
  interactive?: boolean;
  fallback: ReactNode;
}) {
  return (
    <WebGLBoundary fallback={fallback}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping }}
        camera={{ fov: 22, near: 1, far: 5000, position: [0, 400, 200] }}
      >
        <Suspense fallback={null}>
          <Scene interactive={interactive} />
        </Suspense>
        {import.meta.env.DEV && <DevCapture />}
      </Canvas>
    </WebGLBoundary>
  );
}

useGLTF.preload(MODEL_URL);

// ── Cena ────────────────────────────────────────────────────────────────────

function Scene({ interactive }: { interactive: boolean }) {
  const { scene, nodes } = useGLTF(MODEL_URL);
  const { activeLayer, selectedSlot, selectSlot, panelCollapsed } = useApp();
  const preset = useApp(selectActivePreset);
  const keys = preset.layers[activeLayer]?.keys ?? [];
  const [hovered, setHovered] = useState<number | null>(null);
  const invalidate = useThree((s) => s.invalidate);

  // desconectado não tem hover/seleção
  const hoverSlot = interactive ? hovered : null;
  const selSlot = interactive ? selectedSlot : null;

  const caseMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#eef1f6",
        roughness: 0.55,
        transparent: true,
        opacity: 0.78,
      }),
    [],
  );

  // Tudo que não é clicável vira um bloco estático; materiais caros trocados por
  // versões baratas (transmission real = passe extra de render, §6 do 3d/CLAUDE.md).
  const staticScene = useMemo(() => {
    const root = scene.clone(true);
    const drop: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (isInteractiveNode(o.name)) drop.push(o);
    });
    drop.forEach((o) => o.removeFromParent());
    const clearMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.1,
      transparent: true,
      opacity: 0.35,
    });
    const encoderMat = new THREE.MeshStandardMaterial({ color: "#2a2a2c", roughness: 0.45, metalness: 0.6 });
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.name === "frame_frosted") mesh.material = caseMat;
      else if (mat.name === "plastic_clear") mesh.material = clearMat;
      else if (mat.name.startsWith("enc_")) mesh.material = encoderMat; // encoder ainda sem material real
      else if (mat.name === "plate_white_gloss") mesh.material = plateMaterial(mat);
    });
    return root;
  }, [scene, caseMat]);

  // underglow: o case difusor tinge com a cor da layer quando conectado
  const glowTarget = useMemo(() => new THREE.Color(), []);
  useFrame((_, dt) => {
    glowTarget.set(interactive ? layerColor(activeLayer) : "#000000");
    const k = 1 - Math.exp(-SMOOTH * step(dt));
    caseMat.emissive.lerp(glowTarget, k);
    caseMat.emissiveIntensity = 0.32;
    const e = caseMat.emissive;
    if (Math.abs(e.r - glowTarget.r) + Math.abs(e.g - glowTarget.g) + Math.abs(e.b - glowTarget.b) > 0.004) {
      invalidate();
    }
  });

  // cursor de "clicável"
  useEffect(() => {
    document.body.style.cursor = hoverSlot !== null ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hoverSlot]);

  const meshesOf = (names: readonly string[]) =>
    names.map((n) => nodes[n]).filter((o): o is THREE.Mesh => !!o && (o as THREE.Mesh).isMesh);

  const handlersFor = (slot: number) =>
    interactive
      ? {
          onOver: () => setHovered(slot),
          onOut: () => setHovered((h) => (h === slot ? null : h)),
          // mesma regra do SVG: drawer fechado sempre abre; aberto alterna
          onSelect: () =>
            selectSlot(panelCollapsed ? slot : selectedSlot === slot ? null : slot),
        }
      : undefined;

  return (
    <>
      <CameraRig pose={poseFor(interactive, selSlot)} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[-150, 300, 220]} intensity={2.2} />
      <directionalLight position={[220, 160, -200]} intensity={0.5} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.6} position={[0, 320, 0]} rotation-x={Math.PI / 2} scale={[500, 500, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-320, 120, 260]} scale={[300, 200, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.5} position={[320, 100, -260]} scale={[300, 200, 1]} target={[0, 0, 0]} />
      </Environment>

      <group rotation-x={PAD_TILT}>
        <primitive object={staticScene} />

        {SLOT_LAYOUT.filter((s) => s.role === "key").map((s) => {
          const kc = keys[s.index] ?? "KC_NO";
          return (
            <Part
              key={s.index}
              meshes={meshesOf([keycapNodeName(s.index)!])}
              label={keyLabel(kc)}
              hovered={hoverSlot === s.index}
              selected={selSlot === s.index}
              handlers={handlersFor(s.index)}
            />
          );
        })}
        <Part
          meshes={meshesOf(WHEEL_PARTS)}
          hovered={hoverSlot === 0}
          selected={selSlot === 0}
          handlers={handlersFor(0)}
          lift={false}
        />
        <Part
          meshes={meshesOf(KNOB_PARTS)}
          hovered={hoverSlot === 3}
          selected={selSlot === 3}
          handlers={handlersFor(3)}
          lift={false}
        />
        <SmileyHit
          hovered={hoverSlot === SMILEY_HIT.slot}
          selected={selSlot === SMILEY_HIT.slot}
          handlers={handlersFor(SMILEY_HIT.slot)}
        />

        {hoverSlot !== null && (
          <Tooltip position={tooltipAnchor(hoverSlot, nodes)} kc={keys[hoverSlot] ?? "KC_NO"} />
        )}
      </group>

      <ContactShadows position={[0, FLOOR_Y, 0]} opacity={0.35} scale={240} blur={2.4} far={40} resolution={512} color="#0f172a" />
    </>
  );
}

/**
 * No Blender a serigrafia é uma MÁSCARA (alfa → mix branco/tinta no shader); o
 * exporter manda o PNG cru como baseColor e a placa sai preta. Enquanto não há
 * bake (3d/CLAUDE.md §6), compõe aqui: fundo branco + tinta pelo alfa.
 */
function plateMaterial(src: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.28, metalness: 0 });
  const img = src.map?.image as CanvasImageSource & { width: number; height: number } | undefined;
  if (img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ededed"; // branco 0,85 linear → sRGB
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = src.map!.flipY;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    mat.map = tex;
  }
  return mat;
}

function isInteractiveNode(name: string): boolean {
  return (
    /^keycap_r\dc\d$/.test(name) ||
    (WHEEL_PARTS as readonly string[]).includes(name) ||
    (KNOB_PARTS as readonly string[]).includes(name)
  );
}

// ── Peça clicável (keycap, roda, knob) ──────────────────────────────────────

interface PartHandlers {
  onOver: () => void;
  onOut: () => void;
  onSelect: () => void;
}

function Part({
  meshes,
  label,
  hovered,
  selected,
  handlers,
  lift = true,
}: {
  meshes: THREE.Mesh[];
  label?: string;
  hovered: boolean;
  selected: boolean;
  handlers?: PartHandlers;
  lift?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const pressedUntil = useRef(0);
  const invalidate = useThree((s) => s.invalidate);

  // material próprio por peça (a cor da tecla vai ser dirigida por JS — nunca assada)
  const materials = useMemo(
    () => meshes.map((m) => (m.material as THREE.Material).clone()),
    [meshes],
  );

  // tinta emissiva: lê mesmo quando o contorno fica escondido atrás da vizinha
  useEffect(() => {
    for (const m of materials as THREE.MeshStandardMaterial[]) {
      m.emissive.set(selected ? SELECTED : hovered ? HOVER : "#000000");
      m.emissiveIntensity = selected ? 0.35 : hovered ? 0.12 : 0;
    }
    invalidate();
  }, [materials, hovered, selected, label, invalidate]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const pressed = performance.now() < pressedUntil.current;
    // hover/seleção: tecla sobe 0,8 mm; clique: afunda como no real
    const target = pressed ? -1.4 : lift && (hovered || selected) ? 0.8 : 0;
    const k = 1 - Math.exp(-18 * step(dt));
    g.position.y += (target - g.position.y) * k;
    if (pressed || Math.abs(g.position.y - target) > 0.01) invalidate();
  });

  const events = handlers && {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      handlers.onOver();
    },
    onPointerOut: () => handlers.onOut(),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.delta > 4) return; // foi arrasto (espiar), não clique
      pressedUntil.current = performance.now() + 110;
      invalidate();
      handlers.onSelect();
    },
  };

  // contorno só no keycap (lift=true): na roda serrilhada e no knob o casco
  // invertido fica grosso/serrilhado — lá basta a tinta emissiva.
  const outline = lift ? (selected ? SELECTED : hovered ? HOVER : null) : null;

  return (
    <group ref={group} {...events}>
      {meshes.map((m, i) => (
        <mesh
          key={m.name}
          geometry={m.geometry}
          material={materials[i]}
          position={m.position}
          quaternion={m.quaternion}
        >
          {outline && <Outlines thickness={selected ? 0.7 : 0.35} color={outline} />}
        </mesh>
      ))}
      {label && meshes[0] && (
        <mesh
          geometry={LABEL_PLANE}
          position={[meshes[0].position.x, meshes[0].position.y + KEYCAP_TOP + 0.02, meshes[0].position.z]}
          rotation-x={-Math.PI / 2}
          raycast={() => null}
        >
          <meshBasicMaterial
            map={labelTexture(label)}
            transparent
            depthWrite={false}
            toneMapped={false}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      )}
    </group>
  );
}

/** Smiley = serigrafia, sem malha: área invisível + anel no hover/seleção. */
function SmileyHit({
  hovered,
  selected,
  handlers,
}: {
  hovered: boolean;
  selected: boolean;
  handlers?: PartHandlers;
}) {
  const [x, y, z] = SMILEY_HIT.position;
  const ring = selected ? SELECTED : hovered ? HOVER : null;
  return (
    <group>
      <mesh
        position={SMILEY_HIT.position}
        onPointerOver={handlers && ((e) => (e.stopPropagation(), handlers.onOver()))}
        onPointerOut={handlers && (() => handlers.onOut())}
        onClick={handlers && ((e) => (e.stopPropagation(), e.delta <= 4 && handlers.onSelect()))}
      >
        <boxGeometry args={SMILEY_HIT.size} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      {ring && (
        <mesh position={[x, y - 0.45, z]} rotation-x={-Math.PI / 2} raycast={() => null}>
          <ringGeometry args={[6.6, selected ? 7.6 : 7.1, 64]} />
          <meshBasicMaterial color={ring} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

// ── Tooltip ─────────────────────────────────────────────────────────────────

function tooltipAnchor(slot: number, nodes: Record<string, THREE.Object3D>): [number, number, number] {
  if (slot === 0) return [-27, 24, -30.3];
  if (slot === 3) return [27, 34, -30.3];
  if (slot === SMILEY_HIT.slot) return [27, 14, 23.7];
  const n = nodes[keycapNodeName(slot) ?? ""];
  return n ? [n.position.x, n.position.y + KEYCAP_TOP + 10, n.position.z] : [0, 30, 0];
}

function Tooltip({ position, kc }: { position: [number, number, number]; kc: string }) {
  const label = actionLabelFor(kc) ?? keyLabel(kc);
  const text = label ? `${label} · ${kc}` : kc;
  return (
    <Html position={position} center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
      <div className="whitespace-nowrap rounded-md bg-slate-900/90 px-2 py-1 text-[11px] font-medium text-slate-50 shadow">
        {text}
      </div>
    </Html>
  );
}

// ── Câmera ──────────────────────────────────────────────────────────────────

function CameraRig({ pose }: { pose: CameraPose }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const cur = useRef({
    target: new THREE.Vector3(...pose.target),
    az: pose.az,
    el: pose.el,
    radius: pose.radius,
    shiftY: pose.shiftY,
  });
  const peek = useRef({ az: 0, el: 0, dragging: false, x: 0, y: 0 });
  const goal = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => invalidate(), [pose, size, invalidate]);

  // arrastar = espiar (limitado), solta = volta sozinho
  useEffect(() => {
    const el = gl.domElement;
    const p = peek.current;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      p.dragging = true;
      p.x = e.clientX;
      p.y = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!p.dragging) return;
      p.az = THREE.MathUtils.clamp(p.az - (e.clientX - p.x) * 0.25, -PEEK.az, PEEK.az);
      p.el = THREE.MathUtils.clamp(p.el + (e.clientY - p.y) * 0.2, -PEEK.elDown, PEEK.elUp);
      p.x = e.clientX;
      p.y = e.clientY;
      invalidate();
    };
    const up = () => {
      p.dragging = false;
      invalidate();
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl, invalidate]);

  useFrame((_, rawDt) => {
    const dt = step(rawDt);
    const c = cur.current;
    const p = peek.current;
    const k = 1 - Math.exp(-SMOOTH * 0.6 * dt);

    goal.set(...pose.target);
    c.target.lerp(goal, k);
    c.az += (pose.az - c.az) * k;
    c.el += (pose.el - c.el) * k;
    c.radius += (pose.radius - c.radius) * k;
    c.shiftY += (pose.shiftY - c.shiftY) * k;
    if (!p.dragging) {
      const kb = 1 - Math.exp(-SMOOTH * dt);
      p.az -= p.az * kb;
      p.el -= p.el * kb;
    }

    const dist = fitDistance(c.radius, camera.fov, size.width / size.height);
    const el = THREE.MathUtils.clamp(c.el + p.el, 8, 89);
    camera.position.set(...orbitPosition([c.target.x, c.target.y, c.target.z], c.az + p.az, el, dist));
    camera.lookAt(c.target);
    if (Math.abs(c.shiftY) > 1e-4) {
      camera.setViewOffset(size.width, size.height, 0, c.shiftY * size.height, size.width, size.height);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();

    const moving =
      c.target.distanceTo(goal) > 0.05 ||
      Math.abs(pose.az - c.az) > 0.05 ||
      Math.abs(pose.el - c.el) > 0.05 ||
      Math.abs(pose.radius - c.radius) > 0.05 ||
      Math.abs(pose.shiftY - c.shiftY) > 1e-4 ||
      Math.abs(p.az) > 0.05 ||
      Math.abs(p.el) > 0.05;
    if (moving) invalidate();
  });

  return null;
}

// ── Dev ─────────────────────────────────────────────────────────────────────

/**
 * Só em dev, para screenshots em navegadores que não compõem o canvas.
 * Ferramentas de automação rodam num "isolated world": o `detail` de um
 * CustomEvent não atravessa, então o payload vai em `<html data-k3d="…">` (JSON):
 *  - evento `k3d:state` → `useApp.setState(payload)` (pré-seleciona estado)
 *  - evento `k3d:shoot` → renderiza e lê o frame na MESMA tarefa (sem
 *    preserveDrawingBuffer) e faz POST do dataURL para `payload.url`.
 */
function DevCapture() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const payload = () => JSON.parse(document.documentElement.dataset.k3d ?? "{}");
    const onState = () => useApp.setState(payload());
    const onShoot = () => {
      gl.render(scene, camera);
      const data = gl.domElement.toDataURL("image/png");
      void fetch(payload().url, { method: "POST", body: data });
    };
    window.addEventListener("k3d:state", onState);
    window.addEventListener("k3d:shoot", onShoot);
    return () => {
      window.removeEventListener("k3d:state", onState);
      window.removeEventListener("k3d:shoot", onShoot);
    };
  }, [gl, scene, camera]);
  return null;
}

// ── Fallback ────────────────────────────────────────────────────────────────

/** Sem WebGL (ou o glb falhou): cai no SVG em vez de tela vazia. */
class WebGLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[Keyboard3D] caiu no SVG:", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
