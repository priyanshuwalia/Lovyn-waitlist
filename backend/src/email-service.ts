import * as nodemailer from "nodemailer";
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
      reason: "Email delivery is disabled for this environment.",
    };
  }
}

class SmtpWaitlistEmailService implements WaitlistEmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly emailConfig: Extract<AppConfig["email"], { enabled: true }>) {
    this.transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      auth:
        emailConfig.smtp.user && emailConfig.smtp.pass
          ? {
              user: emailConfig.smtp.user,
              pass: emailConfig.smtp.pass,
            }
          : undefined,
    });
  }

  async sendWaitlistConfirmation(participant: WaitlistSubmission): Promise<EmailDeliveryResult> {
    await this.transporter.sendMail({
      from: this.emailConfig.from,
      to: participant.email,
      subject: "You're on the Lovyn waitlist",
      text: [
        `Hi ${participant.fullName},`,
        "",
        "Thank you for joining the Lovyn waitlist. We received your request and will keep you posted as access opens.",
        "",
        "Lovyn",
      ].join("\n"),
      html: [
        `<p>Hi ${escapeHtml(participant.fullName)},</p>`,
        "<p>Thank you for joining the Lovyn waitlist. We received your request and will keep you posted as access opens.</p>",
        "<p>Lovyn</p>",
      ].join(""),
    });

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

  return new SmtpWaitlistEmailService(config.email);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
