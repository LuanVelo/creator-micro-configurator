# CLAUDE.md — Creator Micro Configurator

Software próprio para configurar o **Work Louder Creator Micro (Figma Edition)**,
substituindo o app VIA por uma ferramenta sob medida: perfis por aplicativo,
detecção de SO, RGB por layer e config versionada em git.

Este documento é o contrato do projeto. Leia antes de escrever qualquer código.
Prosa em PT-BR; identificadores, comandos e código em inglês.

---

## 1. Por que este projeto existe

Reimplementar o VIA não vale o esforço. O que justifica construir:

1. **Perfil por app em foco** — Figma carrega um conjunto de 4 layers, Blender
   carrega outro, Claude Code outro. As 4 layers de hardware viram perfis
   ilimitados. O VIA não faz isso.
2. **Mac/Windows automático** — detecta o SO e aplica a notação certa, matando o
   `CG_TOGG` e as 3 macros de Quick Actions que hoje são gambiarra.
3. **Config como código** — o mapa vira arquivo TS versionado, não blob de EEPROM.
4. **Fonte única de verdade** — o mesmo arquivo que grava o teclado gera o cheat
   sheet visual. Cola de referência nunca desatualiza.
5. **RGB por layer** — cor de cada tecla puxada da mesma config, casando com o
   esquema visual.

Se uma decisão de design ferir um destes cinco pontos, ela está errada.

---

## 2. Vocabulário (travar antes de codar)

Quatro palavras vão colidir o tempo todo. Definição canônica:

- **Layer** — uma das 4 camadas de hardware do keymap. Selecionada pelo sensor
  capacitivo (o "smiley"). É o que a feature 08 chama de "4 configurações".
- **Keymap** — o estado completo que vive fisicamente no pad: 4 layers × 12 teclas
  + encoders + RGB. O teclado guarda **um** keymap por vez (firmware VIA de fábrica).
- **Preset** — um snapshot reutilizável salvo na biblioteca do app. Ilimitados.
  Contém um keymap completo (as 4 layers). É o que "Salvar" (07) cria.
- **Profile** (só na Fase 2) — um preset ligado a um aplicativo, aplicado
  automaticamente quando aquele app ganha foco.

**Distinção crítica — os verbos da lista do usuário:**
- **Salvar** (07) = gravar preset na biblioteca do app. Não toca no hardware.
- **Upload** (06) = empurrar um preset (ou uma layer só) para o teclado.

Preset vive no app. Layer vive no pad. Nunca confundir os dois.

---

## 3. Hardware (verificado + a confirmar)

**Verificado:**
- Work Louder Creator Micro, Figma Edition.
- 12 teclas em cruz (grade 4×4 sem os 4 cantos).
- 2 encoders: roda serrilhada (canto sup. esq.), knob grande (canto sup. dir.).
  Cada um: girar CW, girar CCW, clicar = 3 ações. Total 6 ações de encoder.
- Sensor capacitivo ("smiley", canto inf. dir.) + LEDs indicadores de layer.
- Logo Figma no canto inf. esq. (decorativo).
- RGB por tecla (visível: verde e vermelho independentes).
- Firmware QMK, upstream como `work_louder/micro`, VIA-enabled.
- Bootloader por hardware: segurar a roda sup. esq. enquanto pluga → modo flash.

**A CONFIRMAR na Fase 0 (bloqueia decisões de arquitetura):**
- [ ] **MCU: AVR (ATmega32U4) ou ARM (RP2040)?** Determina a estratégia de EEPROM.
      Método: `qmk info -kb work_louder/micro` → campos `processor` e `bootloader`.
      AVR = EEPROM real, 1KB, ~100k ciclos/célula → desgaste é risco.
      RP2040 = EEPROM emulada em flash com wear leveling → risco muito menor.
- [ ] **RGB é RGB Matrix (canal 3) ou RGBLIGHT (canal 2)?** Provavelmente Matrix
      (LED por tecla). Confirma qual canal o firmware responde.
