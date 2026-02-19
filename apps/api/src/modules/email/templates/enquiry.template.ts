import { generateEmailTemplate } from './base.template';

export interface EnquiryTemplateData {
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  companyName?: string;
  serviceRequired?: string;
  message?: string;
  submittedAt: Date;
}

export function getEnquiryNotificationTemplate(data: EnquiryTemplateData): string {
  const content = `
    <p><strong>${data.contactName}</strong> has submitted a new enquiry${data.companyName ? ` for <strong>${data.companyName}</strong>` : ''}.</p>
    <p>Please review the details below and follow up accordingly.</p>
  `;

  return generateEmailTemplate({
    title: 'New Mobile App Enquiry',
    content,
    entityName: 'Enquiry Details',
    details: {
      Name: data.contactName,
      Email: data.contactEmail,
      Phone: data.contactPhone || 'N/A',
      Company: data.companyName || 'N/A',
      'Service Required': data.serviceRequired || 'N/A',
      Message: data.message || 'N/A',
      'Submitted At': data.submittedAt.toLocaleString(),
    },
  });
}

export function getEnquiryNotificationText(data: EnquiryTemplateData): string {
  return `NEW MOBILE APP ENQUIRY\n\nContact Information:\n- Name: ${data.contactName}\n- Email: ${data.contactEmail}\n${data.contactPhone ? `- Phone: ${data.contactPhone}\n` : ''}${data.companyName ? `- Company: ${data.companyName}\n` : ''}\nService Details:\n${data.serviceRequired ? `- Service Required: ${data.serviceRequired}\n` : ''}${data.message ? `\nMessage:\n${data.message}\n` : ''}\nSubmitted: ${data.submittedAt.toLocaleString()}\n\nPlease follow up with this enquiry promptly.`;
}

export function getEnquiryAcknowledgmentTemplate(data: EnquiryTemplateData): string {
  const content = `
    <p>Dear <strong>${data.contactName}</strong>,</p>
    <p>Thank you for contacting <strong>Greenex</strong>. We have received your enquiry and our team will review it shortly.</p>
  `;

  return generateEmailTemplate({
    title: 'Thank You for Your Enquiry',
    content,
    entityName: 'Enquiry Summary',
    details: {
      'Service Required': data.serviceRequired || 'N/A',
      Submitted: data.submittedAt.toLocaleString(),
    },
  });
}

export function getEnquiryAcknowledgmentText(data: EnquiryTemplateData): string {
  return `Dear ${data.contactName},\n\nThank you for reaching out to Greenex. We have received your enquiry and our team will review it shortly.\n\nYour Enquiry Summary:\n${data.serviceRequired ? `Service of Interest: ${data.serviceRequired}\n` : ''}\nSubmitted: ${data.submittedAt.toLocaleString()}\n\nBest regards,\nGreenex Environmental Team`;
}
