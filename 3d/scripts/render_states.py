"""Renderiza o acervo do modo Cinematográfico e emite o manifest.

Usa a CENA COMO ESTÁ no .blend — chão, mundo, luzes e materiais são do usuário.
O script só cria a câmera, enquadra as poses e renderiza. NUNCA salva o .blend.

  blender --background --factory-startup 3d/Blender/creatormicro_3dmodel_01_claude.blend \
    --python 3d/scripts/render_states.py -- [opções]

Opções:
  --out DIR         destino (padrão: public/cinematic)
  --only a,b        só estas poses
  --preview         render rápido (poucos samples), para iterar enquadramento
  --scale F         fator de resolução (padrão 1; still usa SCALE_STILL)
  --stills-only     não renderiza clipes de transição
  --clips-only      só os clipes
"""
import json
import math
import os
import sys
import time

import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import poses as P  # noqa: E402

# ── Argumentos ──────────────────────────────────────────────────────────────
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


REPO = os.path.abspath(os.path.join(os.path.dirname(bpy.data.filepath), "..", ".."))
OUT = os.path.abspath(arg("--out", os.path.join(REPO, "public", "cinematic")))
ONLY = set(arg("--only", "").split(",")) - {""}
PREVIEW = "--preview" in argv
SCALE = float(arg("--scale", 1.0))
STILLS_ONLY = "--stills-only" in argv
CLIPS_ONLY = "--clips-only" in argv

scene = bpy.context.scene

# ── Cena: só o que é do render, nada de mexer no look do usuário ────────────
scene.render.image_settings.color_mode = "RGB"
scene.render.film_transparent = False
if PREVIEW:
    try:
        scene.eevee.taa_render_samples = 16
    except Exception:
        pass

IMG_EXT = "png"
try:
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.quality = 92
    IMG_EXT = "webp"
except TypeError:
    scene.render.image_settings.file_format = "PNG"

cam_data = bpy.data.cameras.new("cinematic_cam")
cam_data.sensor_fit = "VERTICAL"
cam_data.sensor_height = 24.0
cam_data.clip_start = 1.0
cam_data.clip_end = 10000.0
cam = bpy.data.objects.new("cinematic_cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam


def frame_camera(pose, width, height):
    """Coloca a câmera. Mesma convenção de parts.ts, em coordenadas do Blender."""
    v = math.radians(P.FOV_V)
    cam_data.lens = (cam_data.sensor_height / 2) / math.tan(v / 2)
    aspect = width / height
    h = math.atan(math.tan(v / 2) * aspect)
    dist = pose.radius / math.tan(min(v / 2, h))

    az, el = math.radians(pose.az), math.radians(pose.el)
    t = Vector(pose.target)
    off = Vector((
        math.sin(az) * math.cos(el),
        -math.cos(az) * math.cos(el),
        math.sin(el),
    )) * dist
    cam.location = t + off
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam_data.shift_x = pose.shift_x or 0.0
    cam_data.shift_y = pose.shift_y or 0.0
    bpy.context.view_layer.update()
    return aspect


def subject_center(pose):
    """Centro do sujeito da pose, em tela normalizada."""
    anchors = anchors_for_pose()
    subj = ([a for a in anchors if a["visible"]] if pose.subject == "grid"
            else [a for a in anchors if a["slot"] == pose.subject])
    if not subj:
        return None
    xs = [a["center"][0] for a in subj]
    ys = [a["center"][1] for a in subj]
    return ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)


def autoshift(pose, aspect):
    """shift None → enquadra o sujeito sozinho, nos dois eixos.

    O shift do Blender é em unidades da MAIOR dimensão do sensor; com
    sensor_fit VERTICAL isso é a altura — daí o fator aspect só no X.
    Sinais medidos na prática: +shift_x leva o sujeito para a ESQUERDA,
    +shift_y leva para BAIXO."""
    if pose.subject is None:
        return (cam_data.shift_x, cam_data.shift_y)
    c = subject_center(pose)
    if c is None:
        return (cam_data.shift_x, cam_data.shift_y)
    if pose.shift_x is None:
        cam_data.shift_x = (c[0] - P.SUBJECT_X_TARGET) * aspect
    if pose.shift_y is None:
        cam_data.shift_y = P.SUBJECT_Y_TARGET - c[1]
    bpy.context.view_layer.update()
    after = subject_center(pose)
    print(f"   enquadrou {pose.id}: sujeito ({c[0]:.3f}, {c[1]:.3f}) → "
          f"({after[0]:.3f}, {after[1]:.3f})")
    return (cam_data.shift_x, cam_data.shift_y)


