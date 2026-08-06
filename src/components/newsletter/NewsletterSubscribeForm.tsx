"use client";

import { useState } from "react";
import { Send, CheckCircle2, Smartphone } from "lucide-react";

interface Props {
  title?: string;
  body?: string;
  footer?: string;
  onSuccess?: () => void;
  className?: string;
}

export default function NewsletterSubscribeForm({
  title = "Lista de precios diaria",
  body = "Dejanos tu celular y recibí por WhatsApp la lista de precios actualizada todos los días.",
  footer = "Podés darte de baja en cualquier momento.",
  onSuccess,
  className = "",
}: Props) {
  const [telefono, setTelefono] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "No se pudo completar la suscripción.");
        return;
      }

      setStatus("success");
      setTelefono("");
      onSuccess?.();
    } catch {
      setStatus("error");
      setErrorMessage("Error de conexión. Intentá de nuevo.");
    }
  };

  if (status === "success") {
    return (
      <div className={`text-center py-8 animate-fade-in ${className}`}>
        <CheckCircle2 className="text-gold w-16 h-16 mx-auto mb-6" />
        <h3 className="text-2xl font-serif text-white mb-2">¡Listo!</h3>
        <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
          Te vamos a enviar la lista de precios actualizada por WhatsApp todos los días.
        </p>
      </div>
    );
  }

  return (
    <div className={`animate-fade-in ${className}`}>
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center border border-gold/20">
            <Smartphone className="text-gold" size={28} />
          </div>
        </div>
        <h3 className="text-gold text-xs font-bold tracking-[0.3em] uppercase mb-4">
          Newsletter
        </h3>
        <h2 className="font-serif text-3xl text-white mb-4">{title}</h2>
        <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto">{body}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Tu celular (ej: 11 1234-5678)"
            className="w-full bg-black border border-luxury-gray text-white px-4 py-4 focus:outline-none focus:border-gold transition-colors placeholder:text-gray-700"
          />
          {status === "error" && errorMessage && (
            <p className="text-red-400 text-xs mt-2">{errorMessage}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-gold text-black font-bold py-4 uppercase tracking-widest text-xs hover:bg-gold-light transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === "loading" ? (
            "Procesando..."
          ) : (
            <>
              Suscribirme <Send size={14} />
            </>
          )}
        </button>
      </form>

      <p className="text-[10px] text-gray-600 text-center mt-6 uppercase tracking-widest">
        {footer}
      </p>
    </div>
  );
}
