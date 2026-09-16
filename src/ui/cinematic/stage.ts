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

/** Escala para caber na janela mantendo a proporção (letterbox). */
export function fitScale(viewportW: number, viewportH: number): number {
  return Math.min(viewportW / APP_W, viewportH / APP_H);
}
