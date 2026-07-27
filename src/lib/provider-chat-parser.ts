const BULLET_RE = /^[\u25AA\u25AB\u2022\u25CF]\uFE0F?\s*/;
const CATEGORY_RE = /^►/;
const PRICE_LINE_RE = /^(.+?)\s*-\s*\$\s*([\d.,]+)/;

export interface ParsedChatRow {
  name: string;
  price: number;
  baseName: string;
  color?: string;
}

function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function parsePrice(raw: string): number {
  const value = parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(value) ? value : NaN;
}

/**
 * Parsea el texto de una lista de precios pegada desde un chat de proveedor.
 * Formato esperado por línea: "▪️ NOMBRE PRODUCTO - $ PRECIO [texto suelto]"
 * Si la línea siguiente no tiene viñeta, precio ni es un encabezado "►",
 * se interpreta como una lista de colores separados por "-" y se genera
 * una fila por color (mismo producto, mismo precio, distinta variante).
 */
export function parseProviderChat(text: string): { rows: ParsedChatRow[]; unrecognized: number } {
  const lines = text.split("\n").map((l) => l.trim());
  const rows: ParsedChatRow[] = [];
  let unrecognized = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || CATEGORY_RE.test(line) || !BULLET_RE.test(line)) continue;

    const withoutBullet = line.replace(BULLET_RE, "");
    const match = withoutBullet.match(PRICE_LINE_RE);
    if (!match) {
      unrecognized++;
      continue;
    }

    const baseName = normalizeName(match[1]);
    const price = parsePrice(match[2]);
    if (!baseName || !Number.isFinite(price) || price <= 0) {
      unrecognized++;
      continue;
    }

    const next = lines[i + 1];
    const isColorLine =
      !!next && next.length > 0 && !BULLET_RE.test(next) && !CATEGORY_RE.test(next) && !next.includes("$");

    if (isColorLine) {
      const colors = next.split("-").map((c) => c.trim()).filter(Boolean);
      if (colors.length > 0) {
        for (const color of colors) {
          rows.push({ name: `${baseName} ${color}`, price, baseName, color });
        }
        i++;
        continue;
      }
    }

    rows.push({ name: baseName, price, baseName });
  }

  return { rows, unrecognized };
}

export function normalizeForMatch(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Similitud Jaccard sobre tokens normalizados (0 a 1). */
export function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeForMatch(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeForMatch(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;

  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;

  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
