# Modo Cinematográfico — instruções de execução

Brief para retomar o trabalho do zero, sem precisar reler a conversa. Escrito em
2026-09-15, nada deste documento foi implementado ainda.

**Estado do repo:** branch `feat/keyboard-3d`, commits `a10af46` (pad 3D v0) e `462cacc`
(luz). A `main` está intocada. O `.blend` tem alterações do usuário não commitadas — não
commitar sem aprovação explícita.

---

## 1. Por que este modo existe

O pad 3D em tempo real chegou perto do render do Blender e não chega junto: falta oclusão de
contato, transmissão real no case e a textura boa do render. O usuário montou composições no
Blender mostrando o alvo — fundo escuro, case azul, preto profundo, sombra macia.

A saída é pré-renderizar. É o que a Apple realmente faz: as páginas de produto são frames
renderizados offline desenhados num canvas, não 3D em tempo real. Configurador de carro vai
além e renderiza **todas** as combinações — funciona porque o espaço de opções é contável.

**Aqui não é contável.** O keycode é string livre (`isValidKeycode` em
`src/model/keycodes.ts`), o usuário digita no `CodePill`, e cada preset repinta 12 rótulos.
Renderizar todas as possibilidades está fora de questão.

**Princípio que resolve isso — separar mundo de dado:**

- **Mundo** (câmera, luz, material, geometria) → pré-renderizado no Blender.
- **Dado** (seleção, hover, tooltip, cor da layer) → overlay 2D em runtime, ancorado em
  coordenadas que o próprio script de render exporta.

Isso preserva a trava do `3d/CLAUDE.md` §6: cor de keycap e underglow **nunca** são assados.

---

## 2. Decisões travadas pelo usuário

| Decisão | Valor |
|---|---|
| Modos | **Cinematográfico** (pré-renderizado) e **Fast** (o SVG atual, `KeyboardRender.tsx`) |
| Prioridade | Qualidade de imagem inegociável; a tela é peça de apresentação |
| Tema | Escuro, **app inteiro** |
| Proporção | **16:10** fixa |
| Rótulo na tecla | **Sem rótulo**, por ora |
| Acervo v1 | Visão geral, 3/4, close do **knob** e da **roda**. Sem close por tecla |
| Peso | Até ~25 MB (o plano atual usa ~8,6 MB) |
| Case | **Azul**, como no mockup |
| Onde fica o toggle | Decidir depois |

---

## 3. Medidas canônicas

Travar antes de renderizar qualquer coisa. Re-render por mudança de proporção é o retrabalho
mais caro do plano. **Conferir 1600×1000 contra os frames do Figma (nodes 56:2700 e
56:3284) antes de começar** — se lá for 1440, o drawer passa a ocupar 46% e os closes
apertam.

```
APP     1600 × 1000   (16:10)
HEADER    64 px   (altura fixa; hoje é py-4 + conteúdo ≈ 60)
FOOTER    60 px   (altura fixa; hoje é py-3 + borda ≈ 59)
PALCO   1600 × 876
DRAWER   668 px = 41,75% da largura
```

Poses com drawer aberto precisam ter o sujeito em `x < 0,56` do palco (0,5825 é o limite
real; 0,56 dá folga).

No modo cinematográfico o palco **não encolhe** quando o drawer abre — o drawer desliza por
cima. Se o palco encolhesse, o enquadramento mudaria e a imagem saltaria.

---

## 4. Acervo v1

Cinco poses de descanso, quatro pares de clipe, hub em `top`:

```
idle ⇄ top ⇄ edit
            ⇄ knob
            ⇄ wheel
```

| Pose | Quando | Drawer | Enquadramento |
|---|---|---|---|
| `idle` | desconectado | fechado | 3/4, pad inteiro |
| `top` | conectado, drawer fechado | fechado | quase topo, pad inteiro |
| `edit` | tecla comum selecionada | **aberto** | pad deslocado à esquerda |
| `knob` | slot 3 selecionado | **aberto** | close do knob, à esquerda |
| `wheel` | slot 0 selecionado | **aberto** | close da roda, à esquerda |

