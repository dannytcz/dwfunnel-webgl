/**
 * Central contact configuration for DW Funnel.
 */
const WHATSAPP_NUMBER = "60189621022";

const WHATSAPP_DEADLINE_MESSAGE = `Tight deadline — build request

Business:
Offer:
Current page:
What isn't working:
Deadline:
Budget (USD):`;

const WHATSAPP_FOOTER_MESSAGE = `Build request — quick brief

Business:
Offer:
Current page:`;

function buildWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const CONTACT_CONFIG = {
  whatsAppNumber: WHATSAPP_NUMBER,
  whatsAppUrl: buildWhatsAppUrl(WHATSAPP_FOOTER_MESSAGE),
  whatsAppDeadlineUrl: buildWhatsAppUrl(WHATSAPP_DEADLINE_MESSAGE),
  buildRequestEndpoint: "/api/build-request",
};
