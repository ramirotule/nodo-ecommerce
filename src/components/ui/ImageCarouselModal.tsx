"use client";

import { useEffect, useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props {
  images: string[];
  alt: string;
  open: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export default function ImageCarouselModal({
  images,
  alt,
  open,
  onClose,
  initialIndex = 0,
}: Props) {
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => {
    if (open) setCurrent(initialIndex);
  }, [open, initialIndex]);

  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrent((i) => (i + 1) % images.length);

  useEffect(() => {
    if (!open || images.length === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && images.length > 1) prev();
      if (e.key === "ArrowRight" && images.length > 1) next();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, images.length, onClose]);

  if (!open || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X size={24} />
      </button>

      <div
        className="relative w-full max-w-4xl aspect-square"
        onClick={(e) => e.stopPropagation()}
      >
        <ProductImage
          src={images[current]}
          alt={alt}
          fill
          sizes="90vw"
          className="object-contain"
          priority
        />

        {images.length > 1 && (
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

      {images.length > 1 && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-14 h-14 border transition-all overflow-hidden bg-white rounded ${
                i === current ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <div className="relative w-full h-full">
                <ProductImage
                  src={img}
                  alt={`${alt} — imagen ${i + 1}`}
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
  );
}
