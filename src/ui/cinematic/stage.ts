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

/**
 * Palco do render = a tela inteira. Header e footer flutuam por cima (V 2.0),
 * então o acervo é renderizado em APP_W×APP_H e as âncoras normalizadas do
 * manifest valem direto em px de tela. (O acervo v1 era 1440×776, entre as
 * barras, e o app ampliava e cortava para cobrir a altura.)
 */
export const STAGE_W = APP_W;
export const STAGE_H = APP_H;

/** Drawer de edição. No modo cinematográfico ele passa POR CIMA do palco. */
export const DRAWER_W = 668;
export const DRAWER_FRAC = DRAWER_W / APP_W;

/** Barras da UI (Figma V 2.0: header e footer de 57px), por cima do render. */
export const CHROME_H = 57;

/** Duração/curva do drawer: casada com o clipe top→edit (20 frames = 0,667 s). */
export const DRAWER_MS = 667;
export const DRAWER_EASE = "cubic-bezier(0.22, 0.8, 0.24, 1)";

/** Escala para caber na janela mantendo a proporção (letterbox). */
export function fitScale(viewportW: number, viewportH: number): number {
  return Math.min(viewportW / APP_W, viewportH / APP_H);
}
