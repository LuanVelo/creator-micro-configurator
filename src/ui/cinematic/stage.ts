/**
 * Medidas canônicas do app. O modo cinematográfico é imagem pré-renderizada:
 * o enquadramento do render só bate com a tela se a tela tiver tamanho fixo.
 * Por isso o app inteiro vive numa caixa de 1440×900 escalada para caber na
 * janela (ver FixedFrame.tsx).
 *
 * Mudar qualquer número aqui obriga a re-renderizar o acervo inteiro. O script
 * `3d/scripts/poses.py` carrega os mesmos valores e o manifest registra o que
 * foi usado — o teste compara os dois.
 */
export const APP_W = 1440;
export const APP_H = 900;

export const HEADER_H = 64;
export const FOOTER_H = 60;

/** Área do pad: largura cheia, entre header e footer. */
export const STAGE_W = APP_W;
export const STAGE_H = APP_H - HEADER_H - FOOTER_H; // 776

/** Drawer de edição. No modo cinematográfico ele passa POR CIMA do palco. */
export const DRAWER_W = 668;
export const DRAWER_FRAC = DRAWER_W / APP_W;

/**
 * Barras da UI (Figma V 2.0: header e footer de 57px). Desde a V 2.0 elas
 * FLUTUAM por cima do render, que ocupa a tela inteira — não confundir com
 * HEADER_H/FOOTER_H acima, que ainda definem a resolução do acervo atual.
 */
export const CHROME_H = 57;

/**
 * Caixa do render na tela. O acervo foi renderizado para STAGE_W×STAGE_H
 * (entre as barras); agora cobre a tela inteira pela altura, sobrando largura.
 * Img, vídeo e overlay vivem dentro dessa caixa, então as âncoras normalizadas
 * do manifest continuam valendo sem conversão.
 *
 * A sobra horizontal é cortada de um jeito com o drawer fechado (centrado) e de
 * outro com ele aberto (enquadramento do node 75:688, pad inteiro à esquerda do
 * drawer). A caixa desliza entre os dois junto com o clipe. Quando o acervo for
 * re-renderizado em APP_W×APP_H, isso tudo vira left = 0.
 */
export const RENDER_H = APP_H;
export const RENDER_W = Math.round((STAGE_W * APP_H) / STAGE_H);
export const RENDER_X_CLOSED = Math.round((APP_W - RENDER_W) / 2);
export const RENDER_X_OPEN = -45;

/** x normalizado do render → px na tela, com o drawer aberto. */
export function renderXOpen(x: number): number {
  return RENDER_X_OPEN + x * RENDER_W;
}

/** Duração/curva do drawer: casada com o clipe top→edit (0,6 s). */
export const DRAWER_MS = 600;
export const DRAWER_EASE = "cubic-bezier(0.22, 0.8, 0.24, 1)";

/** Escala para caber na janela mantendo a proporção (letterbox). */
export function fitScale(viewportW: number, viewportH: number): number {
  return Math.min(viewportW / APP_W, viewportH / APP_H);
}