- [ ] **layer_count real** (comando `0x11`). Esperado: 4. Se for 3, revisar o mapa.
- [ ] **Mapa matriz (row, col) → tecla física.** Ler keymap e comparar com o VIA.
- [ ] **O que o sensor capacitivo dispara?** É tecla comum na matriz ou evento
      próprio? Define se dá pra remapear sem firmware.
- [ ] **Contagem e posição dos LEDs no RGB Matrix.** Necessário pro RGB por layer.

---

## 4. Protocolo (Raw HID / VIA)

Transporte: **WebHID** (`navigator.hid`), `usagePage: 0xFF60`, `usage: 0x61`.
Pacotes de **32 bytes**, fixos. Byte 0 = command ID. Resposta ecoa no mesmo tamanho.

### Command IDs (usar exatamente estes — não inventar)

| ID     | Nome                            | Uso |
|--------|---------------------------------|-----|
| `0x01` | get_protocol_version            | handshake |
| `0x04` | dynamic_keymap_get_keycode      | ler 1 tecla (layer,row,col) |
| `0x05` | dynamic_keymap_set_keycode      | gravar 1 tecla |
| `0x06` | dynamic_keymap_reset            | zerar keymap dinâmico (recuperação) |
| `0x07` | id_custom_set_value             | RGB e features custom (ver canais) |
| `0x08` | id_custom_get_value             | ler RGB/custom |
| `0x09` | id_custom_save                  | persistir RGB/custom na EEPROM |
| `0x0A` | eeprom_reset                    | **PROIBIDO** — apaga tudo |
| `0x0B` | bootloader_jump                 | **PROIBIDO** — some da lista USB |
| `0x0F` | dynamic_keymap_macro_set_buffer | gravar macros |
| `0x11` | dynamic_keymap_get_layer_count  | quantas layers |
| `0x12` | dynamic_keymap_get_buffer       | ler bloco de keymap |
| `0x13` | dynamic_keymap_set_buffer       | gravar bloco (upload em lote) |
| `0x14` | dynamic_keymap_get_encoder      | ler encoder |
| `0x15` | dynamic_keymap_set_encoder      | gravar encoder |

Keycode = 16 bits (2 bytes, big-endian no payload). `set_buffer` grava vários de
uma vez: as 4 layers (48 keycodes = 96 bytes) saem em ~4 pacotes.

### Canais do RGB (`0x07`/`0x08`/`0x09`, byte 1 = channel_id)

| channel_id | canal                      |
|------------|----------------------------|
| `0`        | id_custom_channel (features próprias) |
| `1`        | id_qmk_backlight_channel   |
| `2`        | id_qmk_rgblight_channel    |
| `3`        | id_qmk_rgb_matrix_channel  |
| `5`        | id_qmk_led_matrix_channel  |

Values do RGB Matrix (canal 3, byte 2 = value_id): `1` brightness, `2` effect,
`3` effect_speed, `4` color (HSV).

**Limite do protocolo padrão:** o RGB via VIA é **global** — cor/brilho/efeito do
teclado inteiro. "Pintar a tecla 5 de azul e a 6 de vermelho por layer" **não**
existe no protocolo. RGB por-tecla-por-layer exige firmware custom (Fase 3).

---

## 5. Arquitetura em 3 níveis

Cada nível reaproveita 100% da camada de protocolo do anterior. A lógica cara
(perfis, detecção de app, formato de config, cheat sheet) é idêntica; muda só o
que acontece no fim. **Isolar isso atrás de `applyProfile(profile)` desde o dia 1.**

### Nível 1 — Cliente WebHID (Fases 0–1)
Página web, sem instalação, roda no Mac e no Windows (Chrome/Edge — WebHID não
existe em Safari/Firefox). Valida leitura/escrita numa tarde. Sem daemon, sem
troca automática.

### Nível 2 — Tauri + daemon (Fase 2)
Tauri 2 (Rust). Camada HID via crate `hidapi`. Watcher de app em foco:
`NSWorkspace` no macOS, `GetForegroundWindow` no Windows. Detecção de SO. É o
nível que entrega o motivo do projeto. Referência pronta: `qmk_hid` da Framework
(CLI em Rust que já faz a parte HID).

