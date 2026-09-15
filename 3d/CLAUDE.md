# Modelo 3D — Figma Creator Micro (asset do Keymap)

Handoff de uma sessão de modelagem feita no Blender 5.1 via MCP. Este documento
existe para retomar o trabalho de onde parou, sem repetir decisões nem refazer
medições.

**Arquivo:** `3d/Blender/creatormicro_3dmodel_01_claude.blend` (relativo à raiz do repo).
A cópia antiga no Google Drive não é mais fonte.

**Objetivo final:** asset leve para o Keymap (configurador WebHID em Tauri).
Mockup realista é objetivo secundário e não deve ditar decisões de peso.

---

## 1. Regra número um deste projeto

**Medida real vence inferência, sempre.** Esta sessão perdeu várias rodadas
porque eu deduzi números a partir de fotos em vez de pedir o paquímetro. Erros
concretos que aconteceram:

- Assumi pitch MX de 19,05 mm e depois Choc de 18 × 17. O real é **18 × 18**,
  espaçamento proprietário da Work Louder. Nenhum keyset de prateleira encaixa.
- Modelei o roller como tambor estreito num suporte largo. O real é o inverso:
  roda de 11 mm num conjunto de 14, sobrando 1,5 mm de metal por lado.
- Tratei a borracha da base como zona de material. É peça física, anel de
  Ø80/Ø66 × 1 mm.

A seção 4 separa o que é medido do que ainda é chute. **Nunca construa em cima
de um número da lista de estimativas sem avisar que ele é estimativa.**

---

## 2. Sistema de coordenadas e datum

- Unidades: milímetro. `scale_length = 0.001`, `length_unit = MILLIMETERS`.
  1 unidade Blender = 1 mm.
- Escala aplicada em todos os objetos (todos em `1,1,1`). Não deixe escala
  pendente — foi a causa raiz da malha ruim original.
- Origem do mundo = centro geométrico do pad em X e Y.
- **Datum vertical: topo da placa branca em `z = 4.869`.** Quase toda medida do
  aparelho é dada relativa a essa superfície.
- `+Y` é o fundo do pad, onde ficam knob e roller. `−Y` é a frente, onde ficam
  o logo Figma e o smiley.

### Grade de teclas

Pitch de 18 mm nos dois eixos. **A grade NÃO é centrada no pad:** o bloco de
controles (12 keycaps, 12 switches, knob, encoder, roller) foi deslocado
**+3,2948 mm em Y** pelo usuário. Placa, case, base e parafusos seguem centrados
na origem. (Origem do valor — medida no aparelho ou ajuste visual — a confirmar.)

```
colunas X:  c0 = -27       c1 = -9        c2 = +9       c3 = +27
linhas  Y:  r0 = +30.295   r1 = +12.295   r2 = -5.705   r3 = -23.705
```

Layout 4×4 menos os quatro cantos = 12 teclas. Os cantos são:

| posição | ocupante |
|---|---|
| r0c0 | roller |
| r0c3 | knob / encoder |
| r3c0 | logo Figma (serigrafia) |
| r3c3 | smiley capacitivo |

### Stack vertical

```
+29.87   topo do knob (lado alto)
+26.87   topo do knob (lado baixo)
+25.87   topo do eixo do encoder
+15.87   topo dos keycaps
 +9.37   base dos keycaps / topo dos switches
 +4.87   TOPO DA PLACA  ← datum
 +4.00   base da placa / topo do PCB
 +3.20   base do PCB / fundo do pocket do case
 -5.00   base do case / topo do disco
 -8.00   face inferior do disco (frente, −Y)
 -9.21   contato da borracha (frente)
-14.00   face inferior do disco (fundo, +Y)
-14.79   contato da borracha (fundo)
```

Altura total do apoio ao topo das teclas: **30,66 mm**. Inclinação do pad:
**3,99°**, consequência da cunha do disco.

---

## 3. Inventário de objetos

~28k tris no total (era ~17,4k antes da reconstrução do topo do keycap). Nomes são contrato — o app vai endereçar as teclas por
eles.

