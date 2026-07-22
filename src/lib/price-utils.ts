export const LIST_PRICE_FACTOR = 1.2236;

export type Moneda = "ARS" | "USD";

export function currencySymbol(moneda: Moneda): string {
  return moneda === "USD" ? "US$" : "$";
}

export function parseCurrencyInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const parsed = parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrencyAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return Math.round(amount).toLocaleString("es-AR");
}

/** precio_venta = ceil((precio_costo / 0.87 + 30) / 5) * 5 */
export function calcPrecioVentaFromCosto(precioCosto: number): number {
  if (!Number.isFinite(precioCosto) || precioCosto <= 0) return 0;
  const raw = precioCosto / 0.87 + 30;
  return Math.ceil(raw / 5) * 5;
}

export function calculateListPrice(price: number): number {
  return price * LIST_PRICE_FACTOR;
}

export function calculateInstallment(price: number, installments: number = 3): number {
  return (price * LIST_PRICE_FACTOR) / installments;
}

export function formatPrice(price: number): string {
  return `$${Math.round(price).toLocaleString("es-AR")}`;
}
