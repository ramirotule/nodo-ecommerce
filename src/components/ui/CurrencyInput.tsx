"use client";

import {
  currencySymbol,
  formatCurrencyAmount,
  parseCurrencyInput,
  type Moneda,
} from "@/lib/price-utils";

interface Props {
  value: number;
  onChange: (value: number) => void;
  moneda?: Moneda;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export default function CurrencyInput({
  value,
  onChange,
  moneda = "ARS",
  readOnly = false,
  required = false,
  placeholder = "0",
  className = "",
  inputClassName = "",
}: Props) {
  const symbol = currencySymbol(moneda);
  const symbolWidth = moneda === "USD" ? "pl-[3.25rem]" : "pl-9";

  return (
    <div className={`relative ${className}`}>
      <span
        className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none ${
          readOnly ? "text-gold/70" : "text-luxury-gray-light"
        }`}
      >
        {symbol}
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        readOnly={readOnly}
        required={required && value <= 0}
        value={formatCurrencyAmount(value)}
        placeholder={placeholder}
        onChange={(e) => onChange(parseCurrencyInput(e.target.value))}
        className={`w-full border border-luxury-gray-mid text-white py-3 pr-4 text-sm transition-colors ${symbolWidth} ${
          readOnly
            ? "bg-luxury-gray text-gold cursor-default focus:outline-none opacity-90"
            : "bg-luxury-gray focus:outline-none focus:border-gold"
        } ${inputClassName}`}
      />
    </div>
  );
}