Trocar de tecla A→B **não gera transição**: as duas são `edit`, só o overlay muda. O caso mais
comum sai de graça.

**Um close único para as 12 teclas**, não um por tecla: 12 poses + 24 clipes seria ~7× o
acervo para um ganho que o overlay já entrega.

### Formato: vídeo para o movimento, still para o descanso

Sequência de frames foi avaliada e **descartada por memória**: frame decodificado custa
`largura×altura×4` bytes independente do formato em disco. 4 clipes × 20 frames a 1600×876 =
**451 MB de RGBA residente**. Sprite sheet não ajuda, é a mesma contagem de pixels.

Os dois motivos que fariam preferir frames se resolvem barato no vídeo:

- **Marcha à ré:** arquivo reverso pré-codificado, gerado do mesmo render, sem re-renderizar.
- **Precisão de frame:** atribuir `currentTime` faz seek **exato**. O impreciso é `fastSeek()`,
  que não se usa. Logo **não precisa de all-intra** — diferença entre 600 KB e 4 MB por clipe.

A fraqueza do vídeo (compressão visível na imagem parada) some porque **nunca se descansa num
frame de vídeo**: ao terminar o clipe entra o still de alta resolução num fade de 140 ms. Lê
como um "assentar de foco".

### Contas

```
Render (equivalentes a 1600×876):
  stills   5 poses × 4 (escala 2×)               =  20 frame-eq
  clipes   20+20+22+22 = 84 frames, sentido único =  84 frame-eq
  emissão  AOV do mesmo passe                     =   0 frame-eq
                                                    ───────────
                                                    104 frame-eq
Tempo: 104 × t_frame → 3,5 min (t=2s) a 10,5 min (t=6s), + ~30 s de encode.
Plano B da emissão (2ª view layer): +40%.
FAIXA HONESTA: 4 a 15 minutos para regerar o acervo inteiro, num comando só.

Entrega:
  5 × still beauty    3200×1752 WebP q92   ≈ 700 KB →  3,5 MB
  5 × still emissão   1600×876  WebP q90   ≈  50 KB →  0,25 MB
  8 × clipe           1600×876  H.264 CRF16 0,7 s ≈ 600 KB →  4,8 MB
  1 × manifest.json                        ≈  45 KB →  0,05 MB
                                            ─────────────────
                                        19 arquivos, ≈ 8,6 MB

Scratch em 3d/render/ (gitignored): ~260 MB de PNG intermediário.
```

---

## 5. Arquitetura

### 5.1 Estrutura de arquivos

```
public/cinematic/                 ← servido verbatim pelo Vite, fora do bundle JS
  manifest.json
  stills/   idle.webp  idle.glow.webp  top.webp  …  (5 poses × 2)
  clips/    idle-top.mp4  top-idle.mp4  top-edit.mp4  …  (4 pares)

3d/scripts/poses.py               ← declaração das poses/clipes (dados puros, sem bpy)
3d/scripts/render_states.py       ← renderiza + gera o manifest
3d/render/                        ← PNG intermediário, GITIGNORED

src/ui/cinematic/
  stage.ts            medidas canônicas + conversões norm↔px (puro)
  manifest.ts         tipos + schema zod + loader
  planner.ts          máquina de estados: poseForState(), route(), advance() — PURO
  useCinematic.ts     liga o planner ao store e ao carregador de mídia
  media.ts            pool de <video>, blobs, decode, preload por prioridade
  CinematicStage.tsx  <video>/<img> + camada de glow
  Overlay.tsx         SVG das âncoras: hit areas, hover, seleção
  Tooltip.tsx         tooltip HTML posicionado pela âncora
src/ui/FixedFrame.tsx           ← letterbox + scale
src/ui/poses/PoseStudio.tsx     ← ferramenta interna de autoria (era o Keyboard3D)

test/cinematic-manifest.test.ts  valida o manifest commitado + invariantes geométricas
test/cinematic-planner.test.ts   roteamento e interrupção (puro, roda em node)
```

