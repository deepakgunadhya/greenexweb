import * as nodemailer from "nodemailer";
import { logger } from "../../utils/logger";
import prisma from "../../config/database";
// import {
//   generateEmailTemplate,
//   EmailTemplateData,
// } from "./templates/base.template";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface EmailNotification {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface MobileEnquiryData {
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  companyName?: string;
  serviceRequired?: string;
  message?: string;
  submittedAt: Date;
}

import { getEnquiryNotificationTemplate, getEnquiryNotificationText, getEnquiryAcknowledgmentTemplate, getEnquiryAcknowledgmentText } from "./templates/enquiry.template";

export class EmailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly config: EmailConfig;

  constructor() {
    this.config = this.getEmailConfig();
    this.transporter = this.createTransporter();
  }

  private getEmailConfig(): EmailConfig {
    return {
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "false",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_SECRET || "",
      },
      from: process.env.SMTP_FROM || "Greenex <noreply@greenex.com>",
    };
  }

  private createTransporter(): nodemailer.Transporter {
    if (!this.config.auth.user || !this.config.auth.pass) {
      logger.warn(
        "SMTP credentials not configured. Email notifications will be logged only."
      );
      // Return a test transporter for development
      return nodemailer.createTransport({
        streamTransport: true,
        newline: "unix",
      });
    }

    return nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });
  }

  async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.config.from,
        to: 'adil.shaikh@gunadhyasoft.com',
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info("Email sent successfully", {
        to: notification.to,
        subject: notification.subject,
        messageId: result.messageId,
      });

      return true;
    } catch (error) {
      logger.error("Failed to send email", {
        to: notification.to,
        subject: notification.subject,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  /**
   * SRS 5.1.5 - Send notification to sales team when mobile app enquiry is submitted
   */
  async notifySalesTeamOfEnquiry(
    enquiryData: MobileEnquiryData
  ): Promise<boolean> {
    const salesTeamEmails = await this.getSalesTeamEmails();

    if (!salesTeamEmails.length) {
      logger.warn("No sales team emails configured for enquiry notifications");
      return false;
    }

    const subject = `New Enquiry from ${enquiryData.contactName} - ${enquiryData.serviceRequired || "Service Inquiry"}`;

    const html = getEnquiryNotificationTemplate(enquiryData as any);
    const text = getEnquiryNotificationText(enquiryData as any);

    return this.sendEmail({
      to: salesTeamEmails,
      subject,
      html,
      text,
    });
  }

  /**
   * SRS 5.1.5 - Send auto-acknowledgment email to client who submitted enquiry
   */
  async sendEnquiryAcknowledgment(
    enquiryData: MobileEnquiryData
  ): Promise<boolean> {
    const subject = "Thank you for your enquiry - Greenex Environmental";

    const html = getEnquiryAcknowledgmentTemplate(enquiryData as any);
    const text = getEnquiryAcknowledgmentText(enquiryData as any);

    return this.sendEmail({
      to: enquiryData.contactEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Notify an organization's contact or admin email about an enquiry related to them
   */
  async notifyOrganizationOfEnquiry(
    enquiryData: MobileEnquiryData,
    orgEmail: string
  ): Promise<boolean> {
    if (!orgEmail) return false;

    const subject = `New Enquiry for ${enquiryData.companyName || "Your Organization"}`;

    const html = getEnquiryNotificationTemplate(enquiryData as any);
    const text = getEnquiryNotificationText(enquiryData as any);

    return this.sendEmail({
      to: orgEmail,
      subject,
      html,
      text,
    });
  }

  private async getSalesTeamEmails(): Promise<string[]> {
    const salesEmails: any = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: "Sales Executive",
            },
          },
        },
      },
      select: {
        email: true,
      },
    });
    const emails = salesEmails.map((user) => user.email);

    console.log("Sales Emails:", emails);
    return emails;
  }

  /**
   * Generic method to send notification emails using template
   */
  // async sendNotificationEmail(
  //   to: string | string[],
  //   subject: string,
  //   templateData: EmailTemplateData
  // ): Promise<boolean> {
  //   const html = generateEmailTemplate(templateData);

  //   return this.sendEmail({
  //     to,
  //     subject,
  //     html,
  //   });
  // }

  /**
   * Get admin emails for notifications
   */
  // async getAdminEmails(): Promise<string[]> {
  //   console.log("🔍 Fetching admin emails from database...");

  //   const adminUsers = await prisma.user.findMany({
  //     where: {
  //       roles: {
  //         some: {
  //           role: {
  //             name: {
  //               in: ["Admin", "Super Admin", "Administrator"],
  //             },
  //           },
  //         },
  //       },
  //       isActive: true,
  //     },
  //     select: {
  //       email: true,
  //     },
  //   });

  //   const emails = adminUsers.map((user) => user.email);
  //   console.log("✅ Admin emails retrieved:", emails);

  //   return emails;
  // }







  private generateAcknowledgmentText(data: MobileEnquiryData): string {
    return `
Dear ${data.contactName},

Thank you for reaching out to Greenex Environmental. We have successfully received your enquiry and our team will review it shortly.

Your Enquiry Summary:
${data.serviceRequired ? `Service of Interest: ${data.serviceRequired}` : ""}
Submitted: ${data.submittedAt.toLocaleString()}

What happens next?
- Our sales team will review your enquiry within 24 hours
- We'll contact you via email or phone to discuss your requirements  
- Our experts will provide you with a customized solution

If you have any urgent questions, please don't hesitate to contact us directly.

Best regards,
Greenex Environmental Team
    `.trim();
  }
}
