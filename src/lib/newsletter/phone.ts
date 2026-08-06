/** Normaliza celular argentino para WhatsApp (solo dígitos, prefijo 54). */
export function normalizeNewsletterPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("54")) {
    const rest = digits.slice(2);
    if (rest.length >= 10 && rest.length <= 11) return digits;
    return null;
  }

  if (digits.startsWith("9") && digits.length === 11) {
    return `54${digits}`;
  }

  if (digits.length === 10) {
    return `549${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `549${digits.slice(1)}`;
  }

  return null;
}

export function isValidNewsletterPhone(input: string): boolean {
  return normalizeNewsletterPhone(input) !== null;
}
