/**
 * Fronteira de transporte. Toda a camada acima (via.ts, model, UI) fala só com
 * esta interface — nada de WebHID/Tauri/hidapi vaza para cima (§5, §10).
 *
 * Implementações:
 *  - WebHIDTransport  (Fases 0–1, navegador)
 *  - MockTransport    (testes, sem hardware)
 *  - TauriTransport   (Fase 2, Rust hidapi) — futuro
 */
export interface Transport {
  /** Rótulo curto para UI/log (ex: "WebHID", "Mock"). */
  readonly name: string;

  isConnected(): boolean;

  /** Abre o device. Em WebHID exige gesto do usuário (botão conectar). */
  connect(): Promise<void>;

  disconnect(): Promise<void>;

  /**
   * Envia um report de EXATAMENTE 32 bytes (byte 0 = command ID) e resolve com
   * a resposta de 32 bytes. Rejeita se desconectado ou em timeout.
   */
  send(report: Uint8Array): Promise<Uint8Array>;
}

export class TransportError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TransportError";
  }
}
