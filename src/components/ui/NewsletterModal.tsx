"use client";

import { X } from "lucide-react";
import NewsletterSubscribeForm from "@/components/newsletter/NewsletterSubscribeForm";

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  body?: string;
  footer?: string;
}

export default function NewsletterModal({
  isOpen,
  onClose,
  title,
  body,
  footer,
}: NewsletterModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-luxury-black border border-gold/30 max-w-lg w-full p-8 md:p-12 shadow-2xl shadow-black">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X size={24} />
        </button>

        <NewsletterSubscribeForm
          title={title}
          body={body}
          footer={footer}
          onSuccess={() => {
            setTimeout(() => {
              onClose();
            }, 2500);
          }}
        />
      </div>
    </div>
  );
}
