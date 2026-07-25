/**
 * Schemas Zod: validam tanto o formato de export do VIA quanto o nosso Preset.
 */
import { z } from "zod";

/** Formato do arquivo `*.layout.json` exportado pelo VIA. */
export const viaLayoutSchema = z.object({
  name: z.string(),
  vendorProductId: z.number(),
  macros: z.array(z.string()),
  /** layers[L] = array flat de keycodes (row-major). */
  layers: z.array(z.array(z.string())),
  /** encoders[encoderIdx][layerIdx] = [ccw, cw]. */
  encoders: z.array(z.array(z.tuple([z.string(), z.string()]))).optional(),
});
export type ViaLayout = z.infer<typeof viaLayoutSchema>;

export const encoderMapSchema = z.object({
  ccw: z.string(),
  cw: z.string(),
  click: z.string().optional(),
});

export const layerRgbSchema = z.object({
  hue: z.number().int().min(0).max(255),
  sat: z.number().int().min(0).max(255),
  val: z.number().int().min(0).max(255),
});

export const layerSchema = z.object({
  index: z.number().int().min(0),
  name: z.string(),
  keys: z.array(z.string()),
  encoders: z.array(encoderMapSchema),
  rgb: layerRgbSchema.optional(),
});

export const macroSchema = z.object({
  index: z.number().int().min(0),
  actions: z.string(),
});

export const rgbGlobalSchema = z.object({
  brightness: z.number().int().min(0).max(255),
  effect: z.number().int().min(0),
  effectSpeed: z.number().int().min(0).max(255),
  hue: z.number().int().min(0).max(255),
  sat: z.number().int().min(0).max(255),
});

export const presetSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  targetOS: z.enum(["mac", "win", "both"]),
  layers: z.array(layerSchema),
  macros: z.array(macroSchema),
  rgbGlobal: rgbGlobalSchema.optional(),
});

export type PresetInput = z.input<typeof presetSchema>;
