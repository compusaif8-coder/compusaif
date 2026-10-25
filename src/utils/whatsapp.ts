/**
 * Formats a phone number for use in WhatsApp wa.me links.
 * Strips non-digits and prepends Egyptian country code '2' if it starts with '0' and is 11 digits (e.g. 010..., 011..., 012..., 015...).
 */
export function formatWhatsAppNumber(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  // If it starts with 0 and is 11 digits (Egyptian mobile number), convert 01... to 201...
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '2' + cleaned;
  }
  return cleaned;
}

/**
 * Returns the configured WhatsApp number for receiving orders and reservations.
 * Falls back to orderWhatsapp -> general whatsapp -> default store number.
 */
export function getOrderWhatsAppNumber(
  settings?: { orderWhatsapp?: string; whatsapp?: string } | null,
  fallback = '01146324540'
): string {
  const raw =
    settings?.orderWhatsapp?.trim() ||
    settings?.whatsapp?.trim() ||
    fallback;
  return formatWhatsAppNumber(raw);
}
