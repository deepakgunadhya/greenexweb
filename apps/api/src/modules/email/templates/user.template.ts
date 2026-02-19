import { generateEmailTemplate } from "./base.template";

export interface UserCreatedTemplateData {
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // Plain text password (temporary or provided)
  loginUrl?: string;
}

export function getUserCreatedTemplate(data: UserCreatedTemplateData): string {
  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const content = `
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>Welcome to <strong>Greenex</strong>! An account has been created for you.</p>
    <p>For security, please change your password after your first login.</p>
    ${data.loginUrl ? `<p>You can log in here: <a href="${data.loginUrl}">${data.loginUrl}</a></p>` : ""}
  `;

  return generateEmailTemplate({
    title: "Welcome to Greenex",
    content,
    entityName: "Account Details",
    details: {
      Name: fullName || "N/A",
      Email: data.email,
      "Temporary password": data.password || "N/A",
      Login: data.loginUrl || "N/A",
    },
  });
}

export function getUserCreatedText(data: UserCreatedTemplateData): string {
  const fullName = `${data.firstName} ${data.lastName}`.trim();
  return `Hello ${fullName},\n\n` +
    `An account has been created for you on Greenex.\n\n` +
    `Email: ${data.email}\n` +
    (data.password ? `Temporary password: ${data.password}\n` : "") +
    (data.loginUrl ? `Login: ${data.loginUrl}\n` : "") +
    `\nPlease change your password after logging in for the first time.\n\nThanks,\nGreenex Team`;
}
