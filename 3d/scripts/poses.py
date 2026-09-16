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
HEADER_H, FOOTER_H = 64, 60
STAGE_W, STAGE_H = APP_W, APP_H - HEADER_H - FOOTER_H   # 1440 × 776

DRAWER_W = 668
DRAWER_FRAC = DRAWER_W / APP_W    # 0,4639
# Poses com drawer aberto: o sujeito tem que caber à esquerda disso, com folga.
SUBJECT_MAX_X = 0.50
# Onde o sujeito deve ficar nas poses com drawer aberto: centro da faixa visível
# à esquerda do painel. O script calcula o shift_x sozinho a partir disso — as
# poses abaixo põem shift_x = None e deixam a conta com ele.
SUBJECT_X_TARGET = 0.28
SUBJECT_Y_TARGET = 0.48

FOV_V = 22.0                      # fov vertical, igual ao do pad em tempo real
SCALE_STILL = 2                   # still sai em 2× para a imagem parada ficar nítida
FPS = 30

# ── Poses ───────────────────────────────────────────────────────────────────
# subject = slot que a pose está mostrando (None = pad inteiro). É o único que a
# guarda do drawer cobra: nas poses de close, teclas atrás do painel podem sumir.
Pose = namedtuple("Pose", "id target az el radius shift_x shift_y drawer glow subject")

POSES = [
    # desconectado: 3/4, mostra que é objeto
    Pose("idle",  (0, 0, 6),    28, 32, 64, 0.00, 0.05, "closed", False, None),
    # conectado, drawer fechado: quase topo, pad inteiro
    Pose("top",   (0, 0, 6),     0, 68, 72, 0.00, 0.00, "closed", True, None),
    # tecla comum selecionada: pad inteiro, deslocado para a esquerda do palco
    Pose("edit",  (0, 0, 6),     0, 62, 68, None, 0.00, "open",  True, "grid"),
    # knob selecionado: aproxima pela direita, sujeito à esquerda
    Pose("knob",  (18, 20, 13), 28, 40, 48, None, None, "open",  True, 3),
    # roda selecionada: é baixa, de lado a tecla vizinha tapa — vem mais de cima
    Pose("wheel", (-22, 24, 9), -26, 52, 42, None, None, "open", True, 0),
]

# (de, para, nº de frames). O sentido inverso sai do mesmo render.
CLIPS = [
    ("idle", "top", 20),
    ("top", "edit", 18),
    ("top", "knob", 22),
    ("top", "wheel", 22),
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
