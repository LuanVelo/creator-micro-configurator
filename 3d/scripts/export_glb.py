"""Exporta o asset do app (public/models/creator-micro.glb) a partir do .blend.

Rodar em background — NÃO salva o .blend:
  "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe" --background --factory-startup ^
    3d/Blender/creatormicro_3dmodel_01_claude.blend --python 3d/scripts/export_glb.py

v0: sem bake, sem compressão. Materiais saem como parâmetros do Principled; a
placa leva a serigrafia (imagem já plugada). O app sobrescreve keycaps e case.
Unidade: 1 unidade glTF = 1 mm (o exporter ignora scale_length). Eixo: Y-up.
"""
import os
import bpy

REPO = os.path.abspath(os.path.join(os.path.dirname(bpy.data.filepath), "..", ".."))
OUT = os.path.join(REPO, "public", "models", "creator-micro.glb")

# Peças visíveis por fora. Nomes são contrato com src/ui/keyboard3d/.
EXCLUDE_TYPES = {"CAMERA", "LIGHT", "EMPTY"}
EXCLUDE_NAMES = {"base_logo"}  # geometria ruim, a refazer (3d/CLAUDE.md §7)

scene = bpy.context.scene
for o in scene.objects:
    o.select_set(False)

picked = []
for o in scene.objects:
    if o.type in EXCLUDE_TYPES or o.name in EXCLUDE_NAMES or o.hide_render:
        continue
    o.hide_set(False)
    o.select_set(True)
    picked.append(o)

for o in sorted(picked, key=lambda x: x.name):
    mats = [s.material.name if s.material else None for s in o.material_slots]
    print(f"EXPORT {o.name:18s} {o.type:6s} mats={mats}")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    use_selection=True,
    export_apply=True,  # aplica o BEVEL do knob
    export_yup=True,
    export_texcoords=True,
    export_normals=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)
print("WROTE", OUT, os.path.getsize(OUT), "bytes")