`public/` porque o Vite copia sem hash e sem passar pelo bundler — o manifest referencia
arquivos por string, que é o que um arquivo gerado faz. O `.glb` já mora em `public/models/`.
Ler por `fetch("/cinematic/manifest.json")`, **não** por `import`: assim re-renderizar não
exige rebuild do app.

**Cache:** o script escreve `rev` (hash de mtime do .blend + `poses.py` + medidas) no
manifest; o carregador anexa `?r=<rev>` a toda URL.

**Git:** commitar `public/cinematic/` (~9 MB, muda raramente). Se o ciclo de re-render virar
semanal, migrar para git-lfs.

### 5.2 Manifest — o contrato

Coordenadas normalizadas 0..1 sobre o palco, origem **top-left** (`world_to_camera_view`
devolve bottom-left; esse flip é a fonte clássica de bug — deixar explícito no manifest com
`"origin": "top-left"`).

```ts
const anchorSchema = z.object({
  slot: z.number().int().min(0).max(15),
  visible: z.boolean(),              // false = ocluso (knob tapando a tecla)
  quad: z.tuple([p2, p2, p2, p2]),   // topo do cap, ordem TL,TR,BR,BL na tela
  center: p2,
  tip: p2,                           // âncora do tooltip (~10 mm acima do cap)
  depth: z.number(),                 // distância à câmera em mm (ordenação do hit test)
});

const poseSchema = z.object({
  id: z.enum(["idle", "top", "edit", "knob", "wheel"]),
  drawer: z.enum(["open", "closed"]),
  glow: z.boolean(),                 // idle desconectado = pad apagado
  still: z.object({ beauty: z.string(), emission: z.string().nullable(),
                    width: z.number().int(), height: z.number().int() }),
  anchors: z.array(anchorSchema).length(16),
});

const clipSchema = z.object({
  id: z.string(), from: poseId, to: poseId, file: z.string(),
  fps: z.number(), frames: z.number().int(), duration: z.number(),
  width: z.number().int(), height: z.number().int(),
});

export const manifestSchema = z.object({
  version: z.literal(1),
  rev: z.string(), generatedAt: z.string(), blend: z.string(),
  origin: z.literal("top-left"),
  stage: z.object({ width: z.number().int(), height: z.number().int() }),
  hub: poseId,
  emissionMode: z.enum(["single", "indexed"]),   // gancho p/ Fase 3 (RGB por tecla)
  poses: z.array(poseSchema).min(1),
  clips: z.array(clipSchema),                    // [] = player degrada p/ crossfade
});
```

Validação em três severidades:

1. **Runtime, no load:** `safeParse`. Falhou → `console.error` + cai para modo `fast`.
   Nunca tela preta.
2. **Grafo, no load em dev e no teste:** toda pose alcançável do hub; todo `from`/`to`
   existe; para todo clipe `a→b` existe `b→a`; `stage` bate com `stage.ts`.
3. **Geometria, em teste** (§5.5).

### 5.3 Player

```ts
// planner.ts — puro, sem React
export function poseForState(s): PoseId {
  if (s.connection !== "connected") return "idle";
  if (s.panelCollapsed) return "top";
  if (s.selectedSlot === 0) return "wheel";
  if (s.selectedSlot === 3) return "knob";
  return "edit";
}
```

`activeLayer` **não** entra: cor da layer é só o tingimento do glow (transição CSS de cor,
180 ms).

`route(from, to)` devolve `ClipStep[]`: direto se o par existir, senão `from→hub` + `hub→to`.
Custo máximo 2 clipes ≈ 1,3 s (knob→tecla), que é o caminho raro.

```ts
type PlayerState =
  | { kind: "at";      pose: PoseId }
  | { kind: "playing"; step: ClipStep; t: number; plan: ClipStep[] }
  | { kind: "stalled"; pose: PoseId; want: PoseId }   // mídia ainda carregando
```

**Interrupção — rebobina, não corta, não enfileira:**

