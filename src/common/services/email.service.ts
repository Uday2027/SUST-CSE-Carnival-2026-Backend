import nodemailer from 'nodemailer';

import PdfService from '../../modules/pdf/pdf.service.js';

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
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || `"SUST CSE Carnival" <${process.env.EMAIL_USER}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send email');
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
      subject: 'Your SUST CSE Carnival Admin Account',
      html,
      text: `Welcome to SUST CSE Carnival Admin Panel\n\nYour login credentials:\nEmail: ${email}\nTemporary Password: ${password}\n\nPlease change your password after first login.`,
    });
  }

  async sendBulkEmail(recipients: string[], subject: string, body: string): Promise<{ sent: number; failed: number }> {
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
    team: any // Type: Team & { members: Member[], payments: Payment[] }
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
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
    let attachments: EmailOptions['attachments'] = [];
    try {
      const pdfBuffer = await PdfService.generateReceiptPDF(team);
      attachments.push({
        filename: `SUST_CSE_Carnival_Receipt_${team.teamName.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    } catch (error) {
      console.error('Failed to generate PDF attachment:', error);
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