| objeto | mesh | tris | notas |
|---|---|---|---|
| `case_shell` | CaseShellMesh2 | 612 | 108×108×10, raio externo 13, abertura 95 raio 6,5 |
| `plate_top` | PlateTopMesh2 | 260 | 92×92×0,869, raio 5, chanfro 0,15 no topo |
| `pcb` | PcbMesh2 | 172 | 92×92×0,8, dá a linha âmbar de FR4 |
| `base_bottom` | BaseBottomMesh4 | 636 | cunha Ø86, 3 slots de material |
| `base_rubber` | BaseRubberMesh2 | 768 | anel Ø80/Ø66 × 1 |
| `base_logo` | BaseLogoMesh2 | 492 | **ruim, refazer** |
| `keycap_r0c1` … `keycap_r3c2` | KeycapMesh | 1566 ×12 | mesh compartilhada, topo refeito |
| `switch_r0c1` … `switch_r3c2` | SwitchMesh | 228 ×12 | mesh compartilhada, 3 slots |
| `knob` | KnobMesh | 254 | tem modifier BEVEL 0,3 |
| `encoder` | EncoderMesh | 432 | 4 slots de material |
| `roller_wheel` | RollerWheelMesh4 | 572 | eixo em X |
| `roller_bracket` | RollerBracketMesh3 | 192 | editado à mão pelo usuário |
| `roller_base` | RollerBaseMesh4 | 44 | |
| `Cylinder.001` … `.004` | — | 380 ×4 | parafusos, **geometria original, não refeita** |

### Detalhes que importam

**Keycaps** — as 12 dividem `KeycapMesh`. Editar uma vez atualiza todas. O slot
de material está em link `OBJECT`, então cada tecla tem material próprio sem
duplicar geometria. Origem na base do cap, não no centro — pronto para animar
clique com translação em Z pura.

Perfil: 17,5 mm quadrado, 6,5 de altura, raio de canto em planta 2,4, saída de
molde 0,03/mm por lado, fillet superior 0,5, topo chato de 16,1 mm com abaulado
central circular de Ø12,5 × 0,25 de profundidade.

Topologia (refeita em 2026-09-14 — a original gerava um "X" de sombreamento):
- 56 colunas. O contorno tinha 9 verts por canto e **zero nas retas**; foram
  adicionados 5 loops verticais por reta, descendo a parede inteira.
- Faixa plana quadrado→círculo: loop de suporte paralelo ao fillet a 0,15 mm,
  anel intermediário, círculo. Correspondência por comprimento de arco (torção
  máx. 2,9°) — normais da faixa ficam exatamente em +Z.
- Abaulado: anéis concêntricos + fan central. O usuário adicionou loops em
  r 6,05 / 6,16 e aprofundou o "ombro" perto da borda para marcar o círculo
  como no real. Perfil atual (r → z): 6,25→6,500 · 4,69→6,407 · 3,13→6,328 ·
  1,56→6,287 · 0→6,250. Ajuste visual, não medido.
- Sharp só no pé (56 arestas, 92°). Só quads, exceto o fan central.

**Switch** — Kailh Choc v1 simplificado, 3 slots: base preta 15 × 13,7 × 1,3,
housing transparente 13,9 × 12,6 × 3,1, stem vermelho 10,8 × 4,6. Sem pinos,
sem recortes do stem, sem travas laterais.

**Encoder** — 4 slots: corpo plástico 12 × 12 × 5,5, tampa metálica 12 × 12 ×
1,5, colar dourado Ø6 × 5, eixo em D de 9 mm cortado a 4 mm da face plana.

**Knob** — Ø18 com topo em degrau, metade a 15 mm e metade a 18, parede vertical
no diâmetro. O degrau é indicador de posição, então a rotação em Z é arbitrária.

**Roller** — roda Ø12 × 11 no eixo X, 36 canaletas axiais de 0,15 mm em
geometria. Suporte em U: 14 mm de ponta a ponta, abas de 1,5 mm de cada lado.
O usuário editou o bracket à mão depois que eu o construí — abas agora vão de
−1,5 a 8,79 relativos à placa, com patamar intermediário em 6,0.

---

## 4. Medidas: o que é real e o que é chute

### Medido com paquímetro pelo usuário