### Nível 3 — Fork do firmware (Fase 3, opcional)
Fork de `work_louder/micro`. Resolve de vez os dois problemas mais difíceis:
- **Troca de layer sem desgaste** — comando custom no canal `0x07` chamando
  `layer_move(n)`. Estado de layer vive em RAM → zero escrita em EEPROM.
- **RGB por-tecla-por-layer** — `rgb_matrix_kb.inc` que lê a layer ativa e pinta
  cada LED por uma tabela. ~30 linhas de C.
- **Perfis em FLASH** — `keymaps[]` em PROGMEM, EEPROM sai da equação.

---

## 6. Modelo de dados (fonte única de verdade)

Config em módulos TS tipados. Um preset descreve o keymap inteiro:

```ts
type Keycode = string;              // ex: "KC_TRNS", "LSFT(KC_A)", "MACRO_00"

interface EncoderMap {
  cw: Keycode;                      // girar horário
  ccw: Keycode;                     // girar anti-horário
  click: Keycode;                   // clicar
}

interface Layer {
  index: 0 | 1 | 2 | 3;
  name: string;                     // "Estrutura", "Alinhar", ...
  keys: Keycode[];                  // 12, ordem física definida na Fase 0
  encoders: [EncoderMap, EncoderMap];
  rgb?: LayerRGB;                   // só aplicado com firmware custom (Fase 3)
}

interface Preset {
  id: string;
  name: string;
  targetOS: "mac" | "win" | "both"; // "both" = notação Mac + CG_TOGG
  layers: [Layer, Layer, Layer, Layer];
  macros: Macro[];                  // Quick Actions etc.
  rgbGlobal: RGBGlobal;             // brightness/effect/color (protocolo padrão)
}

interface Profile {                 // Fase 2
  app: string;                      // bundle id (mac) / exe name (win)
  presetId: string;
}
```

Deste preset saem **três** artefatos, sempre em sincronia:
1. bytes de keymap para upload (Fases 1–2);
2. o **cheat sheet HTML** (reusar o já feito — `creator-micro-figma.html`);
3. (Fase 3) o `keymap.c` para `qmk compile`.

Validar todo keycode contra uma tabela conhecida **antes** de gravar. Nunca
escrever string que não resolve para keycode válido.

---

## 7. Fases e critérios de "pronto"

### Fase 0 — Discovery & Safety (SÓ LEITURA)
Nenhuma escrita. Habilitar apenas `0x01`, `0x04`, `0x11`, `0x12`, `0x14`.
- Conectar via WebHID, ler protocol version e layer_count.
- Dump completo das 4 layers + encoders; renderizar e conferir contra o VIA.
- Mapear (row, col) → tecla física.
- Resolver todos os itens "a confirmar" da seção 3.
- Importar o JSON existente do VIA (não recomeçar do zero).

**Pronto quando:** o estado completo do pad é lido e bate 1:1 com o que o VIA mostra.

