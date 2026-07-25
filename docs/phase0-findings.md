# Fase 0 — Findings

> Documento vivo. Rodado no **teclado real** (WebHID, 2026-07-24). O critério
> crítico da Fase 0 — "estado completo do pad lido e bate 1:1 com o VIA" — está
> **cumprido no hardware** (0 divergências). Restam itens de gate para as Fases 2/3.

## Confirmado no hardware ✅

- **Transporte:** WebHID no Chrome/Edge, device real.
- **Protocol version:** `0x000C` (VIA protocol 12).
- **VID/PID:** `0x574C` / `0xE6E3`. `0x574C` = Work Louder.
- **Layers:** 4 (0x11 confirmou).
- **Matriz:** 16 slots por layer (4×4). Cantos = roda (sup.esq.), knob (sup.dir.),
  smiley (inf.dir.), logo/vazio (inf.esq.). 12 teclas no meio.
- **Encoders (API VIA):** só `ccw`/`cw`, formato `encoders[enc][layer] = [ccw, cw]`.
  Click **não** está na API 0x14/0x15.
- **Macros:** count **16**, buffer **823 bytes**.
- **Encoding especial CONFIRMADO** (dump bateu 1:1, nenhuma divergência):
  - `TO(n)` = `0x5200 + n` · `MACRO(n)` = `0x7700 + n` · `RGB_TOG` = `0x7820`.
  - → escritas da Fase 1 podem confiar nestes valores (não são mais "best-effort").
- **Keymap bate 1:1 com o backup VIA:** SIM, **0 divergências em 4 layers**.

## Gate ainda aberto (não bloqueia Fase 1)

- [ ] **MCU: AVR (ATmega32U4) vs RP2040** → estratégia de EEPROM (Fase 2).
      Via `qmk info -kb work_louder/micro` ou repo da Work Louder.
- [ ] **RGB: canal 3 (Matrix) vs 2 (RGBLIGHT)** — sondar `0x08` nos dois (adicionar à página).
- [ ] **Encoder click**: é slot de matriz (qual índice?) ou firmware?
- [ ] **Mapa (row,col) → slot físico** exato (temos o layout visual; falta casar índices).
- [ ] **Smiley/sensor capacitivo**: tecla de matriz ou evento próprio?
- [ ] **Contagem/posição dos LEDs** no RGB Matrix (RGB por layer, Fase 3).