- Moldura translúcida: **8 mm** uniforme em volta, **10 mm** de altura
- Placa branca: **92 mm**
- Pitch das teclas: **18 × 18 mm**, caps quadrados
- Keycap: **11 mm** do topo da placa ao topo do cap
- Knob: **Ø18**, **15 mm** no lado baixo, **18 mm** no alto
- Encoder: corpo **12 × 12 × 7**, eixo **14 mm**, **Ø6** na base, corte em D a
  **4 mm**
- Roller: roda **Ø12**, **11 mm** em X; conjunto metálico **14 mm** ponta a
  ponta; base plástica com a largura do conjunto
- Borracha: **Ø80 externo, Ø66 interno, 1 mm** de altura

### Estimativa — confirmar antes de usar como referência

- Case externo 108 (derivado de 92 + 2×8, não medido direto)
- Abertura do case 95, vão placa↔case de 1,5 mm por lado
- Raio de canto externo do case 13; chanfros 1,0 topo / 0,8 base / 0,3 pocket
- Largura do keycap 17,5 (pitch menos 0,5 de folga)
- Raio de canto, saída de molde, fillet e abaulado do keycap
- Dimensões do switch (nominais de Choc v1, não medidas neste aparelho)
- Disco da base: **Ø86, 9 mm no fundo, 3 mm na frente** — estes três definem
  a inclinação de 3,99°, então errar um muda o ângulo
- Profundidade em Y do suporte do roller: 12
- Tamanho do logo na base: 29 × 43,5
- Espessura do PCB: 0,8

### Não confirmado

- **Orientação do eixo do roller.** Assumi X (rola pra frente e pra trás, scroll
  vertical). As fotos não deixaram cravar. Se estiver errado, é trocar a rotação
  de 90° em Y por 90° em X.

---

## 5. Convenções de modelagem

Manter estas convenções se for gerar geometria nova.

**Tudo construído por loft de anéis via `bmesh`, sem `bpy.ops`.** Cada peça é uma
sequência de contornos (retângulo arredondado ou círculo) empilhados em Z, com
faces ponte entre anéis consecutivos e n-gons nas tampas.

**Chanfros são geometria real, não modifier.** Um chanfro de 45° é simplesmente
um anel extra recuado. A única exceção é o `knob`, que usa um modifier BEVEL de
0,3 mm com limite por ângulo de 30°, porque o topo em degrau tornaria os anéis
manuais trabalhosos demais.

**Zero subsurf.** O arquivo original tinha subsurf em hard surface sem loops de
suporte, que é o que derretia os cantos. Se aparecer subsurf, é regressão.

**Shade smooth em tudo, mais sharp por ângulo.** Substitui o Auto Smooth, que
saiu do Blender na 4.1. Toda peça passa por uma função que mede o ângulo entre
faces vizinhas e marca `use_edge_sharp` acima de um limiar:

| peça | limiar |
|---|---|
| keycaps, case | 40° |
| encoder, roller base | 35° |
| base, logo | 30° |
| roda do roller | 25° |

**Regra especial do `roller_bracket`:** ângulo sozinho não separa arco de
chanfro. Uma aresta escapa da marcação se o ângulo for menor que 60° **e** as
duas faces vizinhas forem verticais (`|normal.z| < 0.05`). Arcos de canto giram
em torno de eixo vertical e passam nesse teste; planos inclinados não. Quinas de
90° entre paredes verticais continuam sharp porque passam dos 60°.

---

## 6. Pipeline até o app

Decisão tomada: **Cycles**, não por qualidade de render, mas porque bake no
Blender é Cycles.

### O ponto crítico

**Material procedural não sobrevive ao glTF.** O formato carrega um Principled
com imagens plugadas, não node tree. Voronoi, Noise, anisotropia — tudo é
descartado na exportação e vira plástico cinza. O procedural é ferramenta de
autoria, não material final.

Fluxo: monta procedural → assa em textura → religa as imagens num Principled
limpo → exporta.

### Formato de saída

- `.glb` único
- Geometria com compressão **Meshopt** (se dá melhor com three.js que Draco)
- Texturas em **KTX2 / Basis Universal**
- Mapas: baseColor (sRGB), ORM empacotado (AO no R, roughness no G, metallic no
  B), normal, emissive
- Resolução: atlas 2048 para as peças estáticas (case, placa, PCB, disco,
  borracha, parafusos), 1024 para os keycaps, 512 para o switch