```
target mudou durante playing(step, t):
  novoPlano = route(step.to, target)
  se step.to é o primeiro passo útil do novoPlano → segue em frente
  senão → inverte: troca para o arquivo reverso, currentTime = duration − t,
          e prefixa o restante de route(step.from, target)
```

Com hub, mudar de destino quase sempre exige voltar ao `top` mesmo — rebobinar **é** o
caminho certo, e lê como movimento físico em vez de corte seco.

**Still substituindo o último frame.** Três camadas empilhadas:

```
<video>    clipe — opacity 1 durante playing, 0 em repouso
<img>      still 2× da pose — opacity 0→1 em 140 ms ao terminar o clipe
<div glow> still de emissão — mix-blend-mode screen, opacity 0→1 em 200 ms
```

Funciona porque **o último frame de cada clipe é exatamente a câmera da pose de destino** (o
script garante por construção). O crossfade não troca imagem, troca resolução.

O glow fica **desligado durante os clipes** e entra no repouso: elimina 8 arquivos de emissão
em vídeo e o problema de sincronizar dois `<video>`.

**Pré-carregamento:** boot carrega o manifest e o still da pose atual (único bloqueante);
depois, em `requestIdleCallback`: stills vizinhos → clipes adjacentes → resto. Clipes como
**Blob → `URL.createObjectURL`**, não `src` direto: dá sinal determinístico de "pronto",
contorna range request no protocolo custom do Tauri, e permite um pool de 2 `<video>`
reaproveitados. Se o clipe não estiver pronto na hora: `stalled` segura o frame por 250 ms e
cai para crossfade direto.

**Estado do player vive em `useRef`, fora do zustand** — é animação a 60 Hz, não tem o que
fazer num store persistido. O player só **escreve** via `selectSlot`, com a mesma regra do
SVG e do 3D: `selectSlot(panelCollapsed ? slot : selectedSlot === slot ? null : slot)`.

**Drawer sincronizado:** hoje é render condicional (aparece instantâneo). Passa a deslizar
com `translateX` na mesma duração do clipe.

### 5.4 Overlay

SVG absoluto sobre o palco, `viewBox="0 0 1600 876"`. Por slot visível, o `quad` vira um
`<polygon>` que é ao mesmo tempo hit area e contorno.

- **O quad projetado resolve a perspectiva**: numa vista 3/4 o hit area acompanha o cap
  exatamente, sem raycast em runtime. É o maior ganho do manifest.
- **Ordenar por `depth`**: desenhar do mais distante ao mais próximo; em caps sobrepostos, o
  hit test pega o de menor `depth`. Sem isso, numa 3/4 uma tecla de trás rouba o clique.
- **`visible: false` → sem hit area e sem contorno.**
- **Tooltip em HTML**, posicionado em `tip`, com `translate(-50%,-100%)`, clampado às bordas
  **e ao drawer** (limite direito vira `1600−668` quando aberto). Reusar `actionLabelFor` e
  `keyLabel` de `src/ui/labels.ts` — mesmo texto dos outros dois modos.
- **Durante clipe:** `opacity 0`, transição de 80 ms.
- Sem rótulo no keycap. O `quad` de 4 cantos fica no manifest de qualquer jeito, então
  desenhar texto em perspectiva (homografia) continua possível depois, sem re-renderizar.

### 5.5 Como testar alinhamento

**Teste automatizado sobre o manifest commitado** (`test/cinematic-manifest.test.ts`, roda em
node, sem DOM) — é aqui que o erro aparece:

```
1. toda coordenada dentro de [-0.2, 1.2]      (fora disso = flip de Y ou câmera errada)
2. todo quad convexo e com winding consistente (flip inverte o winding → pega na hora)
3. área do quad > 0.0003 do palco             (cap não degenerado)
4. os 12 quads de tecla não se sobrepõem na pose `top`
5. ASSINATURA DE LAYOUT na pose `top`: para todo par de teclas,
   row menor ⇒ center.y menor; col menor ⇒ center.x menor
   (bate o manifest contra SLOT_LAYOUT de src/model/layout.ts)
6. GUARDA DO DRAWER: em toda pose drawer:"open", todo center.x visível < 0.54
7. stage do manifest === STAGE de stage.ts
```