### Fase 1 — Editor + presets locais (ESCRITA, keymap dinâmico)
- Modelo Preset vs Layer implementado.
- Editar 1 tecla (feature 04) e várias teclas (05).
- Editar os 2 encoders (6 ações).
- Salvar preset na biblioteca sem upload (07).
- Upload de preset completo **e** de uma layer só para o pad (06 + 08 — "escolher
  em qual layer gravar").
- **Backup automático** do estado do pad antes do primeiro write da sessão +
  botão de restaurar.
- Guards de segurança (seção 8) ativos.
- RGB global por preset (canal 3).
- (stretch) Editor de macros (`0x0F`) — destrava as 3 Quick Actions do swap.

**Pronto quando:** round-trip editar → upload → ler de volta bate exato; o backup
restaura o estado anterior sem perda.

### Fase 2 — Daemon + perfis automáticos (Tauri)
- Portar a camada HID para Rust (`hidapi`) por trás da mesma interface.
- Watcher de app em foco (macOS + Windows).
- Detecção de SO → notação certa, elimina `CG_TOGG`.
- Mapa app→preset com **debounce (~3s de permanência)** e **escrita só do diff**.
- Tudo atrás de `applyProfile(profile)`.

**Pronto quando:** alternar foco Figma↔Blender troca a config ativa sem nenhuma
escrita redundante (verificado por log de bytes enviados).

### Fase 3 — Fork do firmware (opcional)
- Comando custom para trocar layer ativa (RAM, zero EEPROM).
- `rgb_matrix_kb.inc`: cor por tecla por layer.
- Perfis residentes em FLASH.
- Remap do sensor capacitivo se necessário.

**Pronto quando:** trocar de layer gera zero escrita em EEPROM e cada layer exibe
sua própria paleta.

---

## 8. Regras de segurança (INEGOCIÁVEIS)

Estas valem em todo o código, todas as fases:

1. **NUNCA** enviar `0x0A` (eeprom_reset) ou `0x0B` (bootloader_jump) fora de uma
   ação explícita do usuário atrás de diálogo de confirmação. Guard de uma linha
   no início do `send()` que rejeita esses IDs por padrão.
2. **SEMPRE** fazer snapshot do estado do pad antes do primeiro write de cada
   sessão. Sem backup, sem escrita.
3. **Validar** todo keycode contra tabela conhecida antes de `0x05`/`0x13`.
4. **Default read-only.** Modo escrita é opt-in explícito na UI.
5. Respeitar o tamanho de report de **32 bytes** exatamente — nunca truncar.
6. Primeira escrita de teste sempre numa tecla da **fileira de cima** (a menos
   usada), nunca numa tecla crítica.

**Recuperação (documentar na UI):** `0x06` reseta o keymap dinâmico; segurar a
roda sup. esq. ao plugar entra em bootloader; em último caso, recompilar o
firmware de fábrica com `qmk flash -kb work_louder/micro`. Nada aqui é permanente.

---

## 9. Desgaste de EEPROM — estratégia

Só é problema real no cenário do daemon (Fase 2) regravando o dia inteiro em MCU
AVR. Mitigação em camadas, da mais barata à definitiva:
1. **Escrever só o diff** + debounce (Fase 2). QMK já usa `eeprom_update_*`
   (pula bytes iguais), então trocar entre perfis que compartilham keycodes
   desgasta menos.
2. **Trocar de layer em vez de reescrever keycodes** (Fase 3) → zero EEPROM.
3. **Perfis em FLASH** (Fase 3) → EEPROM sai da equação, funciona até com EEPROM
   morta.

Se já houver desgaste: diagnosticar escrevendo padrão conhecido → despluga → lê →
diff para mapear bytes falhos. Remediar realocando a região do keymap dinâmico
para área virgem, ou migrando para FLASH.

---

## 10. Stack e convenções

- **Fase 1:** Vite + TypeScript + React. WebHID puro. Tailwind. Sem backend.
  **Chrome/Edge apenas** (documentar — WebHID não roda em Safari/Firefox).
- **Fase 2:** Tauri 2 + Rust (`hidapi`). Mesmo frontend React na webview.
  Watcher nativo de foco.
- **Fase 3:** fork QMK de `work_louder/micro`.
- Config = módulos TS tipados, versionados em git. Validação de schema (Zod).
- Camada de protocolo isolada e testável sem hardware (mock do `send()`).
- `applyProfile(profile)` é a fronteira entre lógica e transporte — nada de HID
  vazando pra cima dela.

**Não fazer:** inventar command IDs; escrever sem backup; misturar preset e layer;
acoplar detecção de app à lógica de escrita; assumir MCU antes de confirmar.

---

## 11. Questões em aberto (resolver antes de fechar escopo)

- MCU (AVR vs RP2040) — mais impactante; resolve na Fase 0.
- "4 configurações" = 4 layers? Confirmar que o usuário não espera 4 keymaps
  independentes (firmware de fábrica só guarda um).
- Sensor capacitivo: remapeável sem firmware?
- Formato exato do buffer de macro (`0x0F`) — parte mais chata do protocolo.
- Precisa do device definition JSON da Work Louder para o mapa da matriz, ou
  descobrir empiricamente na Fase 0?
