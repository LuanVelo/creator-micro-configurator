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

/**
 * Na janela própria (`npm run app`, Chrome em modo app) a barra de título come
 * parte da altura pedida em --window-size. Corrige pela diferença real entre
 * janela e área útil, para o app rodar em 1:1 — sem escala, sem tarja. Num
 * navegador comum não faz nada (o Chrome ignora resizeTo em janelas com abas).
 */
export function fitWindowToApp() {
  if (typeof window === "undefined") return;
  if (new URLSearchParams(window.location.search).get("window") !== "app") return;
  const fit = () => {
    const dw = APP_W - window.innerWidth;
    const dh = APP_H - window.innerHeight;
    if (dw === 0 && dh === 0) return;
    window.resizeTo(window.outerWidth + dw, window.outerHeight + dh);
  };
  if (document.readyState === "complete") fit();
  else window.addEventListener("load", fit, { once: true });
}
