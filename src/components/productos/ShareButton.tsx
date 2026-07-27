"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface Props {
  nombre: string;
  marca: string;
  url: string;
}

export default function ShareButton({ nombre, marca, url }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareData = {
      title: `${nombre} - ${marca}`,
      text: `Mirá ${nombre} de ${marca}`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // El usuario canceló el share, no hacemos nada
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      onClick={handleShare}
      data-umami-event="compartir-producto"
      data-umami-event-producto={nombre}
      title="Compartir producto"
      aria-label="Compartir producto"
      className={`flex items-center justify-center gap-2 border font-semibold px-4 py-3.5 text-sm transition-all duration-300 whitespace-nowrap cursor-pointer ${
        copied
          ? "border-green-600 bg-green-600 text-white"
          : "bg-luxury-gray border-gold/20 text-gold hover:border-gold hover:bg-gold hover:text-black focus-visible:border-gold focus-visible:bg-gold focus-visible:text-black"
      }`}
    >
      {copied ? (
        <><Check size={18} /><span className="hidden sm:inline">Copiado</span></>
      ) : (
        <><Share2 size={18} /><span className="hidden sm:inline">Compartir</span></>
      )}
    </button>
  );
}
