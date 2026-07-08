"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Banknote,
  Building2,
  CreditCard,
  AlertCircle,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { calculateListPrice, formatPrice } from "@/lib/price-utils";
import { SITE_CONFIG } from "@/constants/site";

type MetodoPago = "efectivo" | "transferencia" | "mercadopago";

const METODOS = [
  {
    id: "efectivo" as MetodoPago,
    label: "Efectivo",
    desc: "Pagás en persona al retirar o al momento de la entrega",
    icon: Banknote,
  },
  {
    id: "transferencia" as MetodoPago,
    label: "Transferencia Bancaria",
    desc: "Te enviamos los datos bancarios para que realices la transferencia",
    icon: Building2,
  },
  {
    id: "mercadopago" as MetodoPago,
    label: "MercadoPago",
    desc: "Tarjeta de crédito, débito, cuenta MP o cuotas",
    icon: CreditCard,
  },
];

export default function CheckoutPage() {
  const { items, total, clearCart, openDrawer } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errorParam === "pago_fallido" ? "El pago fue rechazado. Intentá nuevamente." : "");
  const [submitted, setSubmitted] = useState(false);

  // Redirect to catalog if cart is empty
  useEffect(() => {
    if (items.length === 0 && !loading) {
      router.replace("/productos");
    }
  }, [items.length, loading, router]);

  const isMercadoPago = metodo === "mercadopago";
  
  const checkoutItems = items.map(item => ({
    ...item,
    precio_unidad: isMercadoPago ? calculateListPrice(item.precio_venta) : item.precio_venta
  }));

  const finalTotal = checkoutItems.reduce((acc, item) => acc + (item.precio_unidad * item.cantidad), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    if (!nombre || !apellido || !telefono) {
      setError("Por favor, completá los campos obligatorios.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: checkoutItems.map(i => ({
            ...i,
            precio_venta: i.precio_unidad // Override with the calculated price for the method
          })),
          nombre,
          apellido,
          telefono,
          email,
          direccion,
          notas,
          metodo_pago: metodo,
          total: finalTotal
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Ocurrió un error. Intentá nuevamente.");
        setLoading(false);
        return;
      }

      clearCart();
      window.location.href = data.redirectUrl;
    } catch {
      setError("No se pudo conectar. Verificá tu conexión e intentá nuevamente.");
      setLoading(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Botón Volver */}
      <div className="mb-8">
        <button 
          onClick={openDrawer}
          className="group flex items-center gap-2 text-xs text-gray-400 hover:text-gold transition-colors uppercase tracking-widest font-bold"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Volver al carrito
        </button>
      </div>

      <h1 className="font-serif text-3xl text-white mb-2">Finalizar compra</h1>
      <p className="text-gray-400 text-sm mb-10">Revisá tu pedido y completá tus datos</p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-8">
          {/* Datos personales */}
          <section>
            <h2 className="text-white text-xs font-bold tracking-[0.2em] uppercase mb-4 pb-3 border-b border-luxury-gray">
              Tus datos
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-500 text-xs uppercase tracking-wider mb-1.5">
                  Nombre *
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={`w-full bg-black border ${submitted && !nombre ? 'border-red-500' : 'border-luxury-gray'} text-white px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors`}
                  placeholder="María"
                />
                {submitted && !nombre && <p className="text-red-500 text-[10px] mt-1">Campo requerido</p>}
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase tracking-wider mb-1.5">
                  Apellido *
                </label>
                <input
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className={`w-full bg-black border ${submitted && !apellido ? 'border-red-500' : 'border-luxury-gray'} text-white px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors`}
                  placeholder="González"
                />
                {submitted && !apellido && <p className="text-red-500 text-[10px] mt-1">Campo requerido</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-gray-500 text-xs uppercase tracking-wider mb-1.5">
                  Teléfono / WhatsApp *
                </label>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  type="tel"
                  className={`w-full bg-black border ${submitted && !telefono ? 'border-red-500' : 'border-luxury-gray'} text-white px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors`}
                  placeholder="2954 000000"
                />
                {submitted && !telefono && <p className="text-red-500 text-[10px] mt-1">Campo requerido</p>}
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full bg-black border border-luxury-gray text-white px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
                  placeholder="opcional"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-gray-500 text-xs uppercase tracking-wider mb-1.5">
                Dirección / Barrio (para envío)
              </label>
                <input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full bg-black border border-luxury-gray text-white px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
                  placeholder="Calle 123, Barrio Norte — o 'Retiro en tienda'"
                />
            </div>
            <div className="mt-4">
              <label className="block text-gray-500 text-xs uppercase tracking-wider mb-1.5">
                Notas del pedido
              </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className="w-full bg-black border border-luxury-gray text-white px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors resize-none"
                  placeholder="Indicaciones especiales, horario preferido, etc."
                />
            </div>
          </section>

          {/* Método de pago */}
          <section>
            <h2 className="text-white text-xs font-bold tracking-[0.2em] uppercase mb-4 pb-3 border-b border-luxury-gray">
              Forma de pago
            </h2>
            <div className="space-y-3">
              {METODOS.map((m) => {
                const Icon = m.icon;
                const selected = metodo === m.id;
                return (
                  <label
                    key={m.id}
                    className={`flex items-start gap-4 p-4 border cursor-pointer transition-all duration-200 ${
                      selected
                        ? "border-gold bg-gold/5"
                        : "border-luxury-gray hover:border-[#333333] bg-luxury-black"
                    }`}
                  >
                    <input
                      type="radio"
                      name="metodo"
                      value={m.id}
                      checked={selected}
                      onChange={() => setMetodo(m.id)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        selected ? "border-gold" : "border-[#333333]"
                      }`}
                    >
                      {selected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-gold" />
                      )}
                    </div>
                    <Icon
                      size={18}
                      className={selected ? "text-gold shrink-0 mt-0.5" : "text-gray-400 shrink-0 mt-0.5"}
                    />
                    <div>
                      <p className={`text-sm font-semibold ${selected ? "text-gold" : "text-white"}`}>
                        {m.label}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">{m.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gold text-black font-bold py-4 text-sm tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Procesando...
              </>
            ) : metodo === "mercadopago" ? (
              <>
                <CreditCard size={16} />
                Pagar con MercadoPago
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                Confirmar pedido
              </>
            )}
          </button>
        </form>

        <aside className="lg:col-span-2">
          <div className="bg-luxury-black border border-luxury-gray p-6 sticky top-32 shadow-sm">
            <h2 className="text-white text-xs font-bold tracking-[0.2em] uppercase mb-6 pb-3 border-b border-luxury-gray">
              Tu pedido
            </h2>
            <ul className="space-y-4 mb-6">
              {checkoutItems.map((item) => (
                <li key={item.id} className="flex gap-4 items-center">
                  <div className="w-20 h-20 bg-luxury-gray border border-luxury-gray-mid shrink-0 overflow-hidden">
                    {item.imagen_url ? (
                      <Image
                        src={item.imagen_url}
                        alt={item.nombre}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200 text-sm">
                        ✦
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-tight">{item.nombre}</p>
                    <p className="text-gray-400 text-xs mt-1">{item.marca}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-gold text-xs font-bold">
                        {item.cantidad} unidades
                      </span>
                      <span className="text-gray-500 text-[10px]">
                        x {formatPrice(item.precio_unidad)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-luxury-gray pt-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-white">
                  {formatPrice(isMercadoPago ? finalTotal : finalTotal * 1.2236)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-500">Envío</span>
                </div>
                {finalTotal >= SITE_CONFIG.shipping.freeThreshold ? (
                  <span className="text-green-500 text-xs font-bold uppercase tracking-wider">Gratis</span>
                ) : (
                  <span className="text-white text-xs font-bold">A convenir</span>
                )}
              </div>
              
              {!isMercadoPago && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#555555]">
                    <span>Precio de lista</span>
                    <span className="line-through">{formatPrice(finalTotal * 1.2236)}</span>
                  </div>
                  <div className="bg-green-500/10 p-2 text-green-400 text-[10px] font-medium flex justify-between items-center border border-green-500/20">
                    <span>AHORRO POR CONTADO</span>
                    <span className="font-bold">-{formatPrice(finalTotal * 0.2236)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-end pt-4 border-t border-luxury-gray">
                <div className="flex flex-col">
                  <span className="text-white font-bold text-sm uppercase tracking-wider">Total Final</span>
                  <span className="text-gray-400 text-[10px]">
                    {isMercadoPago ? "Precio de lista" : "Precio efectivo / transf."}
                  </span>
                </div>
                <span className={`text-3xl font-bold leading-none ${!isMercadoPago ? 'text-yellow-400' : 'text-white'}`}>
                  {formatPrice(finalTotal)}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
