# Tarefa: UV + gabaritos de serigrafia

Brief autocontido para uma sessão nova. **Leia `3d/CLAUDE.md` inteiro antes de
começar** — ele é o contrato do modelo (datum, grade, materiais, regra nº 1:
medida real vence inferência). Prosa em PT-BR; código e nomes em inglês.

**Arquivo:** `3d/Blender/creatormicro_3dmodel_01_claude.blend` (Blender 5.1, mm,
1 unidade = 1 mm, escala aplicada em tudo).

---

## 1. Objetivo

Preparar o modelo para receber a **arte impressa** que o usuário vai desenhar no
Figma. Duas superfícies, ambas planas — **não precisa desdobrar nada, só
projeção planar exata em milímetros**:

| superfície | objeto | área | textura final | px/mm |
|---|---|---|---|---|
| topo da placa | `plate_top` | 92 × 92 mm | `placa_serigrafia.png` 2048² | 22,26 |
| fundo da base (miolo + sob a borracha) | `base_bottom` | Ø86 mm | `disco_texto.png` 2048² | 23,81 |

Entregáveis desta sessão:
1. UV planar nos dois objetos.
2. Dois **gabaritos PNG** para o usuário desenhar por cima.
3. Verificação visual com imagem de teste (seção 5).

### Fora do escopo — não fazer
- Decals/ícones dos keycaps (decisão adiada pelo usuário).
- UV de qualquer outro objeto, bake de AO, Cycles.
- Mexer em geometria, materiais existentes ou posições.
- Refazer `base_logo` ou modelar detalhes (USB-C, LEDs etc.).

---

## 2. Regras de convivência com o usuário

O usuário trabalha **ao vivo** no mesmo arquivo aberto no Blender enquanto você
opera via MCP. Lições da sessão anterior:

- **Nunca salve o arquivo.** O usuário salva com Ctrl+S. Commit só depois que
  ele salvar e aprovar.
- **Cheque `bpy.context.mode` antes de ler ou escrever malha.** Com o usuário
  em `EDIT_MESH`, `mesh.vertices`/atributos estão **desatualizados** — a sessão
  anterior deu um alarme falso ("sharp edges sumiram") por isso. Se estiver em
  edit mode, peça para ele sair; não force `mode_set`.
- **Antes de "corrigir" algo que parece errado, veja se é consistente no grupo.**
  A sessão anterior "consertou" a posição de uma tecla que estava certa: o bloco
  inteiro de controles está deslocado **+3,2948 mm em Y** de propósito.
- **Não mexa na vista dele sem devolver.** Guarde `region_3d.view_location /
  view_rotation / view_distance` e restaure. `bpy.ops.view3d.view_all` inclui a
  luz a 144 mm e perde o enquadramento — posicione a vista direto.
- Antes de operação destrutiva em malha, duplique o datablock com
  `use_fake_user = True` como backup e remova quando o usuário aprovar.

---

## 3. Especificação da UV

Criar um layer `UVMap` (nome padrão — o exportador glTF usa o primeiro layer).

### 3.1 `plate_top`

Confirme primeiro no arquivo (não confie só neste texto): origem do objeto em
(0,0,0), topo = uma face única plana em `z = 4.869`, 92 × 92 mm centrada.

Projeção de cima, **todas as faces** do objeto:

```
u = (x + 46) / 92
v = (y + 46) / 92
```

- `x, y` em coordenadas de mundo (o objeto está na origem, sem rotação).
- `+Y` (fundo do pad, knob e roller) = topo da imagem. `v = 1` é a última linha
  da imagem no Blender, que corresponde ao topo do PNG no Figma. Não inverter.
- Faces laterais/chanfro/fundo colapsam sobre a borda da imagem — tudo bem,
  a borda da arte é transparente.

### 3.2 `base_bottom`

Confirme no arquivo: disco Ø86 centrado na origem; a face de baixo é **inclinada
~3,99°** (frente −Y mais alta, fundo +Y mais baixo — verifique os `z` reais).
Slot 1 = faixa sob a borracha (64 faces), slot 2 = miolo (1 face, n-gon de 64).

**Espelhamento — ponto crítico.** A arte é vista **de baixo**. Convenção:
imagine o pad virado de cabeça para baixo girando **180° no eixo Y** — a frente
continua embaixo na imagem, esquerda e direita trocam. Então:

```
u = (43 - x) / 86        ← X espelhado
v = (y + 43) / 86
```

- Projete ao longo de Z (a inclinação de 4° dá 0,24% de estiramento em Y —
  desprezível). Se quiser exatidão, projete no plano da face do miolo.
