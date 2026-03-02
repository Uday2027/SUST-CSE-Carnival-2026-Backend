import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import PdfService from "../../modules/pdf/pdf.service.js";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
}

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "email-smtp.ap-southeast-1.amazonaws.com",
      port: Number(process.env.EMAIL_PORT) || 465,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASSWORD!,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from:
          process.env.EMAIL_FROM ||
          `SUST CSE Carnival 2026<${process.env.EMAIL_USER}>`,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.isBuffer(a.content)
            ? a.content.toString("base64")
            : a.content,
          encoding: Buffer.isBuffer(a.content) ? "base64" : undefined,
          contentType: a.contentType,
        })),
      });
    } catch (error) {
      console.error("Email sending failed:", error);
      throw new Error("Failed to send email");
    }
  }

  // ─── Shared inline style constants (Gmail-safe) ──────────────────────────
  private readonly C = {
    primary: "#3d5a30",
    primaryDark: "#2d4324",
    bg: "#fffff4",
    bgCard: "#ffffff",
    text: "#1a1a1a",
    muted: "#6b7280",
    accent: "#f59e0b",
    font: "Inter, Arial, sans-serif",
  };

  /**
   * Builds the full HTML email layout with inline styles.
   * All CSS is inlined so it survives Gmail's aggressive style stripping.
   */
  private buildEmail(opts: {
    badge: string;
    headerColor?: string;
    accentColor?: string;
    content: string;
  }): string {
    const { badge, content } = opts;
    const headerBg = opts.headerColor || this.C.primary;
    const accentBg = opts.accentColor || this.C.accent;
    const f = this.C.font;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" />
</head>
<body style="margin:0;padding:0;background-color:#fffff4;font-family:${f};">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#fffff4;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:${headerBg};border-radius:16px 16px 0 0;padding:40px 32px 32px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center">
                    <div style="width:56px;height:56px;border-radius:16px;background-color:rgba(255,255,255,0.2);color:#ffffff;font-size:20px;font-weight:700;font-family:${f};line-height:56px;text-align:center;margin:0 auto 12px;display:block;">SCC</div> 
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 4px;letter-spacing:-0.02em;font-family:${f};">SUST CSE Carnival</p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="color:rgba(255,255,255,0.6);font-size:13px;font-weight:600;margin:0;letter-spacing:0.2em;text-transform:uppercase;font-family:${f};">— 2026 —</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:12px;">
                    <span style="display:inline-block;background-color:rgba(255,255,255,0.2);color:#ffffff;padding:6px 16px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-family:${f};">${badge}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ACCENT STRIP -->
          <tr>
            <td style="height:4px;background-color:${accentBg};font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#ffffff;border-radius:0 0 16px 16px;padding:0 32px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;" />
              <p style="color:#6b7280;font-size:12px;line-height:18px;text-align:center;margin:0 0 4px;font-family:${f};">SUST CSE Carnival 2026 &middot; Shahjalal University of Science &amp; Technology</p>
              <p style="color:#9ca3af;font-size:11px;line-height:16px;text-align:center;margin:0;font-family:${f};">This is an automated email. Please do not reply directly to this message.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /** Reusable inline-styled CTA button */
  private btn(href: string, label: string): string {
    return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0 20px;">
      <tr>
        <td align="center">
          <a href="${href}" style="display:inline-block;background-color:#3d5a30;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:10px;font-family:${this.C.font};">${label}</a>
        </td>
      </tr>
    </table>`;
  }

  /** Reusable inline-styled info card (amber accent) */
  private card(content: string): string {
    return `<div style="background-color:#f8faf7;border-radius:12px;border:1px solid rgba(61,90,48,0.1);border-left:4px solid #3d5a30;padding:24px;margin:24px 0;">${content}</div>`;
  }

  /** Reusable inline-styled muted card (for quotes/original text) */
  private mutedCard(content: string): string {
    return `<div style="background-color:rgba(0,0,0,0.02);border-radius:12px;border:1px solid #e5e7eb;border-left:4px solid #9ca3af;padding:24px;margin:24px 0;">${content}</div>`;
  }

  /** Reusable inline link row below a button */
  private linkRow(href: string): string {
    const f = this.C.font;
    return `<p style="font-size:12px;color:#9ca3af;text-align:center;margin:0 0 24px;font-family:${f};">Or copy this link: <a href="${href}" style="color:#3d5a30;word-break:break-all;">${href}</a></p>`;
  }

  /** Row inside info card: label + value */
  private cardRow(label: string, value: string, topBorder = false): string {
    const f = this.C.font;
    const border = topBorder ? "border-top:1px solid #e5e7eb;" : "";
    return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${border}">
      <tr>
        <td style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding:10px 0;width:130px;font-family:${f};">${label}</td>
        <td style="font-size:14px;font-weight:600;color:#1a1a1a;padding:10px 0;font-family:${f};">${value}</td>
      </tr>
    </table>`;
  }

  async sendAdminCreationEmail(email: string, password: string): Promise<void> {
    const f = this.C.font;
    const html = this.buildEmail({
      badge: "🔑 Admin Provisioning",
      headerColor: this.C.primary,
      accentColor: "#6366f1",
      content: `
        <p style="font-size:22px;font-weight:700;color:#3d5a30;margin:0 0 24px;line-height:30px;font-family:${f};">Admin Account Provisioned</p>
        <p style="font-size:15px;line-height:26px;color:#374151;margin:0 0 16px;font-family:${f};">A new operator account has been activated on the system. You can use the credentials below to access the admin panel.</p>
        ${this.card(`
          ${this.cardRow("Email", email)}
          ${this.cardRow("Temporary Password", `<span style="font-family:monospace;background:#f0fdf4;color:#3d5a30;padding:3px 8px;border-radius:6px;">${password}</span>`, true)}
        `)}
        ${this.btn(`${process.env.FRONTEND_URL}/admin/login`, "Access Admin Panel →")}
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0 0 24px;font-family:${f};">Change your password immediately after first login.</p>
      `,
    });
    await this.sendEmail({
      to: email,
      subject: "[SUST CSE Carnival 2026] Admin Account Activated",
      html,
    });
  }

  async sendBulkEmail(
    recipients: string[],
    subject: string,
    body: string,
    attachments?: EmailOptions["attachments"],
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    for (const recipient of recipients) {
      try {
        await this.sendEmail({
          to: recipient,
          subject,
          html: body,
          attachments,
        });
        sent++;
      } catch (error) {
        failed++;
      }
    }
    return { sent, failed };
  }

  async sendTeamRegistrationConfirmation(team: any): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const paymentLink = `${frontendUrl}/checkout/${team.uniqueId}`;
    const f = this.C.font;
    const html = this.buildEmail({
      badge: "🎯 Registration Confirmed",
      headerColor: this.C.primary,
      accentColor: this.C.accent,
      content: `
        <p style="font-size:22px;font-weight:700;color:#3d5a30;margin:0 0 16px;line-height:30px;font-family:${f};">Registration Successful! 🎉</p>
        <p style="font-size:15px;line-height:26px;color:#374151;margin:0 0 24px;font-family:${f};">Your team has been successfully registered for <strong>SUST CSE Carnival 2026</strong>.</p>
        ${this.card(`
          <p style="font-size:14px;font-weight:700;color:#3d5a30;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.05em;font-family:${f};">Team Details</p>
          ${this.cardRow("Team Name", team.teamName)}
          ${this.cardRow("Competition", team.segment, true)}
          ${this.cardRow("Institution", team.institution, true)}
        `)}
        <p style="font-size:16px;font-weight:700;color:#1a1a1a;margin:28px 0 16px;font-family:${f};">Next Steps</p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
          <tr>
            <td style="width:28px;height:28px;border-radius:50%;background-color:#3d5a30;color:#ffffff;font-size:13px;font-weight:700;text-align:center;line-height:28px;vertical-align:top;font-family:${f};">1</td>
            <td style="font-size:14px;line-height:22px;color:#374151;padding:4px 0 12px 12px;vertical-align:top;font-family:${f};"><strong>Complete Payment</strong> &mdash; Use the button below to pay now or later.</td>
          </tr>
          <tr>
            <td style="width:28px;height:28px;border-radius:50%;background-color:#3d5a30;color:#ffffff;font-size:13px;font-weight:700;text-align:center;line-height:28px;vertical-align:top;font-family:${f};">2</td>
            <td style="font-size:14px;line-height:22px;color:#374151;padding:4px 0 12px 12px;vertical-align:top;font-family:${f};"><strong>Official Receipt</strong> &mdash; We have attached your registration receipt to this email.</td>
          </tr>
        </table>
        ${this.btn(paymentLink, "Go to Checkout →")}
        ${this.linkRow(paymentLink)}
      `,
    });
    let attachments: EmailOptions["attachments"] = [];
    try {
      const pdfBuffer = await PdfService.generateReceiptPDF(team);
      attachments.push({
        filename: `Receipt_${team.teamName}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      });
    } catch (e) {}
    await this.sendEmail({
      to: team.members.map((m: any) => m.email),
      subject: `[SUST CSE Carnival 2026] Registration Confirmed — ${team.teamName}`,
      html,
      attachments,
    });
  }

  async sendTeamSelectionEmail(team: any): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const paymentLink = `${frontendUrl}/checkout/${team.uniqueId}`;
    const f = this.C.font;
    const memberCount = Array.isArray(team.members) ? team.members.length : 0;

    const html = this.buildEmail({
      badge: "🎉 Selection Confirmed",
      headerColor: this.C.primary,
      accentColor: this.C.accent,
      content: `
        <p style="font-size:14px;font-weight:600;color:#3d5a30;margin:0 0 4px;font-family:${f};">Congratulations!</p>
        <p style="font-size:15px;line-height:26px;color:#374151;margin:0 0 24px;font-family:${f};">Your team has been officially <strong style="color:#3d5a30;">selected</strong> to participate in <strong>SUST CSE Carnival 2026</strong>.</p>
        ${this.card(`
          <p style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 16px;font-family:${f};">Team Details:</p>
          ${this.cardRow("Team Name", team.teamName)}
          ${this.cardRow("Competition", team.segment, true)}
          ${this.cardRow("Members", String(memberCount), true)}
        `)}
        <p style="font-size:16px;font-weight:700;color:#1a1a1a;margin:28px 0 12px;font-family:${f};">Next Steps:</p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
          <tr>
            <td style="font-size:14px;line-height:24px;color:#374151;padding:4px 0 10px 0;vertical-align:top;font-family:${f};">
              &bull;&nbsp;<strong>Complete Payment:</strong> Use the button below to pay now or later.
            </td>
          </tr>
          <tr>
            <td style="font-size:14px;line-height:24px;color:#374151;padding:4px 0 10px 0;vertical-align:top;font-family:${f};">
              &bull;&nbsp;<strong>Official Receipt:</strong> We have attached your registration receipt to this email.
            </td>
          </tr>
          <tr>
            <td style="font-size:14px;line-height:24px;color:#374151;padding:4px 0 10px 0;vertical-align:top;font-family:${f};">
              &bull;&nbsp;<strong>Stay Updated:</strong> Keep an eye on our website for schedule and event details.
            </td>
          </tr>
        </table>
        ${this.btn(paymentLink, "Complete Payment")}
        <p style="font-size:12px;color:#3d5a30;text-align:center;margin:0 0 24px;font-family:${f};">Unique Payment Link: <a href="${paymentLink}" style="color:#3d5a30;word-break:break-all;">${paymentLink}</a></p>
        <p style="font-size:14px;line-height:22px;color:#374151;margin:0;font-family:${f};">If you have any questions, please contact the organizing committee.</p>
      `,
    });

    console.log(team);

    const recipients = team.members.map((m: any) => m.email);
    await this.sendEmail({
      to: recipients,
      subject: `[SUST CSE Carnival 2026] Team ${team.teamName} You are Selected for ${team.segment} Final Round`,
      html,
    });
  }

  async sendFaqAnswerEmail(team: any, faq: any): Promise<void> {
    const f = this.C.font;
    const html = this.buildEmail({
      badge: "💬 Inquiry Resolved",
      headerColor: this.C.primary,
      accentColor: "#06b6d4",
      content: `
        <p style="font-size:22px;font-weight:700;color:#3d5a30;margin:0 0 24px;line-height:30px;font-family:${f};">Response to Your Inquiry</p>
        <p style="font-size:15px;line-height:26px;color:#374151;margin:0 0 24px;font-family:${f};">Hi, Team <strong>${team.teamName}</strong>! Our team has reviewed your inquiry and prepared a response below.</p>
        ${this.mutedCard(`
          <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;font-family:${f};">Your Question</p>
          <p style="font-size:15px;font-style:italic;color:#374151;margin:0;line-height:26px;font-family:${f};">&ldquo;${faq.question}&rdquo;</p>
        `)}
        ${this.card(`
          <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;font-family:${f};">Our Response</p>
          <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;line-height:26px;font-family:${f};">${faq.answer}</p>
        `)}
        <p style="font-size:14px;line-height:22px;color:#6b7280;margin:24px 0 0;border-top:1px solid #e5e7eb;padding-top:24px;font-family:${f};">If you have further questions, feel free to submit another inquiry via the portal.</p>
      `,
    });

    const recipients = team.members.map((m: any) => m.email);
    await this.sendEmail({
      to: recipients,
      subject: `[SUST CSE Carnival 2026] Response to Your Inquiry`,
      html,
    });
  }

  async sendPaymentConfirmationEmail(team: any, payment: any): Promise<void> {
    const f = this.C.font;
    const memberCount = Array.isArray(team.members) ? team.members.length : 0;

    const html = this.buildEmail({
      badge: "✅ Payment Confirmed",
      headerColor: this.C.primary,
      accentColor: "#22c55e",
      content: `
        <p style="font-size:22px;font-weight:700;color:#22c55e;margin:0 0 16px;line-height:30px;font-family:${f};">Payment Successful! 🎉</p>
        <p style="font-size:15px;line-height:26px;color:#374151;margin:0 0 24px;font-family:${f};">Your payment for <strong>SUST CSE Carnival 2026</strong> has been confirmed. Your team is now officially registered.</p>
        ${this.card(`
          <p style="font-size:14px;font-weight:700;color:#22c55e;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.05em;font-family:${f};">Payment Details</p>
          ${this.cardRow("Team Name", team.teamName)}
          ${this.cardRow("Competition", team.segment, true)}
          ${this.cardRow("Members", String(memberCount), true)}
          ${this.cardRow("Amount Paid", `৳${payment.amount.toLocaleString()}`, true)}
          ${this.cardRow("Transaction ID", `<code style="background-color:#e5e7eb;padding:2px 6px;border-radius:4px;font-family:monospace;">${payment.transactionId}</code>`, true)}
        `)}
        <div style="text-align:center;margin:0 0 24px;">
          <div style="display:inline-block;background-color:#22c55e;color:#ffffff;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.05em;font-family:${f};">✓ PAYMENT VERIFIED</div>
        </div>
        <p style="font-size:15px;line-height:26px;color:#374151;margin:0 0 16px;font-family:${f};">A registration receipt with a QR code has been attached to this email. Please save it for check-in at the event.</p>
        <p style="font-size:14px;line-height:22px;color:#6b7280;margin:0;font-family:${f};">If you have any questions, please contact the organizing committee.</p>
      `,
    });

    let attachments: EmailOptions["attachments"] = [];
    try {
      const pdfBuffer = await PdfService.generateReceiptPDF(team);
      attachments.push({
        filename: `Receipt_${team.teamName}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      });
    } catch (e) {
      console.error(
        "Failed to generate PDF for payment confirmation email:",
        e,
      );
    }

    const recipients = team.members.map((m: any) => m.email);
    await this.sendEmail({
      to: recipients,
      subject: `[SUST CSE Carnival 2026] Payment Confirmed — ${team.teamName}`,
      html,
      attachments,
    });
  }
}

export default new EmailService();
