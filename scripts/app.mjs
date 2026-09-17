/**
 * `npm run app`: abre o configurador numa janela própria, sem barra de
 * endereço nem abas, com área útil de exatamente 1440×900.
 *
 * Por que Chrome em modo app e não Tauri (ainda): o transporte da Fase 1 é
 * WebHID, que só existe no Chromium. A webview do Tauri no macOS (WKWebView)
 * não tem WebHID — empacotar em Tauri exige portar a camada HID para Rust
 * (`hidapi`), que é a Fase 2 do CLAUDE.md.
 *
 * Perfil do Chrome isolado em ~/.keymap-app: a janela nasce com o tamanho
 * pedido (um Chrome já aberto ignoraria --window-size) e a permissão de HID
 * fica separada do navegador do dia a dia.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const APP_W = 1440;
const APP_H = 900;

const candidates = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ],
  win32: [
    `${process.env["PROGRAMFILES"]}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["PROGRAMFILES(X86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ],
  linux: ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/microsoft-edge"],
}[process.platform] ?? [];

const browser = candidates.find((p) => p && existsSync(p));
if (!browser) {
  console.error("Não achei Chrome/Edge. WebHID só existe em navegadores Chromium.");
  process.exit(1);
}

const server = await createServer({ server: { open: false } });
await server.listen();
const base = server.resolvedUrls?.local[0] ?? "http://localhost:5173/";
// `?window=app` faz o app ajustar a janela para a área útil dar 1440×900 (main.tsx)
const url = `${base}?window=app`;

const chrome = spawn(
  browser,
  [
    `--app=${url}`,
    `--user-data-dir=${join(homedir(), ".keymap-app")}`,
    `--window-size=${APP_W},${APP_H}`,
    "--no-first-run",
    "--no-default-browser-check",
  ],
  { stdio: "ignore" },
);

console.log(`keymap aberto em janela própria (${url}). Feche a janela para encerrar.`);

const stop = async () => {
  await server.close();
  process.exit(0);
};
chrome.on("exit", stop);
process.on("SIGINT", () => {
  chrome.kill();
  void stop();
});
