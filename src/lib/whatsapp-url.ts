import { SITE_CONFIG } from "@/constants/site";

/** Digits only, suitable for wa.me/{phone}. */
export function normalizeWhatsAppPhone(phone?: string | null): string {
  const raw = (phone || SITE_CONFIG.contact.phone || "").trim();
  return raw.replace(/\D/g, "");
}

export function buildWhatsAppUrl(
  message: string,
  phone?: string | null
): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