O item 5 é o teste forte: câmera, flip ou ordem dos cantos errados quebram a assinatura. O
item 6 roda **também dentro do script Blender**, abortando antes de gastar 10 minutos numa
pose em que o sujeito fica embaixo do drawer.

**Modo debug visual** (`?debug=anchors`): quads numerados, `tip` como cruz, `center` como
bolinha, `depth` como texto, seletor de pose e slider de opacidade do still para piscar entre
render e overlay.

**Screenshot:** reusar o padrão `DevCapture` que já existe em `Keyboard3D.tsx` (evento
`k3d:shoot` + payload em `<html data-k3d>`, POST do dataURL) — ver §7.

### 5.6 Script Blender

`3d/scripts/poses.py` — só dados, sem `bpy`, importável por outras ferramentas:

```python
STAGE = (1600, 876)          # tem que bater com src/ui/cinematic/stage.ts
DRAWER_FRAC = 668 / 1600
SCALE_STILL, SCALE_CLIP, FPS = 2, 1, 30

Pose = namedtuple("Pose", "id target az el radius shift_y drawer glow")
POSES = [
  Pose("idle",  (0, 6, 0),      28,  32, 68, 0.08, "closed", False),
  Pose("top",   (0, 6, 0),       0,  68, 66, 0.00, "closed", True),
  Pose("edit",  (-14, 6, 0),     6,  58, 58, 0.00, "open",   True),
  Pose("knob",  (18, 13, -20),  30,  42, 52, 0.00, "open",   True),
  Pose("wheel", (-20, 9, -22), -38,  60, 54, 0.00, "open",   True),
]
CLIPS = [("idle","top",20), ("top","edit",20), ("top","knob",22), ("top","wheel",22)]
```

Mesma parametrização de `POSES` em `src/ui/keyboard3d/parts.ts`, de propósito: a ferramenta
de autoria cospe exatamente esses números.

`3d/scripts/render_states.py`:

1. **Nunca salva o .blend.** Mesma invocação do `3d/scripts/export_glb.py`
   (`--background --factory-startup … --python`), sem `wm.save_mainfile`.
2. **Monta o palco:** câmera nova via `bpy.data.cameras.new` (a do arquivo está dentro do
   case, §9 do `3d/CLAUDE.md`), world escuro, key/fill/rim, chão catcher. **Aplicar o tilt de
   3,99°** (`PAD_TILT` em `parts.ts`) — no .blend a placa é horizontal e quem inclina é o
   disco; no app o modelo inteiro gira. Se o render não fizer igual, o enquadramento não bate
   com o preview.
3. **Engine:** ler `scene.render.engine` e trocar dentro de `try/except TypeError` (o
   identificador muda entre versões). `use_raytracing = True`, `thickness_mode = SLAB`.
4. **Dither anti-banding:** nó Noise de ~1,5/255 no compositor. Cena escura + 8 bits +
   codec = banding. Tem que estar lá desde o primeiro render.
5. **Passe de emissão:** tentar `view_layer.use_pass_emit = True` + File Output — custo zero,
   é AOV do mesmo passe. Verificar no primeiro render se captura a difusão do glow *através*
   do case leitoso. Se não capturar (provável — é iluminação indireta, não emissão de
   superfície), plano B: segunda view layer com só case + emissivo e o resto em holdout
   (+40%, não +100%). Em ambos, o glow sai **branco sobre preto**, nunca tingido.
6. **Âncoras:** por pose, `evaluated_depsgraph_get()`, 4 cantos do topo chato do cap (±8,05 mm
   em torno da origem, em `z = base + KEYCAP_TOP`), `bpy_extras.object_utils.world_to_camera_view`
   → `(u, 1−v)`. `tip` = mesmo cálculo 10 mm acima (espelha `tooltipAnchor()` em
   `Keyboard3D.tsx`). Roda/knob: bbox projetada. Smiley: quad da mesma caixa de `SMILEY_HIT`
   em `parts.ts`. `visible` por `scene.ray_cast` da câmera ao centro do cap.
