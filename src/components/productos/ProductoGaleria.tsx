"use client";

import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import ImageCarouselModal from "@/components/ui/ImageCarouselModal";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  imagenPrincipal?: string;
  imagenesAdicionales?: string[];
  nombre: string;
  marca: string;
  nuevo: boolean;
}

export default function ProductoGaleria({
  imagenPrincipal,
  imagenesAdicionales = [],
  nombre,
  marca,
  nuevo,
}: Props) {
  const todas = [...new Set([imagenPrincipal, ...imagenesAdicionales].filter(Boolean))] as string[];
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);

  const prev = () => setCurrent((i) => (i - 1 + todas.length) % todas.length);
  const next = () => setCurrent((i) => (i + 1) % todas.length);

  if (todas.length === 0) {
    return (
      <div className="relative aspect-square bg-luxury-black border border-luxury-gray overflow-hidden">
        <ProductImage
          src={null}
          alt={`${nombre} ${marca}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-4"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="product-image-frame relative aspect-square bg-luxury-black border border-luxury-gray-mid overflow-hidden group">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ampliar imagen"
          className="absolute inset-0 z-0 cursor-zoom-in"
        >
          <ProductImage
            src={todas[current]}
            alt={`${nombre} ${marca}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain p-4 transition-opacity duration-300"
            priority
          />
        </button>

        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {nuevo && (
            <span className="bg-gold text-black text-xs font-bold tracking-wider px-3 py-1 uppercase">
              Nuevo
            </span>
          )}
        </div>

        {todas.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Imagen anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/70 backdrop-blur-sm text-black hover:text-gold hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              aria-label="Imagen siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/70 backdrop-blur-sm text-black hover:text-gold hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {todas.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {todas.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`product-image-frame shrink-0 w-16 h-16 border transition-all overflow-hidden bg-luxury-black ${
                i === current
                  ? "border-gold"
                  : "border-luxury-gray hover:border-[#555]"
              }`}
            >
              <div className="relative w-full h-full">
                <ProductImage
                  src={img}
                  alt={`${nombre} — imagen ${i + 1}`}
                  fill
                  sizes="64px"
                  className="object-contain p-1"
                />
              </div>
            </button>
          ))}
        </div>
      )}

      <ImageCarouselModal
        images={todas}
        alt={`${nombre} ${marca}`}
        open={open}
        onClose={() => setOpen(false)}
        initialIndex={current}
      />
    </div>
  );
}