# ── Âncoras ─────────────────────────────────────────────────────────────────
def obj(name):
    return scene.objects.get(name)


def keycap_corners(o):
    """4 cantos do topo chato do cap, em coordenadas de mundo."""
    p = o.matrix_world.translation
    f, z = P.KEYCAP_FLAT, P.KEYCAP_TOP
    return [Vector((p.x + dx, p.y + dy, p.z + z)) for dx, dy in
            ((-f, f), (f, f), (f, -f), (-f, -f))]


def bbox_top_corners(names):
    """Topo da bbox combinada de vários objetos (roda, knob)."""
    pts = []
    for n in names:
        o = obj(n)
        if o:
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    if not pts:
        return None
    xs = [p.x for p in pts]; ys = [p.y for p in pts]; zs = [p.z for p in pts]
    zt = max(zs)
    return [Vector((min(xs), max(ys), zt)), Vector((max(xs), max(ys), zt)),
            Vector((max(xs), min(ys), zt)), Vector((min(xs), min(ys), zt))]


def project(p):
    """Mundo → tela normalizada, ORIGEM TOP-LEFT (o Blender devolve bottom-left)."""
    c = world_to_camera_view(scene, cam, p)
    return [round(c.x, 5), round(1.0 - c.y, 5)]


def order_quad(pts2d):
    """Ordena TL,TR,BR,BL na tela (horário, com Y para baixo)."""
    cx = sum(p[0] for p in pts2d) / 4
    cy = sum(p[1] for p in pts2d) / 4
    return sorted(pts2d, key=lambda p: math.atan2(p[1] - cy, p[0] - cx))


def slot_targets():
    """slot → (objetos, função dos cantos). Espelha SLOT_LAYOUT do app."""
    out = {}
    for row in range(4):
        for col in range(4):
            i = P.slot_index(row, col)
            corner = (row in (0, 3)) and (col in (0, 3))
            if not corner:
                out[i] = (f"keycap_r{row}c{col}", "keycap")
    out[0] = ("roller_wheel|roller_bracket|roller_base", "bbox")
    out[3] = ("knob|encoder", "bbox")
    out[12] = (None, "none")          # logo: serigrafia, não é clicável
    out[15] = (None, "smiley")
    return out


TARGETS = slot_targets()


def anchors_for_pose():
    deps = bpy.context.evaluated_depsgraph_get()
    origin = cam.matrix_world.translation
    out = []
    for slot in range(P.SLOT_COUNT):
        name, kind = TARGETS[slot]
        corners, center = None, None
        if kind == "keycap":
            o = obj(name)
            if o:
                corners = keycap_corners(o)
        elif kind == "bbox":
            corners = bbox_top_corners(name.split("|"))
        elif kind == "smiley":
            c = Vector(P.SMILEY_CENTER)
            h = P.SMILEY_HALF
            corners = [Vector((c.x - h, c.y + h, c.z)), Vector((c.x + h, c.y + h, c.z)),
                       Vector((c.x + h, c.y - h, c.z)), Vector((c.x - h, c.y - h, c.z))]
        if corners is None:
            out.append({"slot": slot, "visible": False, "quad": [[0, 0]] * 4,
                        "center": [0, 0], "tip": [0, 0], "depth": 0})
            continue

        center = sum(corners, Vector((0, 0, 0))) / 4
        quad = order_quad([project(c) for c in corners])
        tip = project(center + Vector((0, 0, P.TOOLTIP_UP)))
        depth = round((center - origin).length, 2)

        # visível = o raio da câmera até o centro bate primeiro nesta peça
        direction = (center - origin).normalized()
        hit, _, _, _, hit_obj, _ = scene.ray_cast(deps, origin, direction)
        expected = set((name or "").split("|")) | {"plate_top"}  # smiley mora na placa
        visible = bool(hit) and hit_obj is not None and hit_obj.name in expected
        # fora do quadro também conta como invisível
        cx, cy = (sum(p[0] for p in quad) / 4, sum(p[1] for p in quad) / 4)
        if not (-0.05 <= cx <= 1.05 and -0.05 <= cy <= 1.05):
            visible = False

        out.append({"slot": slot, "visible": visible, "quad": quad,
                    "center": [round(cx, 5), round(cy, 5)], "tip": tip, "depth": depth})
    return out


