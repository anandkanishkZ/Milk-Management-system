import nodemailer from 'nodemailer';
import config from '@/config';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email?.host || 'smtp.gmail.com',
      port: config.email?.port || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.email?.user,
        pass: config.email?.pass,
      },
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, name: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${config.app.frontendUrl}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: config.email?.from || 'noreply@dhudhwala.com',
      to,
      subject: 'Welcome to Dudh Wala - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to Dudh Wala! 🥛</h2>
          
          <p>Hi ${name},</p>
          
          <p>Thank you for registering with Dudh Wala. To complete your registration and start managing your milk delivery business, please verify your email address.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          
          <p>This verification link will expire in 24 hours.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #666; font-size: 14px;">
            If you didn't create an account with Dudh Wala, you can safely ignore this email.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Dudh Wala Team
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${to}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw error to prevent registration failure
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<void> {
    const resetUrl = `${config.app.frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: config.email?.from || 'noreply@dhudhwala.com',
      to,
      subject: 'Dudh Wala - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Password Reset Request 🔐</h2>
          
          <p>Hi ${name || 'there'},</p>
          
          <p>We received a request to reset your password for your Dudh Wala account. If you didn't make this request, you can safely ignore this email.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          
          <p><strong>This reset link will expire in 1 hour.</strong></p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #dc2626;"><strong>Security Note:</strong></p>
            <p style="margin: 5px 0 0 0; color: #666;">If you didn't request this password reset, please secure your account immediately and contact our support team.</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Dudh Wala Team
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${to}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't throw error to prevent the reset flow failure
    }
  }

  /**
   * Send email verification success notification
   */
  async sendEmailVerifiedNotification(to: string, name: string): Promise<void> {
    const mailOptions = {
      from: config.email?.from || 'noreply@dhudhwala.com',
      to,
      subject: 'Dudh Wala - Email Verified Successfully! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Email Verified Successfully! 🎉</h2>
          
          <p>Hi ${name},</p>
          
          <p>Great news! Your email address has been successfully verified. You now have full access to all Dudh Wala features.</p>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #16a34a;"><strong>What's Next?</strong></p>
            <ul style="margin: 10px 0 0 0; color: #666;">
              <li>Add your customers and their delivery preferences</li>
              <li>Track daily milk deliveries</li>
              <li>Manage payments and generate reports</li>
              <li>Set up delivery schedules</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.app.frontendUrl}/dashboard" 
               style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #666; font-size: 14px;">
            If you need any help getting started, feel free to reach out to our support team.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Dudh Wala Team
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email verification success notification sent to ${to}`);
    } catch (error) {
      console.error('Failed to send email verification notification:', error);
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();