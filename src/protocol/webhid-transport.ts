/**
 * Transporte real via WebHID (§4, §10). Chrome/Edge apenas — WebHID não existe
 * em Safari/Firefox. `connect()` exige gesto do usuário (clique) por exigência
 * da API.
 */
import { CREATOR_MICRO } from "./device.ts";
import { type Transport, TransportError } from "./transport.ts";

const RESPONSE_TIMEOUT_MS = 1000;

interface Pending {
  resolve: (data: Uint8Array) => void;
  reject: (err: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

export function isWebHidSupported(): boolean {
  return typeof navigator !== "undefined" && "hid" in navigator;
}

export class WebHIDTransport implements Transport {
  readonly name = "WebHID";
  private device: HIDDevice | null = null;
  private pending: Pending | null = null;
  /** Serializa os sends: VIA é estritamente request→response. */
  private queue: Promise<unknown> = Promise.resolve();

  private readonly onInputReport = (event: HIDInputReportEvent): void => {
    if (!this.pending) return;
    const data = new Uint8Array(event.data.buffer);
    const p = this.pending;
    this.pending = null;
    clearTimeout(p.timer);
    p.resolve(data);
  };

  isConnected(): boolean {
    return this.device?.opened ?? false;
  }

  async connect(): Promise<void> {
    if (!isWebHidSupported()) {
      throw new TransportError(
        "WebHID indisponível. Use Chrome ou Edge (não roda em Safari/Firefox).",
      );
    }
    const devices = await navigator.hid.requestDevice({
      filters: [
        { usagePage: CREATOR_MICRO.usagePage, usage: CREATOR_MICRO.usage },
        {
          vendorId: CREATOR_MICRO.vendorId,
          usagePage: CREATOR_MICRO.usagePage,
          usage: CREATOR_MICRO.usage,
        },
      ],
    });
    const device = devices[0];
    if (!device) throw new TransportError("Nenhum device selecionado.");
    if (!device.opened) await device.open();
    device.addEventListener("inputreport", this.onInputReport);
    this.device = device;
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      this.device.removeEventListener("inputreport", this.onInputReport);
      if (this.device.opened) await this.device.close();
      this.device = null;
    }
  }

  send(report: Uint8Array): Promise<Uint8Array> {
    // Encadeia neste send o anterior, garantindo um request em voo por vez.
    const run = this.queue.then(() => this.sendNow(report));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private sendNow(report: Uint8Array): Promise<Uint8Array> {
    const device = this.device;
    if (!device || !device.opened) {
      return Promise.reject(new TransportError("Device não conectado."));
    }
    return new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = null;
        reject(new TransportError(`Timeout esperando resposta (${RESPONSE_TIMEOUT_MS}ms).`));
      }, RESPONSE_TIMEOUT_MS);
      this.pending = { resolve, reject, timer };
      // reportId 0: raw HID VIA não usa numbered reports.
      device.sendReport(0, report).catch((err) => {
        clearTimeout(timer);
        this.pending = null;
        reject(new TransportError("Falha ao enviar report.", err));
      });
    });
  }
}
