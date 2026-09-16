import { useEffect, useState, type ReactNode } from "react";
import { APP_H, APP_W, fitScale } from "./cinematic/stage.ts";

/**
 * O app inteiro vive numa caixa de tamanho fixo (1440×900) escalada para caber
 * na janela, com tarja escura em volta. É o que garante que o enquadramento do
 * acervo pré-renderizado bata com a tela em qualquer monitor.
 *
 * Usa `transform: scale` (não `zoom`): o browser transforma as coordenadas de
 * ponteiro junto, então clique e hover continuam caindo no lugar certo.
 *
 * CUIDADO ao mexer em componentes daqui para dentro:
 *  - `vh`/`vw` passam a se referir ao viewport, não à caixa — use px.
 *  - `position: fixed` se ancora nesta caixa (ancestral com transform), não no
 *    viewport. Modais e popovers têm que usar `absolute`.
 */
export function FixedFrame({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(() =>
    typeof window === "undefined" ? 1 : fitScale(window.innerWidth, window.innerHeight),
  );

  useEffect(() => {
    const onResize = () => setScale(fitScale(window.innerWidth, window.innerHeight));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-[#07070a]">
      <div
        style={{
          width: APP_W,
          height: APP_H,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
