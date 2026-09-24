import type { AppConfig } from "./config";
import type { WaitlistSubmission } from "./waitlist-contract";

export type EmailDeliveryResult =
  | {
      status: "SENT";
      sentAt: Date;
    }
  | {
      status: "SKIPPED";
      reason: string;
    };

export interface WaitlistEmailService {
  sendWaitlistConfirmation(participant: WaitlistSubmission): Promise<EmailDeliveryResult>;
}

class DisabledEmailService implements WaitlistEmailService {
  async sendWaitlistConfirmation(): Promise<EmailDeliveryResult> {
    return {
      status: "SKIPPED",
      reason: "Brevo email delivery is disabled for this environment.",
    };
  }
}

class BrevoWaitlistEmailService implements WaitlistEmailService {
  private static readonly apiUrl = "https://api.brevo.com/v3/smtp/email";

  constructor(private readonly emailConfig: Extract<AppConfig["email"], { enabled: true }>) {}

  async sendWaitlistConfirmation(participant: WaitlistSubmission): Promise<EmailDeliveryResult> {
    const response = await fetch(BrevoWaitlistEmailService.apiUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": this.emailConfig.brevo.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: this.emailConfig.brevo.senderEmail,
          name: this.emailConfig.brevo.senderName,
        },
        to: [
          {
            email: participant.email,
            name: participant.fullName,
          },
        ],
        subject: "You're on the Lovyn waitlist",
        textContent: createTextEmail(participant),
        htmlContent: createHtmlEmail(participant),
      }),
    });

    if (!response.ok) {
      throw new Error(`Brevo rejected the confirmation email: ${await readBrevoError(response)}`);
    }

    return {
      status: "SENT",
      sentAt: new Date(),
    };
  }
}

export function createWaitlistEmailService(config: AppConfig): WaitlistEmailService {
  if (!config.email.enabled) {
    return new DisabledEmailService();
  }

  return new BrevoWaitlistEmailService(config.email);
}

function createTextEmail(participant: WaitlistSubmission) {
  return [
    `Hi ${participant.fullName},`,
    "",
    "Thank you for joining the Lovyn waitlist. We received your request and will keep you posted as access opens.",
    "",
    "Lovyn",
  ].join("\n");
}

function createHtmlEmail(participant: WaitlistSubmission) {
  return [
    `<p>Hi ${escapeHtml(participant.fullName)},</p>`,
    "<p>Thank you for joining the Lovyn waitlist. We received your request and will keep you posted as access opens.</p>",
    "<p>Lovyn</p>",
  ].join("");
}

async function readBrevoError(response: Response) {
  const fallback = `${response.status} ${response.statusText}`.trim();

  try {
    const body = (await response.json()) as unknown;

    if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
      return body.message;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
