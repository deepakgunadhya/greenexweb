import { generateEmailTemplate } from "./base.template";

export interface OtpTemplateData {
  name: string;
  otpCode: string;
  action: string;
  quotationTitle: string;
  organizationName: string;
  expiryMinutes?: number;
}

export function getOTPVerificationTemplate(data: OtpTemplateData): string {
  const expiry = data.expiryMinutes || 10;

  return generateEmailTemplate({
    title: `OTP for Quotation ${data.action.toUpperCase()}`,
    content: `
      <p>Dear ${data.name},</p>

      <p>You have requested to <strong>${data.action.toLowerCase()}</strong> the quotation:</p>
      <div style="background: white; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
        <strong>${data.quotationTitle}</strong><br />
        Organization: ${data.organizationName}
      </div>

      <p>Please use the following One-Time Password (OTP) to confirm your action:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="
          font-size: 32px;
          font-weight: bold;
          background: #16a34a;
          color: white;
          padding: 15px 30px;
          border-radius: 8px;
          letter-spacing: 5px;
          display: inline-block;
        ">${data.otpCode}</span>
      </div>

      <p style="color: #666; font-size: 14px;">This OTP is valid for ${expiry} minutes and can only be used once. If you did not request this action, please contact our support team immediately.</p>
    `,
    entityName: "OTP Verification",
    details: {
      Quotation: data.quotationTitle,
      Organization: data.organizationName,
      "Expires In": `${expiry} minutes`
    }
  });
}

export function getOTPVerificationText(data: OtpTemplateData): string {
  const expiry = data.expiryMinutes || 10;
  return `OTP Verification Required\n\nDear ${data.name},\n\nYou have requested to ${data.action.toLowerCase()} the quotation: ${data.quotationTitle}\nOrganization: ${data.organizationName}\n\nYour OTP: ${data.otpCode}\n\nThis OTP is valid for ${expiry} minutes and can only be used once.\nIf you did not request this action, please contact our support team.\n\nBest regards,\nGreenex Environmental Team`;
}
