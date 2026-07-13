function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fieldRow(label, value, { multiline = false } = {}) {
  const safeValue = escapeHtml(value || "—");
  const valueStyle = multiline
    ? "white-space:pre-wrap;line-height:1.55;"
    : "line-height:1.45;";

  return `
    <tr>
      <td style="padding:0 0 18px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid rgba(232,223,210,0.12);background:#080807;">
          <tr>
            <td style="padding:12px 16px 6px;color:#f04a2a;font-family:Consolas,Monaco,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;">
              ${escapeHtml(label)}
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px 14px;color:#e6ded2;font-family:Arial,Helvetica,sans-serif;font-size:15px;${valueStyle}">
              ${safeValue}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function chipList(values) {
  if (!values?.length) return "—";
  return values
    .map(
      (item) =>
        `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 10px;border:1px solid rgba(240,74,42,0.45);color:#f04a2a;font-family:Consolas,Monaco,monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(item)}</span>`
    )
    .join("");
}

export function buildEmailHtml(payload) {
  const submittedAt = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New build request</title>
</head>
<body style="margin:0;padding:0;background:#050505;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#050505;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:620px;border:1px solid rgba(232,223,210,0.16);background:#0c0b0a;">
          <tr>
            <td style="padding:28px 28px 22px;border-bottom:1px solid rgba(240,74,42,0.35);background:linear-gradient(135deg,rgba(240,74,42,0.12),transparent 55%);">
              <div style="color:#f04a2a;font-family:Consolas,Monaco,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;">009 / Apply</div>
              <h1 style="margin:10px 0 8px;color:#e6ded2;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.05;letter-spacing:0.04em;text-transform:uppercase;">New build request</h1>
              <p style="margin:0;color:#9d9388;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">Submitted ${escapeHtml(submittedAt)} MYT via dwfunnel-webgl</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${fieldRow("Name", payload.name)}
                ${fieldRow("Email / WhatsApp", payload.contact)}
                ${fieldRow("Business / brand", payload.businessBrand)}
                ${fieldRow("What are you selling?", payload.offer, { multiline: true })}
                <tr>
                  <td style="padding:0 0 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid rgba(232,223,210,0.12);background:#080807;">
                      <tr>
                        <td style="padding:12px 16px 6px;color:#f04a2a;font-family:Consolas,Monaco,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;">
                          Traffic sources
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 14px;">
                          ${chipList(payload.trafficSources)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${fieldRow("What isn't working?", payload.conversionProblem, { multiline: true })}
                ${fieldRow("Current page / website", payload.currentPage || "Not provided")}
                ${fieldRow("Estimated build budget", payload.estimatedBudget)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid rgba(232,223,210,0.12);">
                <tr>
                  <td style="padding-top:18px;color:#4d463f;font-family:Consolas,Monaco,monospace;font-size:11px;line-height:1.6;letter-spacing:0.06em;">
                    Review the request first. Reach out directly if it looks like a fit.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailText(payload) {
  const lines = [
    "NEW BUILD REQUEST",
    "=================",
    "",
    `Name: ${payload.name || "—"}`,
    `Email / WhatsApp: ${payload.contact || "—"}`,
    `Business / brand: ${payload.businessBrand || "—"}`,
    "",
    "What are you selling?",
    payload.offer || "—",
    "",
    `Traffic sources: ${(payload.trafficSources || []).join(", ") || "—"}`,
    "",
    "What isn't working?",
    payload.conversionProblem || "—",
    "",
    `Current page / website: ${payload.currentPage || "Not provided"}`,
    `Estimated build budget: ${payload.estimatedBudget || "—"}`,
    "",
    "—",
    "DW Funnel build request form",
  ];

  return lines.join("\n");
}
