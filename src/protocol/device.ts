/**
 * Constantes físicas do Work Louder Creator Micro (Figma Edition).
 *
 * CONFIRMADO na Fase 0: dump ao vivo (protocol 0x000C) bateu 1:1 com o backup,
 * e a geometria/MCU vieram do `work_louder/micro` no QMK (fonte autoritativa).
 * Ver docs/phase0-findings.md.
 */
export const CREATOR_MICRO = {
  /** 0x574C = "WL" = Work Louder. */
  vendorId: 0x574c,
  productId: 0xe6e3,
  /** Raw HID / VIA (§4). */
  usagePage: 0xff60,
  usage: 0x61,
  /** Tamanho fixo do report (§8, regra 5). Nunca truncar. */
  reportSize: 32,

  /** MCU: AVR ATmega32U4 → EEPROM real (~100k ciclos). Desgaste é risco (Fase 2). */
  processor: "atmega32u4",
  bootloader: "atmel-dfu",

  layerCount: 4,
  /** rows*cols = 16 keycodes por layer. */
  matrixSize: 16,
  matrixRows: 4,
  matrixCols: 4,
  /** 2 encoders (roda serrilhada D4/D6 + knob B0/B1). */
  encoderCount: 2,
  /** RGB Matrix ws2812 no canal 3. Brilho máx 150. */
  rgbChannel: 3,
  rgbMaxBrightness: 150,
} as const;

export type DeviceGeometry = typeof CREATOR_MICRO;
