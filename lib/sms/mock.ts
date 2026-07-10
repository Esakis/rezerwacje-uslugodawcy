import type { SendSmsInput, SendSmsResult, SmsProvider } from "./provider";

// Mock: nie wysyła realnie, wypisuje SMS do konsoli. Do developmentu i demo.
// Koszt szacunkowy ~8 gr/SMS (zgodny z ekonomią z PLAN.md).
export class MockSmsProvider implements SmsProvider {
  name = "mock";

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const from = input.from || "BookEasy";
    // eslint-disable-next-line no-console
    console.log(
      `\n📱 [SMS MOCK] od "${from}" do ${input.to}:\n${input.body}\n`
    );
    return { ok: true, costGrosze: 8 };
  }
}
