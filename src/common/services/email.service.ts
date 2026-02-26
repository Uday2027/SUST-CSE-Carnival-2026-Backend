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
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() { }

  /**
   * Refreshes the Gmail OAuth2 access token using credentials from .env
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.CLIENT_ID!,
          client_secret: process.env.CLIENT_SECRET!,
          refresh_token: process.env.REFRESH_TOKEN!,
          grant_type: "refresh_token",
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        throw new Error(`Failed to refresh Gmail access token: ${response.status} ${JSON.stringify(data)}`);
      }

      this.accessToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in || 3600) * 1000;

      return this.accessToken!;
    } catch (error) {
      console.error("Gmail Token Refresh Error:", error);
      throw new Error("Email authentication failed");
    }
  }

  /**
   * Builds a raw RFC 2822 MIME message including headers, body, and attachments
   */
  private buildMimeMessage(options: EmailOptions): string {
    const boundary = "sust_cse_carnival_boundary_" + Date.now().toString(16);
    const to = Array.isArray(options.to) ? options.to.join(", ") : options.to;
    const from = process.env.EMAIL_FROM || `"SUST CSE Carnival 2026" <${process.env.EMAIL_USER}>`;

    let message = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${options.subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: quoted-printable",
      "",
      options.html,
      "",
    ];

    if (options.attachments && options.attachments.length > 0) {
      for (const attachment of options.attachments) {
        const content = typeof attachment.content === 'string'
          ? Buffer.from(attachment.content).toString("base64")
          : attachment.content.toString("base64");

        message.push(
          `--${boundary}`,
          `Content-Type: ${attachment.contentType || "application/octet-stream"}`,
          "Content-Transfer-Encoding: base64",
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          "",
          content,
          ""
        );
      }
    }

    message.push(`--${boundary}--`);

    return Buffer.from(message.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const rawMessage = this.buildMimeMessage(options);

      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: rawMessage }),
        }
      );

      const data = (await response.json()) as any;

      if (!response.ok) {
        console.error("Gmail API Error:", data);
        throw new Error(`Gmail API responded with ${response.status}`);
      }
    } catch (error) {
      console.error("Email sending failed:", error);
      throw new Error("Failed to send email");
    }
  }

  async sendAdminCreationEmail(email: string, password: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3d5a30; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: white; padding: 20px; border-left: 4px solid #3d5a30; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background: #3d5a30; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to SUST CSE Carnival Admin Panel</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>An admin account has been created for you to manage the SUST CSE Carnival 2026 system.</p>
              <div class="credentials">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
              </div>
              <p>If you have any questions, please contact the super admin immediately.</p>
              <div class="footer"><p>SUST CSE Carnival 2026 - Admin Panel</p></div>
            </div>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail({ to: email, subject: "Your SUST CSE Carnival Admin Account", html });
  }

  async sendBulkEmail(recipients: string[], subject: string, body: string, attachments?: EmailOptions["attachments"]): Promise<{ sent: number; failed: number }> {
    let sent = 0; let failed = 0;
    for (const recipient of recipients) {
      try {
        await this.sendEmail({ to: recipient, subject, html: body, attachments });
        sent++;
      } catch (error) { failed++; }
    }
    return { sent, failed };
  }

  async sendTeamRegistrationConfirmation(team: any): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const paymentLink = `${frontendUrl}/checkout/${team.uniqueId}`;
    const html = `<h1>Registration Successful! 🎉</h1><p>Team: ${team.teamName}</p><p><a href="${paymentLink}">Complete Payment</a></p>`;
    let attachments: EmailOptions["attachments"] = [];
    try {
      const pdfBuffer = await PdfService.generateReceiptPDF(team);
      attachments.push({ filename: `Receipt_${team.teamName}.pdf`, content: pdfBuffer, contentType: "application/pdf" });
    } catch (e) { }
    await this.sendEmail({ to: team.members.map((m: any) => m.email), subject: "Registration Confirmed", html, attachments });
  }

  async sendTeamSelectionEmail(team: any): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const paymentLink = `${frontendUrl}/checkout/${team.uniqueId}`;
    const html = `<h1>Selected! 🎉</h1><p>Team: ${team.teamName}</p><p><a href="${paymentLink}">Complete Payment</a></p>`;
    await this.sendEmail({ to: team.members.map((m: any) => m.email), subject: "Selected for Carnival", html });
  }
}

export default new EmailService();