7. **Guarda do drawer** antes de renderizar (§5.5 item 6).
8. **Clipes:** interpolar **no espaço de pose** (lerp de az/el/radius/target com
   `t = smoothstep(i/(n−1))`), não lerp de posição — senão a câmera atravessa em linha reta
   em vez de arcar em torno do pad. Render como sequência PNG em `3d/render/<clip>/`.
9. **Encode dos dois sentidos da mesma sequência, sem re-renderizar:** cena temporária com
   strip de imagem no VSE, `use_reverse_frames=True` para o reverso, saída FFMPEG/H.264.
   **Atenção:** em Blender 4.4+/5.x a API do VSE foi renomeada (`sequences` → `strips`) —
   conferir na API, não chutar. Fallback: `shutil.which("ffmpeg")` e encodar por linha de
   comando.
10. **Escreve `manifest.json`** e imprime resumo de custo (arquivos, bytes, tempo por etapa).

```
blender --background --factory-startup 3d/Blender/creatormicro_3dmodel_01_claude.blend \
  --python 3d/scripts/render_states.py -- --out public/cinematic \
  [--only top,edit] [--preview] [--scale 0.35] [--stills-only] [--no-clips]
```

`--preview --scale 0.35 --only top` renderiza uma pose em ~3 s: é o loop de autoria.
Envolver em `npm run render:states` e `npm run render:preview`.

### 5.7 Proporção fixa

```tsx
// src/ui/FixedFrame.tsx
const k = Math.min(vw / APP_W, vh / APP_H);   // ResizeObserver no window
<div className="fixed inset-0 grid place-items-center bg-[#07070a]">
  <div style={{ width: APP_W, height: APP_H, transform: `scale(${k})` }}>
    {children}
  </div>
</div>
```

`transform: scale`, não `zoom`: o browser transforma as coordenadas de ponteiro, então o hit
testing continua correto e o SVG do overlay escala junto.

**Três coisas quebram junto e precisam ser corrigidas na mesma leva:**

1. `AppShell.tsx` usa `h-screen` → `h-full`.
2. `PadSvg` usa `height: "min(66vh, 540px)"` → **`vh` dentro do container escalado se refere
   ao viewport, não ao container**; o pad respiraria sozinho. Vira px absoluto.
3. `position: fixed` dentro de ancestral com `transform` ancora no ancestral, não no
   viewport. Modais e popovers futuros têm que usar `absolute`. Vale uma linha no `CLAUDE.md`.

Header e footer passam a ter altura fixa (`h-16` / `h-[60px]`) para o palco ter altura
determinística. No modo cinematográfico o drawer vira `absolute right-0 top-0 z-20` sobre o
palco; no modo `fast` mantém o flex de hoje.

### 5.8 Toggle e o que acontece com o 3D em tempo real

```ts
export type PadView = "fast" | "cinematic";
// persist: version 1 → 2
migrate: (persisted, from) => from < 2
  ? { ...persisted, padView: persisted.padView === "3d" ? "cinematic" : "fast" }
  : persisted
```

Mais um saneamento defensivo na leitura: valor desconhecido vira `"fast"` (localStorage é
dado externo). O default começa `"fast"` enquanto os assets não existem, e vira `"cinematic"`
no commit que traz `public/cinematic/`.

**`Keyboard3D` sai do toggle do usuário e vira ferramenta interna de autoria:**

- Sai do `AppShell`. `App.tsx` já tem `View = "configurator" | "discovery"`; ganha `"poses"`,
  alcançável só com `import.meta.env.DEV` (mesmo padrão do link "Fase 0 · Discovery").
- `src/ui/poses/PoseStudio.tsx`: a cena R3F que já existe + sliders de
  `target/az/el/radius/shiftY` + retângulo do drawer desenhado por cima + "ghost" do still já
  renderizado em 50% de opacidade + botão que copia a pose como dict python pronto para colar
  em `poses.py`.
