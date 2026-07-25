# Creator Micro Configurator (keymap)

Configurador sob medida para o **Work Louder Creator Micro (Figma Edition)** —
uma alternativa ao VIA com foco em **perfis por aplicativo**, detecção de SO,
RGB por layer e config versionada em git.

> Prosa em PT-BR; identificadores, comandos e código em inglês.
> O contrato completo do projeto está em [`CLAUDE.md`](CLAUDE.md).

## Por que existe

- **Perfil por app em foco** — cada app (Figma, Blender, Photoshop…) carrega seu
  conjunto de layers automaticamente.
- **Mac/Windows automático** — detecta o SO e aplica a notação certa.
- **Config como código** — o mapa vira arquivo TS versionado, não blob de EEPROM.
- **Fonte única de verdade** — o mesmo arquivo grava o teclado e gera o cheat sheet.
- **RGB por layer** — cor de cada tecla puxada da mesma config.

## Status

- **Fase 0 — Discovery & Safety (read-only): concluída no hardware.** Dump das 4
  layers + encoders + macros bate 1:1 com o backup do VIA. MCU confirmada
  (ATmega32U4/AVR), matriz 4×4, RGB Matrix (ws2812). Ver [`docs/phase0-findings.md`](docs/phase0-findings.md).
- **Fase 1 — Editor + presets locais: em andamento.** UI web (arte vetorial exata
  do Figma), seletor de ações por app (Figma/Photoshop/Illustrator/Blender),
  edição em memória. Falta a escrita no hardware (upload).
- **Fase 2 (Tauri + daemon) e Fase 3 (fork do firmware):** planejadas.

## Stack

Vite · TypeScript · React 19 · Tailwind v4 · Zustand · Zod · Vitest.
Transporte **WebHID** — roda em **Chrome/Edge** (não em Safari/Firefox).

## Rodar

```bash
npm install
npm run dev      # abre em http://localhost:5173 (use Chrome/Edge)
npm test         # vitest (camada de protocolo testada sem hardware)
npm run typecheck
```

Para a descoberta (Fase 0): abra o app, conecte o Creator Micro e clique em
**"Conectar teclado (WebHID)"** — leitura read-only, nenhuma escrita.

## Segurança

A camada de protocolo bloqueia comandos destrutivos (`0x0A` eeprom_reset,
`0x0B` bootloader_jump), força reports de 32 bytes, valida todo keycode antes de
escrever e exige backup de sessão antes do primeiro write. Detalhes no §8 do
[`CLAUDE.md`](CLAUDE.md).

## Licença

Uso pessoal. Sem afiliação com a Work Louder.
