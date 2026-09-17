# Transições secundárias — brief para o PC do Blender

Escrito em 2026-09-16. **Executado em 2026-09-17** no PC do Blender (Lilith), junto com o
re-render em 1440×900 (tela cheia) e o reenquadramento de idle/top/edit. Render e Blender
rodam só no outro PC; este Mac só mexe no app.

Branch: `feat/keyboard-3d`. No outro PC: `git pull` antes de começar.

---

## 1. O problema

Hoje o acervo tem um grafo em estrela, com o `top` no meio:

```
            idle
             │
edit ─────── top ─────── knob
             │
           wheel
```

`edit`, `knob` e `wheel` são as três poses **com drawer aberto** e nenhuma liga
direto na outra. Então, com o drawer aberto:

| Usuário faz              | O que toca hoje            | Como parece              |
|--------------------------|----------------------------|--------------------------|
| tecla comum → knob       | `edit→top` + `top→knob`    | afasta, depois aproxima  |
| knob → roda              | `knob→top` + `top→wheel`   | afasta, depois aproxima  |
| roda → tecla comum       | `wheel→top` + `top→edit`   | afasta, depois aproxima  |

O `top` é a pose de drawer **fechado**. A câmera recua até o pad inteiro no
centro e volta, mesmo com o drawer parado na tela. É o "vai e volta".

Tecla comum → outra tecla comum **não** tem clipe (as 12 dividem a pose `edit`).
Ali o movimento já vem do app: o contorno laranja desliza de uma tecla para a
outra e o conteúdo do drawer entra com fade (`SelectionOutline` em
`CinematicPad.tsx`). Não precisa de render (ver §6).

## 2. A solução: um anel entre as poses abertas

Clipes diretos entre as três poses de drawer aberto. O `top` continua sendo o hub
para abrir/fechar o drawer e para desconectar.

```
            idle
             │
            top
          ╱  │  ╲
      edit ─ knob ─ wheel      ← anel novo (drawer aberto)
        ╲_________╱
```

São **3 pares = 6 arquivos**:

| Par            | Frames | Duração | Nota |
|----------------|--------|---------|------|
| `edit ↔ knob`  | 20     | 0,667 s | aproxima pela direita |
| `edit ↔ wheel` | 20     | 0,667 s | aproxima pela esquerda, sobe |
| `knob ↔ wheel` | 24     | 0,8 s   | maior deslocamento: az 28° → −26°, cruza o 0° |

Custo estimado: cerca de 1,6 MB a mais (os clipes atuais têm entre 120 e 300 KB cada).

**No app não muda nada.** `route()` em `src/ui/cinematic/planner.ts` já prefere o
clipe direto quando ele existe e só cai no hub quando não existe. Basta o
manifest novo trazer os clipes.

## 3. O que fazer no PC do Blender

### 3.1 `3d/scripts/poses.py`: adicionar os pares

```python
# (de, para, nº de frames). O sentido inverso sai do mesmo render.
CLIPS = [
    ("idle", "top", 20),
    ("top", "edit", 18),
    ("top", "knob", 22),
    ("top", "wheel", 22),
    # anel entre as poses de drawer aberto: trocar de tecla com o drawer
    # aberto não volta ao topo (docs/transicoes-secundarias.md)
    ("edit", "knob", 20),
    ("edit", "wheel", 20),
    ("knob", "wheel", 24),
]
```

`render_clips()` já renderiza os dois sentidos de cada par. `lerp_pose()` interpola
no espaço de pose (az/el/radius/target), então a câmera faz um arco em volta do
pad em vez de atravessá-lo.

### 3.2 Renderizar: rodar o acervo INTEIRO

```bash
blender --background --factory-startup 3d/Blender/creatormicro_3dmodel_01_claude.blend \
  --python 3d/scripts/render_states.py -- --out public/cinematic
```

**Não usar `--clips-only` nem `--only`** nesta rodada:

- `--clips-only` não renderiza pose nenhuma, e `main()` só grava o manifest
  `if manifest["poses"]` → **os clipes saem, mas o manifest não é escrito** e o
  app nunca vê os arquivos novos.
- `--only` filtra poses, e o manifest sai só com as poses filtradas → o app
  perde as outras.

Uma rodada completa também garante que stills e clipes saiam do mesmo `.blend`
(mesmo `rev`, mesma luz).

### 3.3 Conferir antes de commitar

1. **Arquivos:** `public/cinematic/clips/` com 14 `.mp4`. Os 6 novos são
   `edit-knob`, `knob-edit`, `edit-wheel`, `wheel-edit`, `knob-wheel` e `wheel-knob`.
