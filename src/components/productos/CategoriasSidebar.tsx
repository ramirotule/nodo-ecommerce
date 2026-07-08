"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function CategoriasSidebar() {
  const searchParams = useSearchParams();

  return (
    <div className="space-y-6">
      <div className="border-b border-luxury-gray-mid pb-2 mb-6">
        <h3 className="text-gold text-[10px] font-bold tracking-[0.2em] uppercase">
          Categorías
        </h3>
      </div>

      {/* Banner decorativo */}
      <div className="p-6 bg-gradient-to-b from-[#111111] to-black border border-luxury-gray text-center">
        <p className="text-[10px] text-gold tracking-[0.2em] uppercase mb-2 font-bold">
          Calidad Premium
        </p>
        <p className="text-[9px] text-[#666666] leading-relaxed uppercase tracking-widest">
          Todos nuestros productos son seleccionados cuidadosamente para garantizar la mejor experiencia.
        </p>
      </div>
    </div>
  );
}
