import type { SendSmsInput, SendSmsResult, SmsProvider } from "./provider";

// Bramka „SMS z telefonu usługodawcy" — aplikacja SMS Gate (https://sms-gate.app).
// Usługodawca włącza w aplikacji tryb Cloud Server i przepisuje login + hasło
// do ustawień BookEasy. SMS wychodzi z jego karty SIM — koszt dla nas: 0.
// Uwaga: "ok" oznacza, że chmura przyjęła zlecenie, nie że telefon je wysłał.
export class PhoneGatewayProvider implements SmsProvider {
  name = "phone";
  private login: string;
  private password: string;

  constructor(login: string, password: string) {
    this.login = login;
    this.password = password;
  }

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const auth = Buffer.from(`${this.login}:${this.password}`).toString("base64");
    try {
      const res = await fetch("https://api.sms-gate.app/3rdparty/v1/message", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          textMessage: { text: input.body },
          phoneNumbers: [input.to],
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          ok: false,
          costGrosze: 0,
          error: `SMS Gate HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
        };
      }
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      return { ok: true, costGrosze: 0, providerId: data.id };
    } catch (e) {
      return { ok: false, costGrosze: 0, error: (e as Error).message };
    }
  }
}