- Empacotamento pós-Blender com `gltf-transform` por linha de comando
- Alvo: arquivo inteiro abaixo de 2 MB

### O que assar e o que não assar

**Assar:** AO de contato, grão de couro do disco, serigrafia dentro do baseColor
da placa, variação de roughness. Tudo que nunca muda.

**Nunca assar:** a cor dos keycaps e a cor do underglow. Se a cor da tecla for
assada, o configurador não consegue mais pintar nada. O baseColor do cap sai
**branco neutro** e recebe a cor via JS. O glow é emissive dirigível.

**Iluminação não se assa.** Vem de HDRI no three.js.

### Case translúcido

Único ponto que cobra caro em real-time. `KHR_materials_transmission` existe no
glTF, o Blender exporta e o three.js lê como `MeshPhysicalMaterial`, mas é um
passe de render extra. Começar com a versão falsa — material levemente
transparente mais mesh emissiva interna — e só subir para transmission real se
ficar ruim na tela.

O material do case não é vidro, é difusor: policarbonato leitoso que espalha a
luz do underglow em vez de deixar atravessar limpo.

---

## 7. O que falta

### Bloqueante

**UVs.** Zero em todos os objetos. Sem UV não tem bake, e sem bake não tem
material no glTF. É o maior bloco de trabalho restante, maior que os materiais
em si. As 12 teclas dividem uma mesh, então dividem UV — os ícones por tecla
saem de um atlas com deslocamento no nó Mapping, aproveitando que o slot de
material está em link `OBJECT`.

### Geometria pendente

- `base_logo` — a versão atual com contorno insetado ficou ruim e deve ser
  jogada fora. Refazer importando o SVG do logo Figma como curva, em vez de
  aproximar as 5 formas na mão
- Parafusos — ainda com a geometria original de 380 tris. Nas fotos são allen de
  cabeça cilíndrica
- 3 LEDs de layer, sensor capacitivo do smiley, espaçadores marrons da placa
- **Porta USB-C** — aparece claramente na lateral do case nas fotos e não está
  modelada
- Recortes na `plate_top` para switches, roller e encoder. Hoje as peças
  atravessam a placa sólida. Invisível de fora, problema em vista explodida
- Anel dourado da roda codificadora do roller (só visível desmontado)

### Materiais

**Biblioteca base criada (2026-09-14)** — um material por substância real, só
parâmetros no Principled (sem textura, exporta direto para glTF). Valores são
ponto de partida, ajustar no render.

| material | objetos | parâmetros |
|---|---|---|
| `keycap_black` | 12 keycaps (link `OBJECT`) | preto 0,025 · rough 0,45 |
| `plastic_black` | knob, roller_base, switch base + stem | preto 0,025 · rough 0,5 |
| `plastic_clear` | housing do switch | transmission 1 · rough 0,08 · IOR 1,49 |
| `metal_roller` | roller_wheel, roller_bracket | metallic 1 · 0,78 · rough 0,3 |
| `metal_black` | 4 parafusos | metallic 1 · 0,04 · rough 0,4 |
| `plate_white_gloss` | plate_top | 0,85 · rough 0,2 |
| `frame_frosted` | case_shell | transmission 1 · rough 0,55 · IOR 1,49 (acrílico) |
| `foot_black` | base_bottom (3 slots), base_logo, base_rubber | 0,02 · rough 0,85 |

Materiais físicos informados pelo usuário: keycap e knob plástico preto; roller
de metal; switch plástico preto + transparente; parafusos metal preto; placa
lisa branca brilhante; frame translúcido fosco (acrílico/policarbonato); pé
plástico preto emborrachado. Teclas começam **todas pretas**; variantes
coloridas previstas (roxo, verde claro, verde água, vermelho, rosa) = mesma
receita, só muda a cor. Decals ficam para depois. Encoder e PCB mantêm os
materiais antigos (escondidos). EEVEE com `use_raytracing` ligado e
`thickness_mode = SLAB` nos transmissivos.

