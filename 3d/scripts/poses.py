"""Poses e transições do modo Cinematográfico. Dados puros, sem `bpy`.

Estas medidas são o contrato com o app (`src/ui/cinematic/stage.ts`). Mudar
qualquer uma obriga a re-renderizar o acervo inteiro.

Convenção de câmera, a MESMA de `src/ui/keyboard3d/parts.ts` (para a ferramenta
de autoria em tempo real cuspir estes números):
  az  0 = de frente (lado do logo/smiley);  + = câmera à direita
  el  0 = rente à mesa;  90 = topo
  radius = raio em mm que precisa caber na tela; a distância sai do fov/aspect
  shift = deslocamento de enquadramento. CUIDADO: o shift do Blender é em
          unidades da MAIOR dimensão do sensor; com sensor_fit VERTICAL isso é a
          altura. Para deslocar D frações da LARGURA do quadro: shift = D * aspect

ATENÇÃO: aqui os alvos estão em coordenadas do BLENDER (Z para cima, +Y é o
fundo do pad, onde ficam knob e roda). No glTF/three o eixo é Y-up: y_blend =
-z_gltf, z_blend = y_gltf.
"""
from collections import namedtuple

# ── Medidas canônicas ───────────────────────────────────────────────────────
APP_W, APP_H = 1440, 900          # 16:10
# Desde a UI V 2.0 header e footer FLUTUAM por cima do render: o palco é a tela
# inteira. (Acervo v1 era 1440×776, entre as barras, e o app ampliava e cortava.)
STAGE_W, STAGE_H = APP_W, APP_H                          # 1440 × 900

DRAWER_W = 668
DRAWER_FRAC = DRAWER_W / APP_W    # 0,4639
# Poses com drawer aberto: o sujeito tem que caber à esquerda disso, com folga.
SUBJECT_MAX_X = 0.50              # borda do drawer = (1440 − 668) / 1440 = 0,536
# Onde o sujeito deve ficar nas poses com drawer aberto: centro da faixa visível
# à esquerda do painel. O script calcula o shift_x sozinho a partir disso — as
# poses abaixo põem shift_x = None e deixam a conta com ele.
SUBJECT_X_TARGET = 0.27              # centro da faixa livre: 772 / 2 / 1440
SUBJECT_Y_TARGET = 0.50
# Por pose: o knob é alto e a âncora dele é o TOPO — centrado, sobrava vazio
# acima e o pad ficava cortado embaixo. Sobe o sujeito para mostrar mais pad.
SUBJECT_Y_BY_POSE = {"knob": 0.30}

FOV_V = 22.0                      # fov vertical, igual ao do pad em tempo real
SCALE_STILL = 2                   # still sai em 2× para a imagem parada ficar nítida
FPS = 30

# ── Poses ───────────────────────────────────────────────────────────────────
# subject = slot que a pose está mostrando (None = pad inteiro). É o único que a
# guarda do drawer cobra: nas poses de close, teclas atrás do painel podem sumir.
Pose = namedtuple("Pose", "id target az el radius shift_x shift_y drawer glow subject")

POSES = [
    # desconectado: 3/4, afastado e centralizado (Figma 75:334 — pad ~37% da
    # largura, centro em 0,50/0,49). Repouso é longe; aproximar é só na transição.
    Pose("idle",  (0, 0, 6),   -42, 40, 122, 0.00, 0.00, "closed", False, None),
    # conectado, drawer fechado: topo reto (90°), pad inteiro, ~30% mais longe que o v1 (72)
    Pose("top",   (0, 0, 6),     0, 90, 94, 0.00, 0.00, "closed", True, None),
    # tecla comum selecionada: mesmo topo reto, pad inteiro à esquerda do palco.
    # shift_y 0 = o PAD (alvo na origem) fica centrado na altura, não a grade de teclas
    Pose("edit",  (0, 0, 6),     0, 90, 80, None, 0.00, "open",  True, "grid"),
    # knob selecionado: aproxima pela direita, sujeito à esquerda
    Pose("knob",  (18, 20, 13), 28, 40, 54, None, None, "open",  True, 3),
    # roda selecionada: é baixa, de lado a tecla vizinha tapa — vem mais de cima
    Pose("wheel", (-22, 24, 9), -26, 52, 48, None, None, "open", True, 0),
]

# (de, para, nº de frames). O sentido inverso sai do mesmo render.
CLIPS = [
    ("idle", "top", 24),
    # saindo do topo agora percorre mais distância (repouso afastado)
    ("top", "edit", 20),
    ("top", "knob", 26),
    ("top", "wheel", 26),
    # anel entre as poses de drawer aberto: trocar de tecla com o drawer aberto
    # não volta ao topo (docs/transicoes-secundarias.md)
    ("edit", "knob", 20),
    ("edit", "wheel", 20),
    ("knob", "wheel", 24),
]

HUB = "top"

# ── Geometria do pad (espelha src/ui/keyboard3d/parts.ts) ───────────────────
KEYCAP_TOP = 6.5        # altura do topo do cap acima da origem dele
KEYCAP_FLAT = 8.05      # meia-largura do topo chato (16,1 mm)
TOOLTIP_UP = 10.0       # âncora do tooltip acima do topo do cap

# Cantos que não têm malha de tecla. Smiley = mesma caixa de SMILEY_HIT.
SMILEY_CENTER = (27, -23.7, 5.4)   # Blender
SMILEY_HALF = 7.5

SLOT_COUNT = 16


def slot_index(row: int, col: int) -> int:
    """index = row*4 + col, igual a SLOT_LAYOUT do app."""
    return row * 4 + col


def pose_by_id(pose_id: str) -> Pose:
    for p in POSES:
        if p.id == pose_id:
            return p
    raise KeyError(pose_id)