- Mesmas fórmulas em todas as faces do objeto.
- **Valide com a imagem de teste (seção 5)** — se o texto aparecer espelhado
  vendo de baixo, a convenção foi aplicada ao contrário.

---

## 4. Gabaritos PNG

Gerar **em processo separado, no arquivo salvo, sem salvar** — zero risco para o
arquivo aberto pelo usuário:

```bash
"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --factory-startup "3d/Blender/creatormicro_3dmodel_01_claude.blend" --python <script.py> -- <saída>
```

(As ferramentas MCP `*_for_cli` falham: não há `blender` no PATH. Existe também
Blender 4.5 instalado — use a 5.1.)

Saída em `3d/textures/templates/`:

### `placa_template.png`
- 2048 × 2048, RGBA, fundo transparente.
- Câmera **ortográfica de cima**, centro (0,0), `ortho_scale = 92`, olhando −Z,
  +Y para cima na imagem. Assim cada pixel bate com a UV da seção 3.1.
- Workbench, cores chapadas: placa cinza claro; keycaps, knob, roller, parafusos
  em cinza escuro (silhuetas). Esconder `case_shell` e tudo abaixo da placa.
- Sobrepor (numpy nos pixels do render): linha de contorno da placa, cruz no
  centro e grade leve a cada 10 mm. Marcar com círculo vazado as posições dos
  cantos r3c0 (logo Figma) e r3c3 (smiley) — lembrar do deslocamento +3,2948 em Y.

### `disco_template.png`
- 2048 × 2048, RGBA, transparente.
- Câmera ortográfica **de baixo**, olhando +Z, **+Y para cima na imagem** — isso
  produz naturalmente o espelhamento em X da seção 3.2. `ortho_scale = 86`.
- Mostrar só `base_bottom` e `base_rubber`. Sobrepor círculos de Ø66 (limite da
  arte) e Ø80 (borda externa da borracha), cruz no centro, e uma seta/letra
  "FRENTE" do lado −Y para o usuário não se perder.

Escrever também `3d/textures/templates/README.md` curto com: tamanho, px/mm,
orientação de cada gabarito e as coordenadas-chave (centro, parafusos em
±40,45, cantos do logo/smiley).

---

## 5. Verificação obrigatória

1. Gerar uma imagem de teste 2048² assimétrica: grade de 10 mm + letra "F"
   grande + seta apontando para +Y + marcadores nos pontos dos parafusos
   (±40,45; ±40,45) na placa.
2. Ligar temporariamente como Base Color num material **novo** de teste, aplicado
   só durante o teste (não altere `plate_white_gloss`/`foot_black`).
3. Screenshot de cima (placa) e de baixo (disco): os marcadores devem cair
   **exatamente** sobre os parafusos; o "F" deve ler certo, não espelhado, em
   ambas as vistas.
4. Remover o material e a imagem de teste do arquivo. Restaurar os materiais
   originais e a vista do usuário.
5. Mostrar os screenshots ao usuário antes de dar por pronto.

---

## 6. Depois que a arte chegar (próxima etapa — só se o usuário pedir)

O usuário exporta máscaras em `3d/textures/src/` (frame 920×920 no Figma,
1 px = 0,1 mm, export `2048w`, arte em cor sólida, só o alfa importa).

Ligação no material, para preview no Blender:
- `plate_white_gloss`: Image Texture (Non-Color no alfa) → Mix entre branco da
  placa e preto da tinta no Base Color; a tinta um pouco mais fosca que o
  plástico (mix também na Roughness).
- `foot_black`: mesma ideia, tinta branca sobre preto.

Lembrete do `3d/CLAUDE.md`: **node tree não sobrevive ao glTF**. Na exportação,
o resultado precisa virar imagem (baseColor + ORM) — isso é da etapa de export,
não desta.

---

## 7. Pendências a confirmar com o usuário

- O deslocamento **+3,2948 mm em Y** do bloco de controles foi medido no
  aparelho ou foi ajuste visual? O gabarito da placa depende disso para ser
  referência final.
- Posição exata do texto lateral da placa (documento estima x ≈ ∓41).

---

## 8. Ao terminar

- Atualizar `3d/CLAUDE.md`: seção 7 (UVs deixam de ser bloqueio para placa e
  disco), seção 9 (estado real), e referência a `3d/textures/templates/`.
- Pedir para o usuário salvar; commit só com aprovação. No PowerShell 5.1,
  mensagem de commit multilinha vai por arquivo (`git commit -F arquivo`) —
  here-string em pipe falha.
