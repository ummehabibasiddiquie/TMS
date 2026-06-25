import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromName = process.env.SMTP_FROM_NAME;

    console.log('Email Service Configuration Check:');
    console.log('- SMTP_HOST:', host ? '✓ Set' : '✗ Missing');
    console.log('- SMTP_PORT:', port ? '✓ Set' : '✗ Missing');
    console.log('- SMTP_USER:', user ? '✓ Set' : '✗ Missing');
    console.log('- SMTP_PASS:', pass ? '✓ Set' : '✗ Missing');
    console.log('- SMTP_FROM_NAME:', fromName ? '✓ Set' : '✗ Missing');

    if (!host || !port || !user || !pass || !fromName) {
      console.warn('Email service not configured. Missing SMTP environment variables.');
      return;
    }

    this.config = {
      host,
      port: parseInt(port),
      user,
      pass,
      fromName,
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
    });

    console.log('Email transporter initialized successfully');
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter || !this.config) {
      console.error('Email service not configured');
      return false;
    }

    try {
      console.log('Attempting to send email to:', options.to);
      const info = await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.user}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    const subject = 'Password Reset Request';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for the Training Management System.</p>
            <p>Click the button below to reset your password:</p>
            <center>
              <a href="${resetLink}" class="button">Reset Password</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${resetLink}</p>
            <p><strong>This link expires in 15 minutes.</strong></p>
            <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>Training Management System - Transform Solution</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      Hello,
      
      We received a request to reset your password for the Training Management System.
      
      Reset Link: ${resetLink}
      
      This link expires in 15 minutes.
      
      If you did not request this password reset, please ignore this email and your password will remain unchanged.
      
      Training Management System - Transform Solution
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }
}

// Singleton instance
export const emailService = new EmailService();
