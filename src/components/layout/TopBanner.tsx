"use client";

import { Truck } from "lucide-react";

export default function TopBanner() {
  return (
    <div className="bg-gold text-black text-center py-2 px-4 text-[12px] font-semibold tracking-wider flex items-center justify-center gap-3">
      <Truck size={14} strokeWidth={2.5} />
      <span>
        ENVIOS GRATIS A DOMICILIO EN COMPRAS SUPERIORES A $60.000
      </span>
    </div>
  );
}
