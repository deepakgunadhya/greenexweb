/**
 * Base Email Template
 * Contains the core HTML structure with Greenex branding
 * Uses the same design style as meeting templates
 */

export interface EmailTemplateData {
  title: string;
  content: string;
  actionType?: "create" | "update" | "delete";
  entityName?: string;
  details?: Record<string, any>;
}

/**
 * Generate Greenex branded email template
 */
export function generateEmailTemplate(options: EmailTemplateData): string {
  const { title, content, actionType, entityName, details } = options;
  
  // Determine color based on action type
  let headerColor = "#0d7a3a"; // Default green
  let actionColor = "#0d7a3a";
  let actionIcon = "✅";
  if (actionType === "create") {
    headerColor = "#0d7a3a"; // Green
    actionColor = "#0d7a3a";
    actionIcon = "✨";
  } else if (actionType === "update") {
    headerColor = "#d97706"; // Orange
    actionColor = "#d97706";
    actionIcon = "🔄";
  } else if (actionType === "delete") {
    headerColor = "#dc2626"; // Red
    actionColor = "#dc2626";
    actionIcon = "🗑️";
  }

  // Generate details section if provided
  let detailsHtml = "";
  if (details && Object.keys(details).length > 0) {
    const detailsBgColor = actionType === "create" ? "#f0f9f4" : actionType === "update" ? "#fef9ed" : "#fef2f2";
    const detailsBorderColor = actionType === "create" ? "#d1e7dd" : actionType === "update" ? "#fed7aa" : "#fecaca";
    
    detailsHtml = `
      <div style="
        background-color: ${detailsBgColor};
        border-radius: 8px;
        padding: 20px;
        margin: 25px 0;
        border: 1px solid ${detailsBorderColor};
      ">
        <h3 style="
          margin-top: 0;
          margin-bottom: 16px;
          color: ${actionColor};
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid ${detailsBorderColor};
          padding-bottom: 8px;
        ">
          ${actionIcon} ${entityName || "Details"}
        </h3>
        ${Object.entries(details)
          .map(
            ([key, value]) =>
              `<div style="margin-bottom: 12px;">
                <div style="
                  color: ${actionColor};
                  font-weight: 600;
                  font-size: 12px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 4px;
                ">
                  ${formatKey(key)}
                </div>
                <div style="
                  color: #1a1a1a;
                  font-size: 14px;
                ">
                  ${value || "N/A"}
                </div>
              </div>`
          )
          .join("")}
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  background-color: #ffffff;
  margin: 0;
  padding: 0;
">
  <div style="
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  ">

    <!-- Header with Logo -->
    <div style="
      background-color: ${headerColor};
      padding: 30px 20px;
      text-align: center;
    ">
      <div style="
        background-color: #ffffff;
        display: inline-block;
        padding: 8px 16px;
        border-radius: 4px;
        margin-bottom: 15px;
      ">
        <div style="
          font-size: 24px;
          font-weight: 700;
          color: #0d7a3a;
          letter-spacing: -0.5px;
        ">
          <span style="color: #0d7a3a;">Green</span><span style="color: #7fb800;">ex</span>
        </div>
        <div style="
          font-size: 10px;
          font-weight: 600;
          color: #7fb800;
          letter-spacing: 1px;
          margin-top: -2px;
        ">
          ENVIRONMENTAL
        </div>
      </div>
      <h1 style="
        margin: 0;
        color: #ffffff;
        font-size: 22px;
        font-weight: 600;
      ">
        ${title}
      </h1>
    </div>

    <!-- Body Content -->
    <div style="padding: 35px 25px;">

      <div style="
        color: #374151;
        line-height: 1.7;
        font-size: 15px;
        margin-bottom: 20px;
      ">
        ${content}
      </div>

      ${detailsHtml}

      <!-- Action Badge -->
      ${actionType ? `
        <div style="
          margin-top: 25px;
          padding: 12px 20px;
          background-color: ${actionColor}15;
          border-left: 4px solid ${actionColor};
          border-radius: 6px;
        ">
          <p style="
            margin: 0;
            color: ${actionColor};
            font-weight: 600;
            font-size: 14px;
          ">
            ${actionIcon} Action: ${actionType.toUpperCase()}
          </p>
        </div>
      ` : ""}

      <!-- Footer Note -->
      <p style="
        margin-top: 25px;
        color: #6b6b6b;
        font-size: 12px;
        line-height: 1.5;
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid #e5e5e5;
      ">
        This notification was sent by Greenex Environmental CRM System.<br>
        If you have any questions, please contact support.
      </p>

    </div>

    <!-- Footer -->
    <div style="
      background-color: #f8f8f8;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #e5e5e5;
    ">
      <p style="
        margin: 0 0 5px 0;
        color: #1a1a1a;
        font-size: 13px;
        font-weight: 600;
      ">
        <span style="color: #0d7a3a;">Green</span><span style="color: #7fb800;">ex</span> Environmental
      </p>
      <p style="margin: 0 0 10px 0; color: #6b6b6b; font-size: 12px;">
        Creating Real-World Impact Through Innovative Sustainability Solutions
      </p>
      <p style="margin: 0; color: #6b6b6b; font-size: 11px;">
        © ${new Date().getFullYear()} All rights reserved
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