- `parts.ts` ganha `poseToBlender(pose, stage)` — pura e testável — convertendo
  `fov/az/el/radius/shiftY` em `lens`, `location`, `rotation_euler`, `shift_y`.
  **Cuidado:** `camera.shift_y` do Blender é em unidades da **maior** dimensão do sensor, não
  da altura. É o lugar clássico de errar sinal e fator.
- **Limite honesto da ferramenta:** o R3F **não** vai bater com o EEVEE em luz nem material.
  Ela serve para *enquadramento*. O loop real é: enquadra grosso no PoseStudio (instantâneo)
  → confirma com `--preview --scale 0.35` (~3 s) → itera.
- `test/keyboard3d-parts.test.ts` continua valendo e ganha os casos de `poseToBlender`.
- **Bônus:** com o `Keyboard3D` atrás de um `React.lazy` só-dev, o bundle de produção perde
  `three` + `@react-three/*`. Hoje `dist/assets/index-*.js` tem **1,45 MB**; expectativa de
  cair para 250–350 KB. Medir, não acreditar.

**O fallback do cinematográfico é o `fast`**, não o 3D em tempo real: sem WebGL, sem codec,
manifest inválido — tudo cai para o SVG, que sempre funciona.

---

## 6. Etapas, na ordem

Cada uma é verificável sozinha e nenhuma depende da seguinte existir.

**0. Travar a proporção.** Conferir 1600×1000 contra o Figma. Escrever
`src/ui/cinematic/stage.ts` com as constantes. _Nada renderiza ainda, mas o número está num
arquivo só._

**1. Letterbox.** `FixedFrame` + as três correções do §5.7. Modo `fast` inteiro rodando
dentro da caixa fixa. _Redimensionar a janela em qualquer proporção: não distorce, não corta,
o drawer abre e fecha certo._ Zero dependência de Blender.

**2. Toggle renomeado + migração.** `PadView = "fast"|"cinematic"`, `version: 2` + migrate,
`Keyboard3D` sai do shell e vira `PoseStudio` em dev. Cinematográfico ainda é placeholder
escuro. _Teste do migrate (`"3d"→"cinematic"`, `"2d"→"fast"`, lixo→`"fast"`); `npm run build`
e medir a queda do bundle._

**3. Spike de codec — 30 minutos, ANTES de renderizar qualquer coisa.** Um mp4 qualquer de
1600×876 em `public/`, carregado como Blob→objectURL, tocado no Chrome e, se houver esqueleto
Tauri, no WebView2 e no WKWebView. _Toca ou não toca._ Se falhar em algum alvo, o plano vira
"só stills + crossfade" e o acervo encolhe para 10 arquivos.

**4. Uma pose renderizada.** `poses.py` + `render_states.py` com
`--stills-only --only top`. Produz `top.webp`, `top.glow.webp` e um manifest de uma pose.
_O teste de manifest passa (incluindo a assinatura de layout) e o modo debug desenha os quads
sobre o still — se o flip de Y estiver errado, aparece na primeira tentativa._

**5. Overlay e palco estático.** `CinematicStage` + `Overlay` + `Tooltip`, sem nenhum clipe
(`clips: []` → o player degrada para crossfade). _Dá para clicar nas 12 teclas na pose `top`,
o tooltip cai no lugar, o drawer abre, o glow tinge com a layer._ **Este é o marco em que a
arquitetura inteira está provada com 2 arquivos de imagem.**

**6. Acervo completo de stills.** As 5 poses, guarda do drawer ativa. _Navegar entre
desconectado / conectado / tecla / knob / roda por crossfade._ Já é utilizável.

**7. Clipes.** Encode nos dois sentidos, `route`, `advance`, rebobinar. _Testes puros do
planner em node (rota com hub, rebobinar no meio, clique triplo rápido) + olho no crossfade._

