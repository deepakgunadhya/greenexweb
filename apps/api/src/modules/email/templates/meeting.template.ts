/**
 * Meeting Email Templates
 * Templates for meeting-related email notifications
 */

export interface MeetingTemplateData {
  title: string;
  description?: string;
  meetingType?: string;
  status: string;
  scheduledAt?: Date | string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  organizerName?: string;
  organizerEmail?: string;
  recipientEmails?: string[];
}

export function getMeetingCreatedTemplate(
  meeting: MeetingTemplateData
): string {
  const scheduledDate = meeting.scheduledAt
    ? new Date(meeting.scheduledAt)
    : null;

  const formattedDate = scheduledDate
    ? scheduledDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not scheduled";

  const formattedTime = scheduledDate
    ? scheduledDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header with Logo -->
    <div style="background-color: #0d7a3a; padding: 30px 20px; text-align: center;">
      <div style="background-color: #ffffff; display: inline-block; padding: 8px 16px; border-radius: 4px; margin-bottom: 15px;">
        <div style="font-size: 24px; font-weight: 700; color: #0d7a3a; letter-spacing: -0.5px;"><span style="color: #0d7a3a;">Green</span><span style="color: #7fb800;">ex</span></div>
        <div style="font-size: 10px; font-weight: 600; color: #7fb800; letter-spacing: 1px; margin-top: -2px;">ENVIRONMENTAL</div>
      </div>
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">Meeting Invitation</h1>
    </div>
    <!-- Body Content -->
    <div style="padding: 35px 25px;">
      <h2 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">${meeting.title}</h2>
      <p style="color: #4a4a4a; line-height: 1.5; font-size: 14px; margin: 0 0 25px 0;">You have been invited to attend a meeting. Please find the details below:</p>
      <!-- Meeting Details Card -->
      <div style="background-color: #f0f9f4; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #d1e7dd;">${meeting.organizerName || meeting.organizerEmail ? `<div style="margin-bottom: 16px;"><div style="color: #0d7a3a; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">ORGANIZER</div><div style="color: #1a1a1a; font-size: 14px; font-weight: 600; margin-bottom: 2px;">${meeting.organizerName || ""}</div>${meeting.organizerEmail ? `<div style="color: #4a4a4a; font-size: 13px;">${meeting.organizerEmail}</div>` : ""}</div>` : ""}
        <div style="margin-bottom: 16px;"><div style="color: #0d7a3a; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">DATE & TIME</div><div style="color: #1a1a1a; font-size: 15px; font-weight: 600; margin-bottom: 2px;">${formattedDate}</div><div style="color: #4a4a4a; font-size: 14px;">${formattedTime}</div></div>${meeting.duration ? `<div style="margin-bottom: 16px;"><div style="color: #0d7a3a; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">DURATION</div><div style="color: #1a1a1a; font-size: 14px;">${meeting.duration} minutes</div></div>` : ""}${meeting.meetingType ? `<div style="margin-bottom: 16px;"><div style="color: #0d7a3a; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">MEETING TYPE</div><div style="color: #1a1a1a; font-size: 14px;">${meeting.meetingType}</div></div>` : ""}${meeting.meetingLink || meeting.location ? `<div style="margin-bottom: 16px;"><div style="color: #0d7a3a; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">${meeting.meetingLink ? "JOIN LINK" : "LOCATION"}</div><div>${meeting.meetingLink ? `<a href="${meeting.meetingLink}" style="color: #0d7a3a; text-decoration: none; font-size: 14px; word-break: break-all; font-weight: 500;">${meeting.meetingLink}</a>` : `<div style="color: #1a1a1a; font-size: 14px;">${meeting.location}</div>`}</div></div>` : ""}${meeting.description ? `<div style="margin-bottom: 16px;"><div style="color: #0d7a3a; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">DESCRIPTION</div><div style="color: #1a1a1a; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${meeting.description}</div></div>` : ""}${meeting.recipientEmails && meeting.recipientEmails.length > 0 ? `<div style="margin-bottom: 0;"><div style="color: #0d7a3a; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">INVITEES</div><div style="color: #1a1a1a; font-size: 14px; line-height: 1.8;">${meeting.recipientEmails.map((email) => `<div>${email}</div>`).join("")}</div></div>` : ""}</div>${meeting.meetingLink ? `<div style="text-align: center; margin: 30px 0;"><a href="${meeting.meetingLink}" style="display: inline-block; background-color: #0d7a3a; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(13, 122, 58, 0.25);">Join Meeting</a></div>` : ""}
      <div style="background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 6px; padding: 18px; margin-top: 25px;"><p style="margin: 0 0 10px 0; color: #0d7a3a; font-weight: 600; font-size: 13px;">Before the Meeting:</p><ul style="margin: 0; padding-left: 18px; color: #4a4a4a; line-height: 1.7; font-size: 13px;"><li>Please mark your calendar for this meeting</li><li>Review any relevant materials in advance</li><li>Join 2-3 minutes early to test your connection</li>${meeting.meetingLink ? '<li>Use the "Join Meeting" button above to connect</li>' : ""}</ul></div>
      <p style="margin-top: 25px; color: #6b6b6b; font-size: 12px; line-height: 1.5; text-align: center; padding-top: 20px; border-top: 1px solid #e5e5e5;">This meeting invitation was sent by Greenex Environmental CRM System.<br>If you have any questions, please contact the meeting organizer.</p>
    </div>
    <!-- Footer -->
    <div style="background-color: #f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;"><p style="margin: 0 0 5px 0; color: #1a1a1a; font-size: 13px; font-weight: 600;"><span style="color: #0d7a3a;">Green</span><span style="color: #7fb800;">ex</span> Environmental</p><p style="margin: 0 0 10px 0; color: #6b6b6b; font-size: 12px;">Creating Real-World Impact Through Innovative Sustainability Solutions</p><p style="margin: 0; color: #6b6b6b; font-size: 11px;">© ${new Date().getFullYear()} All rights reserved</p></div>
  </div>
</body>
</html>`;
}

export function getMeetingUpdatedTemplate(
  meeting: MeetingTemplateData
): string {
  const scheduledDate = meeting.scheduledAt
    ? new Date(meeting.scheduledAt)
    : null;

  const formattedDate = scheduledDate
    ? scheduledDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not scheduled";

  const formattedTime = scheduledDate
    ? scheduledDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background-color: #0d7a3a; padding: 30px 20px; text-align: center;">
      <div style="background-color: #ffffff; display: inline-block; padding: 8px 16px; border-radius: 4px; margin-bottom: 15px;">
        <div style="font-size: 24px; font-weight: 700; color: #0d7a3a; letter-spacing: -0.5px;"><span style="color: #0d7a3a;">Green</span><span style="color: #7fb800;">ex</span></div>
        <div style="font-size: 10px; font-weight: 600; color: #7fb800; letter-spacing: 1px; margin-top: -2px;">ENVIRONMENTAL</div>
      </div>
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">Meeting Updated</h1>
    </div>
    <!-- Body -->
    <div style="padding: 35px 25px;">
      <div style="background-color: #fff7ed; border-left: 3px solid #d97706; border-radius: 6px; padding: 15px; margin-bottom: 20px;"><p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 600;">Important: Meeting Details Have Changed</p></div>
      <h2 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">${meeting.title}</h2>
      <p style="color: #4a4a4a; line-height: 1.5; font-size: 14px; margin: 0 0 25px 0;">The meeting details have been updated. Please review the updated information below:</p>
      <!-- Updated Details -->
      <div style="background-color: #f0f9f4; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #d1e7dd;">
        <div style="margin-bottom: 16px;"><div style="color: #0d7a3a; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">DATE & TIME</div><div style="color: #1a1a1a; font-size: 15px; font-weight: 600; margin-bottom: 2px;">${formattedDate}</div><div style="color: #4a4a4a; font-size: 14px;">${formattedTime}</div></div>${meeting.duration ? `<div style="margin-bottom: 16px;"><div style="color: #0d7a3a; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">DURATION</div><div style="color: #1a1a1a; font-size: 14px;">${meeting.duration} minutes</div></div>` : ""}${meeting.meetingLink || meeting.location ? `<div style="margin-bottom: 16px;"><div style="color: #0d7a3a; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">${meeting.meetingLink ? "JOIN LINK" : "LOCATION"}</div><div>${meeting.meetingLink ? `<a href="${meeting.meetingLink}" style="color: #0d7a3a; text-decoration: none; font-size: 14px; font-weight: 500;">${meeting.meetingLink}</a>` : `<div style="color: #1a1a1a; font-size: 14px;">${meeting.location}</div>`}</div></div>` : ""}${meeting.description ? `<div style="margin-bottom: 16px;"><div style="color: #0d7a3a; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">DESCRIPTION</div><div style="color: #1a1a1a; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${meeting.description}</div></div>` : ""}${meeting.recipientEmails && meeting.recipientEmails.length > 0 ? `<div style="margin-bottom: 0;"><div style="color: #0d7a3a; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">INVITEES</div><div style="color: #1a1a1a; font-size: 14px; line-height: 1.8;">${meeting.recipientEmails.map((email) => `<div>${email}</div>`).join("")}</div></div>` : ""}
      </div>${meeting.meetingLink ? `<div style="text-align: center; margin: 30px 0;"><a href="${meeting.meetingLink}" style="display: inline-block; background-color: #0d7a3a; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(13, 122, 58, 0.25);">Join Meeting</a></div>` : ""}
      <p style="margin-top: 25px; color: #6b6b6b; font-size: 12px; text-align: center; border-top: 1px solid #e5e5e5; padding-top: 20px;">Please update your calendar accordingly.</p>
    </div>
    <!-- Footer -->
    <div style="background-color: #f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;"><p style="margin: 0 0 5px 0; color: #1a1a1a; font-size: 13px; font-weight: 600;"><span style="color: #0d7a3a;">Green</span><span style="color: #7fb800;">ex</span> Environmental</p><p style="margin: 0 0 10px 0; color: #6b6b6b; font-size: 12px;">Creating Real-World Impact Through Innovative Sustainability Solutions</p><p style="margin: 0; color: #6b6b6b; font-size: 11px;">© ${new Date().getFullYear()} All rights reserved</p></div>
  </div>
</body>
</html>`;
}

export function getMeetingDeletedTemplate(
  meeting: MeetingTemplateData
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background-color: #0d7a3a; padding: 30px 20px; text-align: center;">
      <div style="background-color: #ffffff; display: inline-block; padding: 8px 16px; border-radius: 4px; margin-bottom: 15px;">
        <div style="font-size: 24px; font-weight: 700; color: #0d7a3a; letter-spacing: -0.5px;"><span style="color: #0d7a3a;">Green</span><span style="color: #7fb800;">ex</span></div>
        <div style="font-size: 10px; font-weight: 600; color: #7fb800; letter-spacing: 1px; margin-top: -2px;">ENVIRONMENTAL</div>
      </div>
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">Meeting Cancelled</h1>
    </div>
    <!-- Body -->
    <div style="padding: 35px 25px;">
      <div style="background-color: #fef2f2; border-left: 3px solid #dc2626; border-radius: 6px; padding: 15px; margin-bottom: 20px;"><p style="margin: 0; color: #7f1d1d; font-size: 13px; font-weight: 600;">This meeting has been cancelled</p></div>
      <h2 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">${meeting.title}</h2>
      <p style="color: #4a4a4a; line-height: 1.5; font-size: 14px; margin: 0 0 25px 0;">The scheduled meeting has been cancelled. Please remove this event from your calendar.</p>
      <div style="background-color: #f8f8f8; border-radius: 6px; padding: 15px; text-align: center; border: 1px solid #e5e5e5;"><p style="margin: 0; color: #6b6b6b; font-size: 13px;">Cancelled on: <strong>${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong></p></div>
      <p style="margin-top: 25px; color: #6b6b6b; font-size: 12px; text-align: center; border-top: 1px solid #e5e5e5; padding-top: 20px;">If you have any questions, please contact the meeting organizer.</p>
    </div>
    <!-- Footer -->
    <div style="background-color: #f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;"><p style="margin: 0 0 5px 0; color: #1a1a1a; font-size: 13px; font-weight: 600;"><span style="color: #0d7a3a;">Green</span><span style="color: #7fb800;">ex</span> Environmental</p><p style="margin: 0 0 10px 0; color: #6b6b6b; font-size: 12px;">Creating Real-World Impact Through Innovative Sustainability Solutions</p><p style="margin: 0; color: #6b6b6b; font-size: 11px;">© ${new Date().getFullYear()} All rights reserved</p></div>
  </div>
</body>
</html>`;
}