def check_drawer_guard(pose, anchors):
    """O SUJEITO da pose não pode ficar embaixo do painel. Teclas de contexto
    podem — numa pose de close é natural que parte do pad suma atrás do drawer."""
    if pose.drawer != "open" or pose.subject is None:
        return
    slots = [a for a in anchors if a["visible"]] if pose.subject == "grid" else             [a for a in anchors if a["slot"] == pose.subject]
    bad = [a["slot"] for a in slots if a["center"][0] > P.SUBJECT_MAX_X]
    if bad:
        print(f"!! GUARDA DO DRAWER: pose '{pose.id}' tem slots {bad} à direita de "
              f"{P.SUBJECT_MAX_X} — ficariam embaixo do painel.")
    else:
        print(f"   guarda ok: sujeito de '{pose.id}' cabe à esquerda do painel")


# ── Render ──────────────────────────────────────────────────────────────────
def render_to(path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def set_res(scale):
    scene.render.resolution_x = int(P.STAGE_W * scale)
    scene.render.resolution_y = int(P.STAGE_H * scale)
    scene.render.resolution_percentage = 100


def main():
    os.makedirs(os.path.join(OUT, "stills"), exist_ok=True)
    t0 = time.time()
    manifest = {
        "version": 1,
        "rev": str(int(os.path.getmtime(bpy.data.filepath))),
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "blend": os.path.basename(bpy.data.filepath),
        "origin": "top-left",
        "stage": {"width": P.STAGE_W, "height": P.STAGE_H},
        "hub": P.HUB,
        "emissionMode": "single",
        "poses": [],
        "clips": [],
    }

    still_scale = SCALE * (1 if PREVIEW else P.SCALE_STILL)
    for pose in P.POSES:
        if ONLY and pose.id not in ONLY:
            continue
        if CLIPS_ONLY:
            continue
        set_res(still_scale)
        aspect = frame_camera(pose, scene.render.resolution_x, scene.render.resolution_y)
        shift_x, shift_y = autoshift(pose, aspect)
        anchors = anchors_for_pose()
        check_drawer_guard(pose, anchors)
        rel = f"stills/{pose.id}.{IMG_EXT}"
        t = time.time()
        render_to(os.path.join(OUT, "stills", pose.id))
        print(f"   pose {pose.id}: {time.time() - t:.1f}s "
              f"({scene.render.resolution_x}×{scene.render.resolution_y})")
        manifest["poses"].append({
            "id": pose.id,
            "shiftX": round(shift_x, 4), "shiftY": round(shift_y, 4),
            "drawer": pose.drawer,
            "glow": pose.glow,
            "still": {"beauty": rel, "emission": None,
                      "width": scene.render.resolution_x,
                      "height": scene.render.resolution_y},
            "anchors": anchors,
        })

    if not STILLS_ONLY and not PREVIEW:
        render_clips(manifest)

    if manifest["poses"]:
        with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=1)
    total = sum(os.path.getsize(os.path.join(dp, f))
                for dp, _, fs in os.walk(OUT) for f in fs)
    print(f"OK {len(manifest['poses'])} poses, {len(manifest['clips'])} clipes, "
          f"{total / 1e6:.1f} MB, {time.time() - t0:.0f}s → {OUT}")


