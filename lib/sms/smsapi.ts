import type { SendSmsInput, SendSmsResult, SmsProvider } from "./provider";

// Realna bramka SMSAPI.pl (https://www.smsapi.pl/docs/).
// Wymaga tokena OAuth (SMSAPI_TOKEN). Numer w formacie międzynarodowym bez "+".
export class SmsApiProvider implements SmsProvider {
  name = "smsapi";
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const to = input.to.replace(/^\+/, "").replace(/\s/g, "");
    const params = new URLSearchParams({
      to,
      message: input.body,
      format: "json",
      encoding: "utf-8",
    });
    if (input.from) params.set("from", input.from);

    try {
      const res = await fetch("https://api.smsapi.pl/sms.do", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const data = (await res.json()) as {
        error?: number;
        message?: string;
        count?: number;
        list?: Array<{ id: string; points: number }>;
      };

      if (data.error) {
        return { ok: false, costGrosze: 0, error: data.message || `SMSAPI error ${data.error}` };
      }
      const first = data.list?.[0];
      // points to koszt w kredytach; przelicz orientacyjnie (1 pkt ~ 0.09 zł).
      const costGrosze = first ? Math.round((first.points ?? 0) * 9) : 8;
      return { ok: true, costGrosze, providerId: first?.id };
    } catch (e) {
      return { ok: false, costGrosze: 0, error: (e as Error).message };
    }
  }
}