2. **Manifest:** `clips` com 14 entradas, `stage` 1440×776. Resolução ainda não muda (§5).
3. **Olho nos clipes, principalmente `knob ↔ wheel`:**
   - a câmera não atravessa o knob nem o case no meio do arco;
   - o pad fica **à esquerda do drawer o tempo todo**: nenhum frame intermediário
     com o sujeito passando de x ≈ 0,5 do quadro (o drawer cobre o resto);
   - o primeiro frame de cada clipe bate com o still da pose de origem e o último
     com o da pose de destino. O player troca still↔vídeo sem fade longo, e
     diferença de enquadramento aparece como um tranco.
4. Se `knob ↔ wheel` passar por dentro de geometria ou ficar feio, a saída é tirar
   esse par e deixar `knob → edit → wheel` (2 clipes curtos, sem voltar ao topo).
   O `route()` atual só sabe usar o hub como intermediário. Nesse caso, avisar
   para ajustar o planner no Mac.

### 3.4 Atualizar o teste do planner

`test/cinematic.test.ts`, teste "roteia pelo hub quando não existe clipe direto".
Hoje ele usa `knob → wheel` como exemplo de rota com 2 passos, e com o anel isso
passa a ser 1 passo. Trocar o corpo por:

```ts
  it("roteia direto entre poses abertas e pelo hub no resto", () => {
    expect(route(manifest, "top", "top")).toEqual([]);
    expect(route(manifest, "top", "knob")).toHaveLength(1);
    // anel das poses de drawer aberto: não volta ao topo
    expect(route(manifest, "edit", "knob")).toHaveLength(1);
    expect(route(manifest, "knob", "wheel")).toHaveLength(1);
    expect(route(manifest, "wheel", "edit")).toHaveLength(1);
    // sem clipe direto, passa pelo hub
    const cross = route(manifest, "idle", "edit");
    expect(cross).toHaveLength(2);
    expect(cross![0].clip.to).toBe(manifest.hub);
    expect(cross![1].clip.to).toBe("edit");
  });
```

Depois: `npm test`. Os outros testes de cinematic não dependem do formato do grafo.

### 3.5 Commitar e subir

```bash
git add 3d/scripts/poses.py public/cinematic test/cinematic.test.ts
git commit -m "Acervo: transições diretas entre as poses de drawer aberto"
git push
```

Não commitar o `.blend` sem decidir antes (regra que já vale).

## 4. Como fica no app depois do render

| Usuário faz                   | Toca                         |
|-------------------------------|------------------------------|
| clica numa tecla (drawer fechado) | `top→edit` / `top→knob` / `top→wheel` |
| tecla comum → outra tecla comum   | nada; o contorno desliza (app) |
| tecla comum → knob                | `edit→knob` |
| knob → roda                       | `knob→wheel` |
| fecha o drawer                    | `X→top` |

**Interrupção no meio:** o `reroute()` continua valendo. Exemplo: indo
`top→knob`, o usuário clica na roda. O plano vira `top→knob` + `knob→wheel`
("continue"), em vez de rebobinar até o topo. Fica fluido e sem código novo. Se
parecer lento, dá para ajustar no Mac para rebobinar quando o destino novo for
alcançável direto da origem.

## 5. O que NÃO misturar nesta rodada

**Re-render em 1440×900 (tela cheia).** A UI V 2.0 põe o render atrás de header e
footer, e hoje o app compensa escalando o acervo 1440×776 e cortando as laterais
(`RENDER_X_CLOSED` / `RENDER_X_OPEN` em `src/ui/cinematic/stage.ts`). Mudar a
resolução exige mudar `poses.py` (`STAGE_H`, `SUBJECT_X_TARGET`) **e** o app ao mesmo
tempo. É outra rodada, combinada antes. Fazer as duas juntas deixa impossível
saber qual mudança causou um problema.

## 6. Transição tecla → tecla (sem render, fica no Mac)

Para registro: as 12 teclas comuns dividem a pose `edit` de propósito (12 poses
seriam 12 stills e dezenas de clipes). O movimento entre elas é do app:

- **feito:** contorno laranja desliza e se deforma da tecla anterior para a nova
  (320 ms); conteúdo do drawer entra com fade de baixo para cima;
- **possível depois, também sem render:** um "respiro" de câmera em 2D, com a
  caixa do render deslizando alguns px e com zoom de ~1–2% na direção da tecla
  selecionada. Isso dá sensação de câmera andando sem clipe novo.
