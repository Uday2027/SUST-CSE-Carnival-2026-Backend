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

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

class EmailService {
  private tokenCache: TokenCache | null = null;

  /**
   * Exchanges the refresh token for a fresh access token via Google OAuth2.
   * Caches the token in-memory and refreshes 60s before expiry.
   */
  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.accessToken;
    }

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

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to refresh Gmail access token: ${response.status} ${errorBody}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.tokenCache = {
      accessToken: data.access_token,
      // Refresh 60 seconds before actual expiry
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    return this.tokenCache.accessToken;
  }

  /**
   * Builds an RFC 2822 MIME message string from the email options.
   * Supports HTML, plain text, and file attachments (multipart/mixed).
   */
  private buildMimeMessage(options: EmailOptions): string {
    const fromAddress =
      process.env.EMAIL_FROM ||
      `"SUST CSE Carnival 2026" <${process.env.EMAIL_USER}>`;
    const toAddress = Array.isArray(options.to)
      ? options.to.join(", ")
      : options.to;

    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const hasAttachments =
      options.attachments && options.attachments.length > 0;

    let message = "";

    // Headers
    message += `From: ${fromAddress}\r\n`;
    message += `To: ${toAddress}\r\n`;
    message += `Subject: ${options.subject}\r\n`;
    message += "MIME-Version: 1.0\r\n";

    if (hasAttachments) {
      // Multipart/mixed for attachments
      message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
      message += "\r\n";

      // -- Body part --
      const bodyBoundary = `body_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      message += `--${boundary}\r\n`;

      if (options.html && options.text) {
        // Multipart/alternative for HTML + plain text
        message += `Content-Type: multipart/alternative; boundary="${bodyBoundary}"\r\n`;
        message += "\r\n";

        message += `--${bodyBoundary}\r\n`;
        message += "Content-Type: text/plain; charset=UTF-8\r\n";
        message += "Content-Transfer-Encoding: 7bit\r\n\r\n";
        message += `${options.text}\r\n`;

        message += `--${bodyBoundary}\r\n`;
        message += "Content-Type: text/html; charset=UTF-8\r\n";
        message += "Content-Transfer-Encoding: 7bit\r\n\r\n";
        message += `${options.html}\r\n`;

        message += `--${bodyBoundary}--\r\n`;
      } else if (options.html) {
        message += "Content-Type: text/html; charset=UTF-8\r\n";
        message += "Content-Transfer-Encoding: 7bit\r\n\r\n";
        message += `${options.html}\r\n`;
      } else {
        message += "Content-Type: text/plain; charset=UTF-8\r\n";
        message += "Content-Transfer-Encoding: 7bit\r\n\r\n";
        message += `${options.text || ""}\r\n`;
      }

      // -- Attachment parts --
      for (const attachment of options.attachments!) {
        const contentBase64 =
          typeof attachment.content === "string"
            ? Buffer.from(attachment.content).toString("base64")
            : attachment.content.toString("base64");

        message += `--${boundary}\r\n`;
        message += `Content-Type: ${attachment.contentType || "application/octet-stream"}; name="${attachment.filename}"\r\n`;
        message += "Content-Transfer-Encoding: base64\r\n";
        message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n\r\n`;
        message += `${contentBase64}\r\n`;
      }

      message += `--${boundary}--\r\n`;
    } else {
      // No attachments
      if (options.html && options.text) {
        const altBoundary = `alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        message += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n`;
        message += "\r\n";

        message += `--${altBoundary}\r\n`;
        message += "Content-Type: text/plain; charset=UTF-8\r\n";
        message += "Content-Transfer-Encoding: 7bit\r\n\r\n";
        message += `${options.text}\r\n`;

        message += `--${altBoundary}\r\n`;
        message += "Content-Type: text/html; charset=UTF-8\r\n";
        message += "Content-Transfer-Encoding: 7bit\r\n\r\n";
        message += `${options.html}\r\n`;

        message += `--${altBoundary}--\r\n`;
      } else if (options.html) {
        message += "Content-Type: text/html; charset=UTF-8\r\n\r\n";
        message += `${options.html}\r\n`;
      } else {
        message += "Content-Type: text/plain; charset=UTF-8\r\n\r\n";
        message += `${options.text || ""}\r\n`;
      }
    }

    return message;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();
      const mimeMessage = this.buildMimeMessage(options);

      // Gmail API expects base64url-encoded RFC 2822 message
      const encodedMessage = Buffer.from(mimeMessage)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encodedMessage }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Gmail API send failed: ${response.status} ${errorBody}`,
        );
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
              
              <p><strong>⚠️ Important Security Notice:</strong></p>
              <ul>
                <li>Please change your password immediately after first login</li>
                <li>Do not share your credentials with anyone</li>
                <li>Keep your password secure</li>
              </ul>
              
              <p>If you did not expect this email or have any questions, please contact the super admin immediately.</p>
              
              <div class="footer">
                <p>SUST CSE Carnival 2026 - Admin Panel<br>This is an automated email, please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: "Your SUST CSE Carnival Admin Account",
      html,
      text: `Welcome to SUST CSE Carnival Admin Panel\n\nYour login credentials:\nEmail: ${email}\nTemporary Password: ${password}\n\nPlease change your password after first login.`,
    });
  }

  async sendBulkEmail(
    recipients: string[],
    subject: string,
    body: string,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        await this.sendEmail({
          to: recipient,
          subject,
          html: body,
        });
        sent++;
      } catch (error) {
        console.error(`Failed to send email to ${recipient}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  async sendTeamRegistrationConfirmation(
    team: any, // Type: Team & { members: Member[], payments: Payment[] }
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const paymentLink = `${frontendUrl}/checkout/${team.uniqueId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3d5a30; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .team-info { background: white; padding: 20px; border-left: 4px solid #3d5a30; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background: #3d5a30; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Registration Successful! 🎉</h1>
            </div>
            <div class="content">
              <p>Congratulations!</p>
              <p>Your team has been successfully registered for SUST CSE Carnival 2026.</p>
              
              <div class="team-info">
                <h3>Team Details:</h3>
                <p><strong>Team Name:</strong> ${team.teamName}</p>
                <p><strong>Competition:</strong> ${team.segment}</p>
                <p><strong>Members:</strong> ${team.members.length}</p>
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li><strong>Complete Payment:</strong> Use the button below to pay now or later.</li>
                <li><strong>Official Receipt:</strong> We have attached your registration receipt to this email.</li>
                <li><strong>Stay Updated:</strong> Keep an eye on our website for schedule and event details.</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="${paymentLink}" class="button">Go to Checkout</a>
              </p>
              
              <p style="color: #666; font-size: 14px;"><em>Unique Payment Link: ${paymentLink}</em></p>
              
              <p>If you have any questions, please contact the organizing committee.</p>
              
              <div class="footer">
                <p>SUST CSE Carnival 2026<br>This is an automated email, please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Generate PDF receipt buffer
    let attachments: EmailOptions["attachments"] = [];
    try {
      const pdfBuffer = await PdfService.generateReceiptPDF(team);
      attachments.push({
        filename: `SUST_CSE_Carnival_Receipt_${team.teamName.replace(/[^a-z0-9]/gi, "_")}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      });
    } catch (error) {
      console.error("Failed to generate PDF attachment:", error);
    }

    const recipients = team.members.map((m: any) => m.email);
    await this.sendEmail({
      to: recipients,
      subject: `Registration Confirmed - ${team.teamName} - SUST CSE Carnival 2026`,
      html,
      attachments,
    });
  }
}

export default new EmailService();