**8. Tema escuro completo.** 53 pontos de cor fixa em 10 arquivos (`RightPanel` 12,
`DiscoveryPanel` 17, `AppShell` 7, resto espalhado) viram tokens semânticos em
`src/index.css`, que já está preparado ("quando os variables do Figma chegarem, remapeia-se
aqui").

**9. Polimento.** Slide do drawer sincronizado com o clipe, fade do glow,
`prefers-reduced-motion` → crossfade, fallback quando o codec falha.

---

## 7. Armadilhas já descobertas (não redescobrir)

Estas custaram tempo nesta sessão ou foram pegas na análise:

- **`ContactShadows` + `SoftShadows` (PCSS) juntos** quebram o render: o contato passa a
  desenhar a cena inteira borrada por cima. Já está comentado em `Keyboard3D.tsx`.
- **`transmission` real do three** borra tudo atrás do case (passe screen-space) e come
  frame. O case usa difusor falso. No Blender isso não é problema — é EEVEE.
- **A serigrafia da placa é MÁSCARA**, não cor: o exporter manda o PNG cru como baseColor e a
  placa sai preta. No app é recomposta em runtime (`plateMaterial`).
- **Browser pane do Claude não entrega clique ao React deste app** e, com o pane oculto, o
  canvas R3F nem mede (`visibilityState=hidden`, canvas 300×150). O que funciona é **Chrome
  headless via CDP puro** (Node 24 tem WebSocket global): `--headless=new
  --remote-debugging-port`, `Page.captureScreenshot`, `Input.dispatchMouseEvent`. Estado
  pré-selecionado pelo gancho dev (evento `k3d:state` + JSON em `<html data-k3d>`), porque
  ferramentas de automação rodam em "isolated world" e o `detail` do CustomEvent não atravessa.
- **AgX no three levanta o preto** sobre fundo claro; ACES + exposição 1,05 foi o que trouxe
  o keycap de volta ao preto. No Blender o arquivo já está em AgX.
- **Windows edição "N"** não traz os codecs do Media Foundation → H.264 não toca no WebView2.
- **`world_to_camera_view` devolve origem bottom-left.** O flip de Y é o bug clássico; o teste
  de winding do §5.5 pega.

---

## 8. Riscos

- **Fricção de iteração.** 4–15 min por acervo completo é aceitável, mas você perde o "mexi no
  keycap, vejo em 2 s". Defesa: `--preview --scale 0.35 --only <pose>` (~3 s) e o modo `fast`
  como vista de trabalho diária.
- **Memória dos stills.** 5 stills 3200×1752 decodificados = 22 MB cada em RGBA, 112 MB se
  todos residentes — mais que os clipes. Manter decodificados só a pose atual e as
  adjacentes; o resto fica como Blob e decodifica sob demanda (`img.decode()` ≈ 20 ms, cabe
  no clipe de 700 ms).
- **Banding em cena escura 8 bits.** Dither desde o primeiro render. Se persistir: AVIF
  10 bits (macOS < 13 não suporta) ou grão de filme sutil, que mata o banding de vez.
- **Deriva entre constantes python e TS.** `STAGE`, `KEYCAP_TOP`, `SMILEY_HIT` existem dos
  dois lados. O **manifest é o contrato**: gerado pelo python, commitado, e o teste em vitest
  compara contra as constantes TS. O python nunca é lido pelo TS.
- **Fase 3 (RGB por tecla).** A máscara única de emissão dá uma cor por tela, que é o limite
  do protocolo VIA hoje (§4 do `CLAUDE.md` raiz). Quando o firmware custom permitir cor por
  tecla: **máscara indexada** (R = índice do LED dominante, G = intensidade, recolorida num
  shader de uma passada) — um arquivo extra por pose, escala para qualquer número de LEDs. É
  por isso que o schema já nasce com `emissionMode: "single" | "indexed"`.
- **Duas verdades visuais.** O modo Fast (SVG do Figma) e o Cinematográfico vão divergir com o
  tempo. Aceitável: um é ferramenta, o outro é vitrine.

---

## 9. Primeira coisa a fazer amanhã

Etapa 0 e 1 não dependem do Blender e destravam todo o resto: conferir a proporção contra o
Figma, escrever `stage.ts` e montar o `FixedFrame` com as três correções. Dá para terminar e
ver na tela sem renderizar um pixel.
