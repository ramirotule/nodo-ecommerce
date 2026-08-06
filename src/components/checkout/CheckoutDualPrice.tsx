"use client";

import { formatPrice } from "@/lib/price-utils";

interface Props {
  /** Monto en USD cuando hay cotización; en ARS cuando no hay dólar habilitado */
  amount: number;
  rate: number | null;
  loading?: boolean;
  size?: "sm" | "lg";
  align?: "left" | "right";
}

export default function CheckoutDualPrice({
  amount,
  rate,
  loading = false,
  size = "sm",
  align = "right",
}: Props) {
  const showUsd = rate !== null;
  const ars = rate ? Math.round(amount * rate) : Math.round(amount);
  const arsLabel =
    loading && rate === null ? "..." : formatPrice(ars);

  const mainClass =
    size === "lg"
      ? "text-3xl font-bold leading-none text-white"
      : "text-white font-medium";

  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <span className={`${mainClass} block`}>{arsLabel}</span>
      {showUsd && (
        <span className={`text-gold font-medium mt-1 block ${size === "lg" ? "text-sm" : "text-xs"}`}>
          US$ {amount.toLocaleString("es-AR")} USD
        </span>
      )}
    </div>
  );
}
