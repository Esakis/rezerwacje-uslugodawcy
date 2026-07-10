// Abstrakcja bramki SMS (PLAN.md sekcja 3: "abstrakcja providera od pierwszego dnia").
// Zmiana bramki = jedna linia w konfiguracji (SMS_PROVIDER).

export interface SendSmsInput {
  to: string; // numer w formacie +48...
  body: string;
  from?: string; // nazwa nadawcy
}

export interface SendSmsResult {
  ok: boolean;
  costGrosze: number;
  error?: string;
  providerId?: string; // id wiadomości u operatora (jeśli jest)
}

export interface SmsProvider {
  name: string;
  send(input: SendSmsInput): Promise<SendSmsResult>;
}
