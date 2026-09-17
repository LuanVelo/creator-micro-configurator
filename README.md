# Creator Micro Configurator (keymap)

Configurador sob medida para o **Work Louder Creator Micro (Figma Edition)**,
uma alternativa ao VIA com foco em **perfis por aplicativo**, detecção de SO,
RGB por layer e config versionada em git.

**▶ Abrir online: https://luanvelo.github.io/creator-micro-configurator/**
(Chrome ou Edge; sem o teclado, use **"ou simular (mock)"**)

> Prosa em PT-BR; identificadores, comandos e código em inglês.
> O contrato completo do projeto está em [`CLAUDE.md`](CLAUDE.md).

## Por que existe

- **Perfil por app em foco**: cada app (Figma, Blender, Photoshop…) carrega seu
  conjunto de layers automaticamente.
- **Mac/Windows automático**: detecta o SO e aplica a notação certa.
- **Config como código**: o mapa vira arquivo TS versionado, não blob de EEPROM.
- **Fonte única de verdade**: o mesmo arquivo grava o teclado e gera o cheat sheet.
- **RGB por layer**: cor de cada tecla puxada da mesma config.

## Status

- **Fase 0 (Discovery, read-only): concluída no hardware.** Dump das 4 layers,
  encoders e macros bate 1:1 com o backup do VIA. MCU ATmega32U4 (AVR), matriz
  4×4, RGB Matrix (ws2812). Ver [`docs/phase0-findings.md`](docs/phase0-findings.md).
- **Fase 1 (Editor + presets locais): em andamento.**
  - Escrita no pad ligada (`0x05`/`0x13`/`0x15`), com validação de keycode antes de
    qualquer write e backup de sessão ao conectar.
  - Biblioteca de presets (criar, renomear, duplicar, excluir), salva no navegador.
  - Editor de tecla e encoders com atalhos por app (Figma, Photoshop, Illustrator, Blender).
  - Pad em dois modos: **fast** (SVG) e **cine** (render pré-renderizado do Blender,
    com transições entre as poses).
  - Foco atual: UI (ícones e interações).
- **Fase 2 (Tauri + daemon) e Fase 3 (fork do firmware):** planejadas.

## Stack

Vite · TypeScript · React 19 · Tailwind v4 · Zustand · Zod · Vitest · three.js.
Transporte **WebHID**: roda em **Chrome/Edge** (não em Safari/Firefox).

O app é uma tela fixa de **1440×900**. Em janelas de outro tamanho ela escala
mantendo a proporção, para o render bater com a interface.

## Rodar

```bash
npm install
npm run app        # janela própria 1440×900 (Chrome/Edge em modo app)
npm run dev        # no navegador: http://localhost:5173
npm test           # vitest (protocolo e planner testados sem hardware)
npm run typecheck
```

## Publicação

Todo push no `main` roda testes, build e publica no GitHub Pages
([`.github/workflows/pages.yml`](.github/workflows/pages.yml)). O build usa
`BASE_PATH=/creator-micro-configurator/`; localmente o app fica na raiz.

## Acervo cinematográfico

Stills e clipes em `public/cinematic/` saem do Blender com
[`3d/scripts/render_states.py`](3d/scripts/render_states.py); poses e transições
estão em [`3d/scripts/poses.py`](3d/scripts/poses.py). Detalhes em
[`docs/cinematic-instrucoes.md`](docs/cinematic-instrucoes.md) e
[`docs/transicoes-secundarias.md`](docs/transicoes-secundarias.md). O modelo 3D
está documentado em [`3d/CLAUDE.md`](3d/CLAUDE.md).

## Segurança

A camada de protocolo bloqueia comandos destrutivos (`0x0A` eeprom_reset,
`0x0B` bootloader_jump), força reports de 32 bytes, valida todo keycode antes de
escrever e exige backup de sessão antes do primeiro write. Detalhes no §8 do
[`CLAUDE.md`](CLAUDE.md).

## Licença

Uso pessoal. Sem afiliação com a Work Louder.