Procedurais que dão para fazer sem depender de asset externo: grão de couro do
disco (Voronoi + Noise em Bump, maior retorno visual do arquivo), borracha,
preto emborrachado do knob, branco fosco da placa, FR4 âmbar do PCB, metal
escovado do roller com anisotropia acompanhando as caneluras, zamac fosco do
suporte, latão do colar, aço preto dos parafusos.

---

## 8. Assets que precisam vir do usuário

Não são geráveis por IA. Regra comum a todos: **exportar o frame inteiro, nunca
cortar no conteúdo.** Se o Figma fizer trim to content, a arte sai deslocada e o
mapeamento quebra. Deixar um retângulo de fundo transparente do tamanho exato e
exportar por ele. Anti-aliasing ligado, sem sombra, sem blur — são máscaras,
todo efeito é feito no shader. Opacidade vai no alpha, não em cinza.

### `placa_serigrafia.png`

Frame de 92 × 92 mm, 2048 × 2048 px (22,26 px/mm), RGBA 8 bits, arte em preto
puro sobre fundo transparente.

Centro do frame = centro da placa, borda em ±46 mm. Conteúdo: "Work Louder x
Figma © 2024" na borda esquerda, "Little Big Shortcuts" na direita, logo Figma
no canto inferior esquerdo, smiley no inferior direito, marcações dos LEDs.
Texto lateral por volta de x = ∓41.

### `disco_texto.png`

Frame de 86 × 86 mm, 2048 × 2048 px (23,8 px/mm), RGBA 8 bits, arte em branco
puro. Anel de texto dentro do círculo de Ø66. A faixa de Ø66 a Ø80 é coberta
pela borracha e pode ficar vazia.

### `figma_logo.svg`

Só as 5 formas, sem cor, sem fundo. Vetor, então tamanho é indiferente.

### `keycaps_atlas.png`

Grade 4 × 4, 2048 × 2048 px (célula de 512), RGBA 8 bits, arte em branco puro.
Ícone centralizado na célula ocupando cerca de 45% dela — nas fotos os ícones
são bem menores que a tecla. O topo chato do cap tem 16,1 mm. Precisa vir junto
a ordem das células para amarrar cada uma à tecla certa.

### Foto do RGB aceso

No escuro, sem outra luz, uma reta de frente na altura da mesa e uma reta de
cima. É a única forma de calibrar quanto o policarbonato espalha e até onde o
glow sobe na parede do case. Se possível uma com cor sólida e forte, tipo só
vermelho ou só azul, que separa difusão de saturação.

---

## 9. Estado real do arquivo (inventário de 2026-09-14)

Leitura do `.blend` em background, sem salvar. Onde o arquivo diverge deste
documento, **o arquivo é a verdade** — as seções acima descrevem a intenção.

- `base_logo` está com `BaseLogoMesh2` (492 tris), não `BaseLogoMesh3` (606).
  Vai ser refeito de qualquer forma (seção 7).
- ~~Keycaps em link `DATA` vazio~~ → **resolvido**: link `OBJECT` + `keycap_black`.
- ~~`plate_top`/`case_shell`/parafusos sem material próprio~~ → **resolvido** (seção 7).
- `pcb` segue sem slot de material.
- Render engine ainda é `BLENDER_EEVEE` (a decisão é Cycles para bake).
- Câmera padrão em (7, −7, 5) mm, dentro do case — inútil.
- Total: ~28k tris. UV só nos 4 parafusos.

---

## 10. Decisões ainda em aberto

- **Um asset ou dois?** Um leve para o Keymap e um pesado em Cycles para
  marketing, ou só o leve. A sessão terminou com "focar no leve".
- **Stack de render no app:** three.js direto, react-three-fiber, ou ainda não
  decidido.
- **Como a cor atribuída aparece.** O aparelho real tem caps opacos e LED por
  baixo. No configurador: (a) o cap inteiro assume a cor atribuída, mais legível
  como UI e menos fiel; (b) cap mantém a cor de fábrica e a cor aparece como
  halo na fresta, fiel mas quase ilegível em vista de topo; (c) híbrido, com
  toggle de "modo edição". A opção (b) e (c) exigem que os switches e o vão
  fiquem no escopo.
- **Nomenclatura para o app.** As teclas já estão em `keycap_rXcY`. Falta
  decidir se isso casa direto com a matriz do firmware ou se precisa de mapa
  de tradução.
