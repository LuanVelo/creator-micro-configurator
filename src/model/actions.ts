/**
 * Catálogo de ações por aplicativo. O usuário escolhe o software e depois a
 * funcionalidade — a gente traduz para o keycode. Notação Mac (⌘⌥⇧⌃); a Fase 2
 * (detecção de SO) remapeia p/ Win. Só ações que resolvem para keycode direto.
 */
export type AppIconKey =
  | "figma"
  | "photoshop"
  | "illustrator"
  | "blender"
  | "basic"
  | "system";

export interface ActionDef {
  id: string;
  label: string;
  keycode: string;
  hint?: string;
}

export interface AppCatalog {
  app: string;
  icon: AppIconKey;
  actions: ActionDef[];
}

export const ACTION_CATALOG: AppCatalog[] = [
  {
    app: "Figma",
    icon: "figma",
    actions: [
      { id: "fig-move", label: "Mover", keycode: "KC_V", hint: "V" },
      { id: "fig-frame", label: "Frame", keycode: "KC_F", hint: "F" },
      { id: "fig-rect", label: "Retângulo", keycode: "KC_R", hint: "R" },
      { id: "fig-ellipse", label: "Elipse", keycode: "KC_O", hint: "O" },
      { id: "fig-line", label: "Linha", keycode: "KC_L", hint: "L" },
      { id: "fig-pen", label: "Caneta", keycode: "KC_P", hint: "P" },
      { id: "fig-text", label: "Texto", keycode: "KC_T", hint: "T" },
      { id: "fig-hand", label: "Mão (pan)", keycode: "KC_H", hint: "H" },
      { id: "fig-comment", label: "Comentário", keycode: "KC_C", hint: "C" },
      { id: "fig-scale", label: "Escala", keycode: "KC_K", hint: "K" },
      { id: "fig-copy", label: "Copiar", keycode: "G(KC_C)", hint: "⌘C" },
      { id: "fig-cut", label: "Recortar", keycode: "G(KC_X)", hint: "⌘X" },
      { id: "fig-paste", label: "Colar", keycode: "G(KC_V)", hint: "⌘V" },
      { id: "fig-dup", label: "Duplicar", keycode: "G(KC_D)", hint: "⌘D" },
      { id: "fig-selall", label: "Selecionar tudo", keycode: "G(KC_A)", hint: "⌘A" },
      { id: "fig-undo", label: "Desfazer", keycode: "G(KC_Z)", hint: "⌘Z" },
      { id: "fig-redo", label: "Refazer", keycode: "LSG(KC_Z)", hint: "⇧⌘Z" },
      { id: "fig-del", label: "Deletar", keycode: "KC_BSPC", hint: "⌫" },
      { id: "fig-group", label: "Agrupar", keycode: "G(KC_G)", hint: "⌘G" },
      { id: "fig-ungroup", label: "Desagrupar", keycode: "LSG(KC_G)", hint: "⇧⌘G" },
      { id: "fig-component", label: "Criar componente", keycode: "LAG(KC_K)", hint: "⌥⌘K" },
      { id: "fig-detach", label: "Destacar instância", keycode: "LAG(KC_B)", hint: "⌥⌘B" },
      { id: "fig-flatten", label: "Achatar", keycode: "G(KC_E)", hint: "⌘E" },
      { id: "fig-front", label: "Trazer p/ frente", keycode: "G(KC_RBRC)", hint: "⌘]" },
      { id: "fig-back", label: "Enviar p/ trás", keycode: "G(KC_LBRC)", hint: "⌘[" },
      { id: "fig-al-left", label: "Alinhar à esquerda", keycode: "A(KC_A)", hint: "⌥A" },
      { id: "fig-al-right", label: "Alinhar à direita", keycode: "A(KC_D)", hint: "⌥D" },
      { id: "fig-al-top", label: "Alinhar ao topo", keycode: "A(KC_W)", hint: "⌥W" },
      { id: "fig-al-bottom", label: "Alinhar à base", keycode: "A(KC_S)", hint: "⌥S" },
      { id: "fig-al-ch", label: "Centralizar horizontal", keycode: "A(KC_H)", hint: "⌥H" },
      { id: "fig-al-cv", label: "Centralizar vertical", keycode: "A(KC_V)", hint: "⌥V" },
      { id: "fig-dist-h", label: "Distribuir horizontal", keycode: "LCA(KC_H)", hint: "⌃⌥H" },
      { id: "fig-dist-v", label: "Distribuir vertical", keycode: "LCA(KC_V)", hint: "⌃⌥V" },
      { id: "fig-tidy", label: "Organizar (tidy up)", keycode: "LCA(KC_T)", hint: "⌃⌥T" },
      { id: "fig-zoom100", label: "Zoom 100%", keycode: "S(KC_0)", hint: "⇧0" },
      { id: "fig-zoomfit", label: "Ajustar à tela", keycode: "S(KC_1)", hint: "⇧1" },
      { id: "fig-zoomsel", label: "Zoom na seleção", keycode: "S(KC_2)", hint: "⇧2" },
      { id: "fig-ui", label: "Alternar UI", keycode: "G(KC_BSLS)", hint: "⌘\\" },
      { id: "fig-pixel", label: "Pixel preview", keycode: "LCA(KC_P)", hint: "⌃⌥P" },
      { id: "fig-bold", label: "Negrito", keycode: "G(KC_B)", hint: "⌘B" },
      { id: "fig-italic", label: "Itálico", keycode: "G(KC_I)", hint: "⌘I" },
      { id: "fig-underline", label: "Sublinhado", keycode: "G(KC_U)", hint: "⌘U" },
    ],
  },
  {
    app: "Photoshop",
    icon: "photoshop",
    actions: [
      { id: "ps-move", label: "Mover", keycode: "KC_V", hint: "V" },
      { id: "ps-marquee", label: "Seleção retangular", keycode: "KC_M", hint: "M" },
      { id: "ps-lasso", label: "Laço", keycode: "KC_L", hint: "L" },
      { id: "ps-quickselect", label: "Seleção rápida", keycode: "KC_W", hint: "W" },
      { id: "ps-crop", label: "Corte", keycode: "KC_C", hint: "C" },
      { id: "ps-eyedropper", label: "Conta-gotas", keycode: "KC_I", hint: "I" },
      { id: "ps-brush", label: "Pincel", keycode: "KC_B", hint: "B" },
      { id: "ps-clone", label: "Carimbo", keycode: "KC_S", hint: "S" },
      { id: "ps-eraser", label: "Borracha", keycode: "KC_E", hint: "E" },
      { id: "ps-gradient", label: "Gradiente", keycode: "KC_G", hint: "G" },
      { id: "ps-text", label: "Texto", keycode: "KC_T", hint: "T" },
      { id: "ps-pen", label: "Caneta", keycode: "KC_P", hint: "P" },
      { id: "ps-hand", label: "Mão", keycode: "KC_H", hint: "H" },
      { id: "ps-zoom", label: "Zoom", keycode: "KC_Z", hint: "Z" },
      { id: "ps-copy", label: "Copiar", keycode: "G(KC_C)", hint: "⌘C" },
      { id: "ps-paste", label: "Colar", keycode: "G(KC_V)", hint: "⌘V" },
      { id: "ps-undo", label: "Desfazer", keycode: "G(KC_Z)", hint: "⌘Z" },
      { id: "ps-stepback", label: "Voltar (step)", keycode: "LAG(KC_Z)", hint: "⌥⌘Z" },
      { id: "ps-transform", label: "Transformação livre", keycode: "G(KC_T)", hint: "⌘T" },
      { id: "ps-deselect", label: "Desmarcar", keycode: "G(KC_D)", hint: "⌘D" },
      { id: "ps-newlayer", label: "Nova camada", keycode: "LSG(KC_N)", hint: "⇧⌘N" },
      { id: "ps-merge", label: "Mesclar abaixo", keycode: "G(KC_E)", hint: "⌘E" },
      { id: "ps-levels", label: "Níveis", keycode: "G(KC_L)", hint: "⌘L" },
      { id: "ps-curves", label: "Curvas", keycode: "G(KC_M)", hint: "⌘M" },
    ],
  },
  {
    app: "Illustrator",
    icon: "illustrator",
    actions: [
      { id: "ai-select", label: "Seleção", keycode: "KC_V", hint: "V" },
      { id: "ai-directselect", label: "Seleção direta", keycode: "KC_A", hint: "A" },
      { id: "ai-pen", label: "Caneta", keycode: "KC_P", hint: "P" },
      { id: "ai-type", label: "Texto", keycode: "KC_T", hint: "T" },
      { id: "ai-rect", label: "Retângulo", keycode: "KC_M", hint: "M" },
      { id: "ai-ellipse", label: "Elipse", keycode: "KC_L", hint: "L" },
      { id: "ai-brush", label: "Pincel", keycode: "KC_B", hint: "B" },
      { id: "ai-pencil", label: "Lápis", keycode: "KC_N", hint: "N" },
      { id: "ai-eyedropper", label: "Conta-gotas", keycode: "KC_I", hint: "I" },
      { id: "ai-rotate", label: "Rotacionar", keycode: "KC_R", hint: "R" },
      { id: "ai-scale", label: "Escala", keycode: "KC_S", hint: "S" },
      { id: "ai-zoom", label: "Zoom", keycode: "KC_Z", hint: "Z" },
      { id: "ai-copy", label: "Copiar", keycode: "G(KC_C)", hint: "⌘C" },
      { id: "ai-paste", label: "Colar", keycode: "G(KC_V)", hint: "⌘V" },
      { id: "ai-pastefront", label: "Colar na frente", keycode: "G(KC_F)", hint: "⌘F" },
      { id: "ai-pasteback", label: "Colar atrás", keycode: "G(KC_B)", hint: "⌘B" },
      { id: "ai-group", label: "Agrupar", keycode: "G(KC_G)", hint: "⌘G" },
      { id: "ai-ungroup", label: "Desagrupar", keycode: "LSG(KC_G)", hint: "⇧⌘G" },
      { id: "ai-join", label: "Juntar", keycode: "G(KC_J)", hint: "⌘J" },
      { id: "ai-outline", label: "Contorno (view)", keycode: "G(KC_Y)", hint: "⌘Y" },
      { id: "ai-undo", label: "Desfazer", keycode: "G(KC_Z)", hint: "⌘Z" },
    ],
  },
  {
    app: "Blender",
    icon: "blender",
    actions: [
      { id: "bl-move", label: "Mover", keycode: "KC_G", hint: "G" },
      { id: "bl-rotate", label: "Rotacionar", keycode: "KC_R", hint: "R" },
      { id: "bl-scale", label: "Escalar", keycode: "KC_S", hint: "S" },
      { id: "bl-extrude", label: "Extrudar", keycode: "KC_E", hint: "E" },
      { id: "bl-inset", label: "Inset", keycode: "KC_I", hint: "I" },
      { id: "bl-loopcut", label: "Loop cut", keycode: "LCA(KC_R)", hint: "⌃⌥R" },
      { id: "bl-selall", label: "Selecionar tudo", keycode: "KC_A", hint: "A" },
      { id: "bl-delete", label: "Deletar", keycode: "KC_X", hint: "X" },
      { id: "bl-duplicate", label: "Duplicar", keycode: "LSG(KC_D)", hint: "⇧D" },
      { id: "bl-copy", label: "Copiar", keycode: "G(KC_C)", hint: "⌘C" },
      { id: "bl-paste", label: "Colar", keycode: "G(KC_V)", hint: "⌘V" },
      { id: "bl-undo", label: "Desfazer", keycode: "G(KC_Z)", hint: "⌘Z" },
    ],
  },
  {
    app: "Básico",
    icon: "basic",
    actions: [
      { id: "b-spc", label: "Espaço", keycode: "KC_SPC", hint: "␣" },
      { id: "b-ent", label: "Enter", keycode: "KC_ENT", hint: "⏎" },
      { id: "b-tab", label: "Tab", keycode: "KC_TAB", hint: "⇥" },
      { id: "b-esc", label: "Esc", keycode: "KC_ESC", hint: "⎋" },
      { id: "b-bspc", label: "Backspace", keycode: "KC_BSPC", hint: "⌫" },
      { id: "b-del", label: "Delete", keycode: "KC_DEL", hint: "⌦" },
      { id: "b-left", label: "Seta esquerda", keycode: "KC_LEFT", hint: "←" },
      { id: "b-right", label: "Seta direita", keycode: "KC_RGHT", hint: "→" },
      { id: "b-up", label: "Seta cima", keycode: "KC_UP", hint: "↑" },
      { id: "b-down", label: "Seta baixo", keycode: "KC_DOWN", hint: "↓" },
    ],
  },
  {
    app: "Sistema / Layers",
    icon: "system",
    actions: [
      { id: "s-l1", label: "Ir para Layer 1", keycode: "TO(0)", hint: "L1" },
      { id: "s-l2", label: "Ir para Layer 2", keycode: "TO(1)", hint: "L2" },
      { id: "s-l3", label: "Ir para Layer 3", keycode: "TO(2)", hint: "L3" },
      { id: "s-l4", label: "Ir para Layer 4", keycode: "TO(3)", hint: "L4" },
      { id: "s-rgb", label: "Ligar/desligar RGB", keycode: "RGB_TOG", hint: "RGB" },
      { id: "s-none", label: "Nada (desligada)", keycode: "KC_NO", hint: "—" },
      { id: "s-trns", label: "Transparente (repassa)", keycode: "KC_TRNS", hint: "▽" },
    ],
  },
];

/** Encontra o app cujo catálogo contém um dado keycode (para pré-selecionar). */
export function findAppForKeycode(keycode: string): AppCatalog | undefined {
  return ACTION_CATALOG.find((g) => g.actions.some((a) => a.keycode === keycode));
}
