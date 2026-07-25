/**
 * VIA Raw HID command IDs. Estes são os IDs canônicos do firmware VIA — não
 * inventar nem alterar (§4 do CLAUDE.md). Conferidos 1:1 com `via.h` do upstream.
 */
export const VIA_CMD = {
  get_protocol_version: 0x01,
  get_keyboard_value: 0x02,
  set_keyboard_value: 0x03,
  dynamic_keymap_get_keycode: 0x04,
  dynamic_keymap_set_keycode: 0x05,
  dynamic_keymap_reset: 0x06,
  id_custom_set_value: 0x07,
  id_custom_get_value: 0x08,
  id_custom_save: 0x09,
  /** PROIBIDO — apaga tudo. Bloqueado pelo guard. */
  eeprom_reset: 0x0a,
  /** PROIBIDO — some da lista USB. Bloqueado pelo guard. */
  bootloader_jump: 0x0b,
  dynamic_keymap_macro_get_count: 0x0c,
  dynamic_keymap_macro_get_buffer_size: 0x0d,
  dynamic_keymap_macro_get_buffer: 0x0e,
  dynamic_keymap_macro_set_buffer: 0x0f,
  dynamic_keymap_macro_reset: 0x10,
  dynamic_keymap_get_layer_count: 0x11,
  dynamic_keymap_get_buffer: 0x12,
  dynamic_keymap_set_buffer: 0x13,
  dynamic_keymap_get_encoder: 0x14,
  dynamic_keymap_set_encoder: 0x15,
} as const;

export type ViaCommandName = keyof typeof VIA_CMD;
export type ViaCommandId = (typeof VIA_CMD)[ViaCommandName];

/** Comandos destrutivos que o guard rejeita por padrão (§8, regra 1). */
export const FORBIDDEN_COMMANDS: ReadonlySet<number> = new Set([
  VIA_CMD.eeprom_reset,
  VIA_CMD.bootloader_jump,
]);

/**
 * Comandos que escrevem no teclado. Bloqueados enquanto o app está em
 * read-only (§8, regra 4). Leitura (0x01, 0x04, 0x08, 0x0C..0x0E, 0x11, 0x12,
 * 0x14) fica sempre liberada.
 */
export const WRITE_COMMANDS: ReadonlySet<number> = new Set([
  VIA_CMD.set_keyboard_value,
  VIA_CMD.dynamic_keymap_set_keycode,
  VIA_CMD.dynamic_keymap_reset,
  VIA_CMD.id_custom_set_value,
  VIA_CMD.id_custom_save,
  VIA_CMD.dynamic_keymap_macro_set_buffer,
  VIA_CMD.dynamic_keymap_macro_reset,
  VIA_CMD.dynamic_keymap_set_buffer,
  VIA_CMD.dynamic_keymap_set_encoder,
]);

/** Canais do `id_custom_*` (byte 1). Valores do protocolo VIA. */
export const VIA_CHANNEL = {
  custom: 0,
  qmk_backlight: 1,
  qmk_rgblight: 2,
  qmk_rgb_matrix: 3,
  qmk_audio: 4,
  qmk_led_matrix: 5,
} as const;

/** value_id do canal RGB Matrix (byte 2). */
export const RGB_MATRIX_VALUE = {
  brightness: 1,
  effect: 2,
  effect_speed: 3,
  color: 4,
} as const;
