/**
 * Organization Email Templates
 * Templates for organization-related email notifications
 */

import { generateEmailTemplate } from "./base.template";

export interface OrganizationTemplateData {
  name: string;
  type: string;
  industry?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  country?: string;
  isActive?: boolean;
}

export function getOrganizationCreatedTemplate(organization: OrganizationTemplateData): string {
  return generateEmailTemplate({
    title: "Organization Created",
    content: `
      <p>A new organization has been successfully created in the system.</p>
      <p><strong>Organization Name:</strong> ${organization.name}</p>
      <p><strong>Type:</strong> ${organization.type}</p>
      ${organization.email ? `<p><strong>Email:</strong> ${organization.email}</p>` : ""}
      ${organization.phone ? `<p><strong>Phone:</strong> ${organization.phone}</p>` : ""}
    `,
    // actionType: "create",
    entityName: "Organization Details",
    details: {
      Name: organization.name,
      Type: organization.type,
      Industry: organization.industry || "N/A",
      Email: organization.email || "N/A",
      Phone: organization.phone || "N/A",
      Website: organization.website || "N/A",
      City: organization.city || "N/A",
      Country: organization.country || "N/A",
    },
  });
}

export function getOrganizationUpdatedTemplate(organization: OrganizationTemplateData): string {
  return generateEmailTemplate({
    title: "Organization Updated",
    content: `
      <p>The organization <strong>${organization.name}</strong> has been updated in the system.</p>
      <p>Please review the changes below.</p>
    `,
    // actionType: "update",
    entityName: "Updated Organization Details",
    details: {
      Name: organization.name,
      Type: organization.type,
      Industry: organization.industry || "N/A",
      Email: organization.email || "N/A",
      Phone: organization.phone || "N/A",
      Status: organization.isActive ? "Active" : "Inactive",
    },
  });
}

export function getOrganizationDeletedTemplate(organization: OrganizationTemplateData): string {
  return generateEmailTemplate({
    title: "Organization Deleted",
    content: `
      <p>The organization <strong>${organization.name}</strong> has been deleted from the system.</p>
      <p>This action was performed on ${new Date().toLocaleString()}.</p>
    `,
    // actionType: "delete",
    entityName: "Deleted Organization",
    details: {
      Name: organization.name,
      Type: organization.type,
      "Deleted At": new Date().toLocaleString(),
    },
  });
}

export interface QuotationTemplateData {
  title: string;
  status?: string;
}

export interface QuotationCreatedTemplateData {
  title: string;
  amount?: string | number | null;
  currency?: string;
  validUntil?: Date | string | null;
  uploaderName?: string | null;
}

export function getQuotationCreatedTemplate(q: QuotationCreatedTemplateData): string {
  return generateEmailTemplate({
    title: "New Quotation Uploaded",
    content: `
      <p>A new quotation has been uploaded to the system.</p>
      <p><strong>Title:</strong> ${q.title}</p>
      ${q.amount ? `<p><strong>Amount:</strong> ${q.amount} ${q.currency || ""}</p>` : ""}
      ${q.validUntil ? `<p><strong>Valid Until:</strong> ${new Date(q.validUntil).toLocaleString()}</p>` : ""}
      ${q.uploaderName ? `<p><strong>Uploaded By:</strong> ${q.uploaderName}</p>` : ""}
    `,
    // actionType: "create",
    entityName: "Quotation Details",
    details: {
      Title: q.title,
      Amount: q.amount ? `${q.amount} ${q.currency || ""}` : "N/A",
      "Valid Until": q.validUntil ? new Date(q.validUntil).toLocaleString() : "N/A",
      "Uploaded By": q.uploaderName || "N/A"
    }
  });
}

export interface QuotationStatusTemplateData {
  title: string;
  oldStatus?: string;
  newStatus: string;
  changedBy?: string | null;
  notes?: string | null;
}

export function getQuotationStatusUpdatedTemplate(q: QuotationStatusTemplateData): string {
  return generateEmailTemplate({
    title: `Quotation ${q.newStatus}`,
    content: `
      <p>The quotation <strong>${q.title}</strong> status has been updated to <strong>${q.newStatus}</strong>.</p>
      ${q.oldStatus ? `<p><strong>Previous Status:</strong> ${q.oldStatus}</p>` : ""}
      ${q.changedBy ? `<p><strong>Changed By:</strong> ${q.changedBy}</p>` : ""}
      ${q.notes ? `<p><strong>Notes:</strong> ${q.notes}</p>` : ""}
    `,
    // actionType: "update",
    entityName: "Quotation Status",
    details: {
      Title: q.title,
      "New Status": q.newStatus,
      "Previous Status": q.oldStatus || "N/A",
      "Changed By": q.changedBy || "System",
      Notes: q.notes || "N/A"
    }
  });
}

export interface QuotationActionRequestedTemplateData {
  title: string;
  action: string;
  requestedBy?: string | null;
  organizationName?: string | null;
}

export function getQuotationActionRequestedTemplate(q: QuotationActionRequestedTemplateData): string {
  return generateEmailTemplate({
    title: `Quotation Action Requested: ${q.action.toUpperCase()}`,
    content: `
      <p>The client has requested to <strong>${q.action.toLowerCase()}</strong> the quotation <strong>${q.title}</strong>.</p>
      ${q.requestedBy ? `<p><strong>Requested By:</strong> ${q.requestedBy}</p>` : ""}
      ${q.organizationName ? `<p><strong>Organization:</strong> ${q.organizationName}</p>` : ""}
    `,
    // actionType: "update",
    entityName: "Quotation Action Requested",
    details: {
      Title: q.title,
      // Action: q.action.toUpperCase(),
      "Requested By": q.requestedBy || "N/A",
      Organization: q.organizationName || "N/A",
      "Requested At": new Date().toLocaleString()
    }
  });
}

export function getQuotationDeletedTemplate(quotation: QuotationTemplateData): string {
  return generateEmailTemplate({
    title: "Quotation Deleted",
    content: `
      <p>The quotation <strong>${quotation.title}</strong> has been deleted from the system.</p>
      ${quotation.status ? `<p><strong>Status:</strong> ${quotation.status}</p>` : ""}
    `,
    // actionType: "delete",
    entityName: "Deleted Quotation",
    details: {
      Title: quotation.title,
      Status: quotation.status || "N/A",
      "Deleted At": new Date().toLocaleString()
    }
  });
}

