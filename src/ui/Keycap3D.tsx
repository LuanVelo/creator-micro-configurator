import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as THREE from "three";

/**
 * Keycap 3D interativo (topo do drawer, node 50:627). 3D real via R3F: keycap
 * escuro fosco, luz + contact shadow, arrastar-pra-girar. Sem assets externos
 * (nada de HDR/fonte de CDN) — a geometria e a luz são geradas em runtime.
 */

/** Keycap = RoundedBox afinado no topo (frustum de cantos macios), estilo tecla. */
function keycapGeometry(): THREE.BufferGeometry {
  const geo = new RoundedBoxGeometry(1, 0.62, 1, 6, 0.09);
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const yMin = bb.min.y;
  const yMax = bb.max.y;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y - yMin) / (yMax - yMin); // 0 na base, 1 no topo
    const taper = THREE.MathUtils.lerp(1, 0.74, t); // topo mais estreito
    pos.setX(i, pos.getX(i) * taper);
    pos.setZ(i, pos.getZ(i) * taper);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function Cap({ color }: { color: string }) {
  const geometry = useMemo(keycapGeometry, []);
  const ref = useRef<THREE.Mesh>(null);
  return (
    <mesh ref={ref} geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.62} metalness={0.08} />
    </mesh>
  );
}

export function Keycap3D({
  color = "#303036",
  className = "",
}: {
  color?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [-1.7, 1.7, 3.1], fov: 32 }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 6, 4]} intensity={1.5} />
        <directionalLight position={[-4, 2, -3]} intensity={0.35} />

        <group position={[0, 0.06, 0]}>
          <Cap color={color} />
        </group>

        <ContactShadows
          position={[0, -0.34, 0]}
          opacity={0.38}
          scale={5}
          blur={2.6}
          far={2}
          resolution={512}
          color="#0f172a"
        />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={0.55}
          maxPolarAngle={1.35}
          rotateSpeed={0.7}
        />
      </Canvas>
    </div>
  );
}
