"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, todas.length]);

  if (todas.length === 0) {
    return (
      <div className="relative aspect-square bg-luxury-black border border-luxury-gray flex items-center justify-center">
        <div className="text-center">
          <div className="text-7xl text-gray-50 mb-4">✦</div>
          <p className="text-gray-300 text-sm tracking-wider uppercase">{marca}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Imagen principal */}
      <div className="product-image-frame relative aspect-square bg-luxury-black border border-luxury-gray-mid overflow-hidden group">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ampliar imagen"
          className="absolute inset-0 z-0 cursor-zoom-in"
        >
          <Image
            src={todas[current]}
            alt={`${nombre} ${marca}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain p-4 transition-opacity duration-300"
            priority
          />
        </button>

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {nuevo && (
            <span className="bg-gold text-black text-xs font-bold tracking-wider px-3 py-1 uppercase">
              Nuevo
            </span>
          )}
        </div>

        {/* Flechas — solo si hay más de una imagen */}
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

      {/* Thumbnails */}
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
                <Image
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

      {/* Modal / lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>

          <div
            className="relative w-full max-w-4xl aspect-square"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={todas[current]}
              alt={`${nombre} ${marca}`}
              fill
              sizes="90vw"
              className="object-contain"
              priority
            />

            {todas.length > 1 && (
              <>
                <button
                  onClick={prev}
                  aria-label="Imagen anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/70 backdrop-blur-sm text-black hover:text-gold hover:bg-white transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={next}
                  aria-label="Imagen siguiente"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/70 backdrop-blur-sm text-black hover:text-gold hover:bg-white transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {todas.length > 1 && (
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {todas.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-14 h-14 border transition-all overflow-hidden bg-white rounded ${
                    i === current ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={img}
                      alt={`${nombre} — imagen ${i + 1}`}
                      fill
                      sizes="56px"
                      className="object-contain p-1"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
