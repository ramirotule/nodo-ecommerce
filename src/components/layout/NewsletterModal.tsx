"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import NewsletterSubscribeForm from "@/components/newsletter/NewsletterSubscribeForm";

interface Props {
  title?: string;
  body?: string;
  footer?: string;
}

export default function NewsletterModal({ title, body, footer }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const hasSeenNewsletter = localStorage.getItem("newsletter-dismissed");

    if (!hasSeenNewsletter) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem("newsletter-dismissed", "true");
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-300 ${isClosing ? "opacity-0" : "opacity-100"}`}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={handleClose}
      />

      <div
        className={`relative bg-zinc-900 border border-gold/30 w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.15)] transition-all duration-500 transform ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-gold transition-colors z-10"
          aria-label="Cerrar"
        >
          <X size={24} />
        </button>

        <div className="p-8 md:p-12">
          <NewsletterSubscribeForm
            title={title}
            body={body}
            footer={footer}
            onSuccess={() => {
              setTimeout(handleClose, 2500);
            }}
          />
        </div>
      </div>
    </div>
  );
}