def lerp_pose(pa, pb, u, ident):
    """Pose intermediária. Interpola NO ESPAÇO DE POSE: a câmera arca em volta do
    pad em vez de atravessar em linha reta."""
    sx = lambda p: p.shift_x or 0.0
    sy = lambda p: p.shift_y or 0.0
    return P.Pose(
        id=ident, subject=None,
        target=tuple(pa.target[k] + (pb.target[k] - pa.target[k]) * u for k in range(3)),
        az=pa.az + (pb.az - pa.az) * u,
        el=pa.el + (pb.el - pa.el) * u,
        radius=pa.radius + (pb.radius - pa.radius) * u,
        shift_x=sx(pa) + (sx(pb) - sx(pa)) * u,
        shift_y=sy(pa) + (sy(pb) - sy(pa)) * u,
        drawer=pb.drawer, glow=pb.glow,
    )


def resolved(pose):
    """Pose com o shift já calculado (o clipe precisa dos valores finais)."""
    if pose.shift_x is not None and pose.shift_y is not None:
        return pose
    set_res(SCALE)
    aspect = frame_camera(pose, scene.render.resolution_x, scene.render.resolution_y)
    sx, sy = autoshift(pose, aspect)
    return pose._replace(shift_x=sx, shift_y=sy)


def render_clip(a, b, pa, pb, n, manifest):
    """Um sentido da transição, direto para .mp4 (o Blender traz o FFmpeg)."""
    # Blender 5 separou mídia de formato: sem media_type=VIDEO, FFMPEG nem aparece
    if hasattr(scene.render.image_settings, "media_type"):
        scene.render.image_settings.media_type = "VIDEO"
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "HIGH"
    scene.render.ffmpeg.ffmpeg_preset = "GOOD"
    scene.render.fps = P.FPS
    scene.frame_start, scene.frame_end = 0, n - 1
    cam.animation_data_clear()
    cam_data.animation_data_clear()
    # o easing já está cozido no smoothstep; a curva entre keys tem que ser reta.
    # (Blender 5 tirou action.fcurves, então define-se a interpolação ANTES.)
    try:
        bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    except Exception:
        pass
    for i in range(n):
        u = i / (n - 1)
        u = u * u * (3 - 2 * u)          # smoothstep: sai e chega devagar
        frame_camera(lerp_pose(pa, pb, u, f"{a}-{b}"), scene.render.resolution_x,
                     scene.render.resolution_y)
        cam.keyframe_insert("location", frame=i)
        cam.keyframe_insert("rotation_euler", frame=i)
        cam_data.keyframe_insert("shift_x", frame=i)
        cam_data.keyframe_insert("shift_y", frame=i)
    scene.render.filepath = os.path.join(OUT, "clips", f"{a}-{b}_")
    t = time.time()
    bpy.ops.render.render(animation=True)
    # o Blender nomeia com o range; renomeia para um nome estável
    made = [f for f in os.listdir(os.path.join(OUT, "clips")) if f.startswith(f"{a}-{b}_")]
    final = f"{a}-{b}.mp4"
    if made:
        src = os.path.join(OUT, "clips", made[0])
        dst = os.path.join(OUT, "clips", final)
        if os.path.exists(dst):
            os.remove(dst)
        os.rename(src, dst)
    print(f"   clipe {a}-{b}: {n} frames em {time.time() - t:.0f}s")
    manifest["clips"].append({
        "id": f"{a}-{b}", "from": a, "to": b, "file": f"clips/{final}",
        "fps": P.FPS, "frames": n, "duration": round(n / P.FPS, 3),
        "width": scene.render.resolution_x, "height": scene.render.resolution_y,
    })


def render_clips(manifest):
    os.makedirs(os.path.join(OUT, "clips"), exist_ok=True)
    set_res(SCALE)
    for a, b, n in P.CLIPS:
        if ONLY and not (a in ONLY or b in ONLY):
            continue
        pa, pb = resolved(P.pose_by_id(a)), resolved(P.pose_by_id(b))
        # os dois sentidos: ida e volta são arquivos separados (vídeo não roda
        # para trás em browser nenhum)
        render_clip(a, b, pa, pb, n, manifest)
        render_clip(b, a, pb, pa, n, manifest)


main()
