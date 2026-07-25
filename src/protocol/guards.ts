/**
 * Guardas de segurança (§8 do CLAUDE.md). Todas moram entre a camada de alto
 * nível e o transporte real, dentro do `send()`. Inegociáveis.
 */
import { CREATOR_MICRO } from "./device.ts";
import { FORBIDDEN_COMMANDS, WRITE_COMMANDS } from "./commands.ts";
import { type Transport, TransportError } from "./transport.ts";

export class GuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardError";
  }
}

/** Regra 5: report de 32 bytes exatos. Nunca truncar. */
export function assertReportSize(report: Uint8Array): void {
  if (report.length !== CREATOR_MICRO.reportSize) {
    throw new GuardError(
      `Report deve ter ${CREATOR_MICRO.reportSize} bytes, recebido ${report.length}.`,
    );
  }
}

/** Regra 1: 0x0A/0x0B só passam com confirmação explícita. */
export function assertNotForbidden(commandId: number, allowForbidden: boolean): void {
  if (FORBIDDEN_COMMANDS.has(commandId) && !allowForbidden) {
    throw new GuardError(
      `Comando 0x${commandId.toString(16).padStart(2, "0")} é destrutivo e está ` +
        `bloqueado. Só é permitido atrás de diálogo de confirmação explícito.`,
    );
  }
}

/** Regra 4: escrita é opt-in. Em read-only, comandos de escrita são rejeitados. */
export function assertWriteAllowed(commandId: number, writeEnabled: boolean): void {
  if (WRITE_COMMANDS.has(commandId) && !writeEnabled) {
    throw new GuardError(
      `Comando de escrita 0x${commandId.toString(16).padStart(2, "0")} bloqueado: ` +
        `o app está em modo read-only. Habilite o modo escrita explicitamente.`,
    );
  }
}

export interface GuardPolicy {
  /** Estado do modo escrita (default read-only). */
  isWriteEnabled(): boolean;
  /** true só durante um fluxo de confirmação de 0x0A/0x0B. Default: nunca. */
  allowForbidden?(): boolean;
}

/**
 * Decora qualquer Transport aplicando as guardas no início de cada `send()`.
 * Este é o "guard de uma linha no início do send()" do §8, materializado como
 * wrapper para não depender de disciplina em cada call-site.
 */
export class GuardedTransport implements Transport {
  constructor(
    private readonly inner: Transport,
    private readonly policy: GuardPolicy,
  ) {}

  get name(): string {
    return this.inner.name;
  }

  isConnected(): boolean {
    return this.inner.isConnected();
  }

  connect(): Promise<void> {
    return this.inner.connect();
  }

  disconnect(): Promise<void> {
    return this.inner.disconnect();
  }

  // async: converte throws síncronos dos guards em rejeições de Promise,
  // que é o contrato de Transport.send.
  async send(report: Uint8Array): Promise<Uint8Array> {
    assertReportSize(report);
    const commandId = report[0];
    assertNotForbidden(commandId, this.policy.allowForbidden?.() ?? false);
    assertWriteAllowed(commandId, this.policy.isWriteEnabled());
    if (!this.inner.isConnected()) {
      throw new TransportError("Transporte desconectado.");
    }
    return this.inner.send(report);
  }
}
