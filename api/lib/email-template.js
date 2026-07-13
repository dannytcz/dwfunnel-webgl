import { buildEmailSummary, formatMetaTextBlock } from "./submission-meta.js";

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

function metaRow(label, value) {
  return `<tr>
    <td style="padding:0 0 8px;color:#4d463f;font-family:Consolas,Monaco,monospace;font-size:11px;line-height:1.55;letter-spacing:0.04em;">
      <span style="color:#9d9388;text-transform:uppercase;letter-spacing:0.12em;">${escapeHtml(label)}</span><br />
      <span style="color:#e6ded2;">${escapeHtml(value || "—")}</span>
    </td>
  </tr>`;
}

function formatDuration(seconds) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

function buildSummarySection(payload) {
  const { headline, bullets } = buildEmailSummary(payload);
  if (!headline) return "";

  const bulletHtml = bullets
    .map(
      (line) =>
        `<li style="margin:0 0 8px;color:#e6ded2;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">${escapeHtml(line)}</li>`
    )
    .join("");

  return `
    <tr>
      <td style="padding:0 28px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid rgba(240,74,42,0.35);background:#11100f;">
          <tr>
            <td style="padding:16px 18px 8px;color:#f04a2a;font-family:Consolas,Monaco,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;">
              Quick summary
            </td>
          </tr>
          <tr>
            <td style="padding:0 18px 10px;color:#e6ded2;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;">
              ${escapeHtml(headline)}
            </td>
          </tr>
          <tr>
            <td style="padding:0 18px 16px;">
              <ul style="margin:0;padding:0 0 0 18px;">
                ${bulletHtml}
              </ul>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function buildMetaSection(meta) {
  if (!meta) return "";

  const client = meta.client || {};
  const server = meta.server || {};
  const visitorTime = (() => {
    if (!client.clientSubmittedAt) return "Unknown";
    try {
      const label = new Date(client.clientSubmittedAt).toLocaleString("en-GB", {
        timeZone: client.clientTimezone || "UTC",
        dateStyle: "medium",
        timeStyle: "short",
      });
      return client.clientTimezone ? `${label} (${client.clientTimezone})` : label;
    } catch {
      return client.clientSubmittedAt;
    }
  })();

  const locationParts = [server.city, server.region, server.country].filter(Boolean);
  const location = locationParts.length ? locationParts.join(", ") : server.country || "Unknown";
  const locationLine = server.ip && server.ip !== "Unknown" ? `${location} · ${server.ip}` : location;
  const deviceLine = client.device
    ? `${client.device}${client.screenWidth ? ` · ${client.screenWidth}px wide` : ""}`
    : "—";
  const utm = client.utm || client.firstTouchUtm;
  const utmLine = utm
    ? Object.entries(utm)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" · ")
    : "None";
  const visitLine =
    client.visitCount != null
      ? client.visitCount === 1
        ? "First visit on this device"
        : `Visit #${client.visitCount} on this device`
      : "—";
  const daysLine =
    client.daysSinceFirstVisit != null
      ? client.daysSinceFirstVisit === 0
        ? "Found the site today"
        : `${client.daysSinceFirstVisit} day(s) since first visit`
      : "—";

  return `
    <tr>
      <td style="padding:8px 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid rgba(232,223,210,0.12);background:#080807;">
          <tr>
            <td style="padding:14px 16px 8px;color:#f04a2a;font-family:Consolas,Monaco,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;">
              Extra context
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px 10px;color:#9d9388;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;">
              How they found you and what they did on the site.
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px 14px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${metaRow("Their time", visitorTime)}
                ${metaRow("Your time (MYT)", server.studioLocalTime || "—")}
                ${metaRow("Where they are", locationLine)}
                ${metaRow("Device", deviceLine)}
                ${metaRow("Language", client.clientLocale || "—")}
                ${metaRow("Referrer", client.referrer || "Direct / none")}
                ${metaRow("Page", client.pageUrl || "—")}
                ${metaRow("Ad / campaign tag", utmLine)}
                ${metaRow("Visits on this device", visitLine)}
                ${metaRow("How long they've known the site", daysLine)}
                ${client.sessionDurationSec != null ? metaRow("Time on site", formatDuration(client.sessionDurationSec)) : ""}
                ${client.scrollDepthPct != null ? metaRow("How far they scrolled", `${client.scrollDepthPct}%`) : ""}
                ${client.reachedApply === true ? metaRow("Saw apply section", "Yes") : client.reachedApply === false ? metaRow("Saw apply section", "No") : ""}
                ${client.formDurationSec != null ? metaRow("Time on form", formatDuration(client.formDurationSec)) : ""}
                ${client.landingUrl ? metaRow("First landing page", client.landingUrl) : ""}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function buildEmailHtml(payload) {
  const studioTime = payload.meta?.server?.studioLocalTime;
  const headerTime = studioTime ? `${studioTime} MYT` : "dwfunnel-webgl";
  const { headline } = buildEmailSummary(payload);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New build request</title>
</head>
<body style="margin:0;padding:0;background:#050505;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(headline)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#050505;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:620px;border:1px solid rgba(232,223,210,0.16);background:#0c0b0a;">
          <tr>
            <td style="padding:28px 28px 22px;border-bottom:1px solid rgba(240,74,42,0.35);background:linear-gradient(135deg,rgba(240,74,42,0.12),transparent 55%);">
              <div style="color:#f04a2a;font-family:Consolas,Monaco,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;">009 / Apply</div>
              <h1 style="margin:10px 0 8px;color:#e6ded2;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.05;letter-spacing:0.04em;text-transform:uppercase;">New build request</h1>
              <p style="margin:0;color:#9d9388;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">Received ${escapeHtml(headerTime)}</p>
            </td>
          </tr>
          ${buildSummarySection(payload)}
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
                ${fieldRow("Anything else", payload.additionalNotes || "Not provided", { multiline: true })}
                ${buildMetaSection(payload.meta)}
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
  const { headline, bullets } = buildEmailSummary(payload);
  const lines = [
    "NEW BUILD REQUEST",
    "=================",
    "",
    "QUICK SUMMARY",
    headline,
    ...bullets.map((line) => `- ${line}`),
    "",
    "FULL DETAILS",
    "------------",
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
    "Anything else:",
    payload.additionalNotes || "Not provided",
    "",
    formatMetaTextBlock(payload.meta),
    "",
    "—",
    "DW Funnel build request form",
  ];

  return lines.join("\n");
}
