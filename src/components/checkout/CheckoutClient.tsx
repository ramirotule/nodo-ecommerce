"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import ProductImage from "@/components/ui/ProductImage";
import ImageCarouselModal from "@/components/ui/ImageCarouselModal";
import Link from "next/link";
import {
  ShoppingBag,
  Banknote,
  Building2,
  CreditCard,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useDolar } from "@/context/DolarContext";
import { formatPrice } from "@/lib/price-utils";
import { SITE_CONFIG } from "@/constants/site";
import CheckoutDualPrice from "@/components/checkout/CheckoutDualPrice";

type MetodoPago = "efectivo" | "transferencia" | "getnet";

const METODOS = [
  {
    id: "efectivo" as MetodoPago,
    label: "Efectivo",
    desc: "Precio especial contado. Pagás en persona al retirar o en la entrega.",
    icon: Banknote,
  },
  {
    id: "transferencia" as MetodoPago,
    label: "Transferencia Bancaria",
    desc: "Precio contado. Abonás el 70% como seña y el resto al retirar.",
    icon: Building2,
  },
  {
    id: "getnet" as MetodoPago,
    label: "Tarjeta de crédito en cuotas",
    desc: "Pagá en cuotas con tu tarjeta a través de Getnet.",
    icon: CreditCard,
  },
];

const CUOTAS = [
  { n: 1,  factor: 0.96, label: "1 pago" },
  { n: 2,  factor: 0.93, label: "2 cuotas" },
  { n: 3,  factor: 0.91, label: "3 cuotas" },
  { n: 4,  factor: 0.89, label: "4 cuotas" },
  { n: 5,  factor: 0.86, label: "5 cuotas" },
  { n: 6,  factor: 0.83, label: "6 cuotas" },
  { n: 7,  factor: 0.79, label: "7 cuotas" },
  { n: 8,  factor: 0.76, label: "8 cuotas" },
  { n: 9,  factor: 0.73, label: "9 cuotas" },
  { n: 10, factor: 0.70, label: "10 cuotas" },
  { n: 11, factor: 0.67, label: "11 cuotas" },
  { n: 12, factor: 0.64, label: "12 cuotas" },
];

export default function CheckoutPage() {
  const { items, clearCart, openDrawer, removeItem, updateCantidad } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { rate, loading: dolarLoading } = useDolar();
  const errorParam = searchParams.get("error");

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [cuotasGetnet, setCuotasGetnet] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    errorParam === "pago_fallido" ? "El pago fue rechazado. Intentá nuevamente." : ""
  );
  const [submitted, setSubmitted] = useState(false);
  const [gallery, setGallery] = useState<{ images: string[]; alt: string } | null>(null);

  // Redirect to catalog if cart is empty
  useEffect(() => {
    if (items.length === 0 && !loading) {
      router.replace("/productos");
    }
  }, [items.length, loading, router]);

  // Reset cuotas when switching away from getnet
  useEffect(() => {
    if (metodo !== "getnet") setCuotasGetnet(null);
  }, [metodo]);

  // --- Price calculations ---
  const baseTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.precio_venta * item.cantidad, 0),
    [items]
  );
  const toARS = (amount: number) => (rate ? Math.round(amount * rate) : Math.round(amount));

  const getnetCuota = cuotasGetnet !== null
    ? CUOTAS.find((c) => c.n === cuotasGetnet) ?? null
    : null;

  const getnetTotal = getnetCuota ? Math.round(baseTotal / getnetCuota.factor) : null;
  const getnetCuotaImporte = getnetTotal && getnetCuota
    ? Math.round(getnetTotal / getnetCuota.n)
    : null;

  const sena = Math.round(baseTotal * 0.7);
  const restoTransferencia = baseTotal - sena;

  // The final amount sent to the API depends on method
  const finalTotal =
    metodo === "getnet" && getnetTotal !== null
      ? getnetTotal
      : baseTotal;

  const isGetnet = metodo === "getnet";
  const isTransferencia = metodo === "transferencia";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    if (!nombre || !apellido || !telefono) {
      setError("Por favor, completá los campos obligatorios.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (isGetnet && !cuotasGetnet) {
      setError("Seleccioná la cantidad de cuotas.");
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
          items: items.map((i) => ({
            ...i,
            precio_venta: isGetnet && getnetTotal
              ? Math.round((i.precio_venta / baseTotal) * getnetTotal)
              : i.precio_venta,
          })),
          nombre,
          apellido,
          telefono,
          email,
          direccion,
          notas,
          metodo_pago: metodo,
          cuotas: cuotasGetnet ?? undefined,
          total: finalTotal,
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back button */}
      <div className="mb-8">
        <button
          onClick={openDrawer}
          className="group flex items-center gap-2 text-xs text-muted hover:text-gold transition-colors uppercase tracking-widest font-bold"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Volver al carrito
        </button>
      </div>

      <h1 className="font-serif text-3xl md:text-4xl text-white mb-2">Finalizar compra</h1>
      <p className="text-muted text-base mb-10">Revisá tu pedido y completá tus datos</p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-8">
          {/* Personal data */}
          <section>
            <h2 className="form-section-title">Tus datos</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Nombre *</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={`form-input ${submitted && !nombre ? "form-input-error" : ""}`}
                  placeholder="María"
                />
                {submitted && !nombre && (
                  <p className="text-red-500 text-[10px] mt-1">Campo requerido</p>
                )}
              </div>
              <div>
                <label className="form-label">Apellido *</label>
                <input
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className={`form-input ${submitted && !apellido ? "form-input-error" : ""}`}
                  placeholder="González"
                />
                {submitted && !apellido && (
                  <p className="text-red-500 text-[10px] mt-1">Campo requerido</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="form-label">Teléfono / WhatsApp *</label>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  type="tel"
                  className={`form-input ${submitted && !telefono ? "form-input-error" : ""}`}
                  placeholder="2954 000000"
                />
                {submitted && !telefono && (
                  <p className="text-red-500 text-[10px] mt-1">Campo requerido</p>
                )}
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="form-input"
                  placeholder="opcional"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="form-label">Dirección / Barrio (para envío)</label>
              <input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="form-input"
                placeholder="Calle 123, Barrio Norte — o 'Retiro en tienda'"
              />
            </div>
            <div className="mt-4">
              <label className="form-label">Notas del pedido</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className="form-input resize-none"
                placeholder="Indicaciones especiales, horario preferido, etc."
              />
            </div>
          </section>

          {/* Payment method */}
          <section>
            <h2 className="form-section-title">Forma de pago</h2>
            <div className="space-y-3">
              {METODOS.map((m) => {
                const Icon = m.icon;
                const selected = metodo === m.id;
                return (
                  <label
                    key={m.id}
                    className={`flex items-start gap-4 p-4 cursor-pointer transition-all duration-200 checkout-option ${
                      selected ? "checkout-option-selected" : ""
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
                        selected ? "border-gold" : "border-[var(--color-input-border)]"
                      }`}
                    >
                      {selected && <div className="w-2.5 h-2.5 rounded-full bg-gold" />}
                    </div>
                    <Icon
                      size={18}
                      className={selected ? "text-gold shrink-0 mt-0.5" : "text-muted shrink-0 mt-0.5"}
                    />
                    <div>
                      <p className={`text-base font-semibold ${selected ? "text-gold" : "text-white"}`}>
                        {m.label}
                      </p>
                      <p className="text-muted text-sm mt-0.5">{m.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Cuotas selector — only for getnet */}
            {isGetnet && (
              <div className="mt-5 p-4 checkout-card">
                <p className="text-white text-xs font-bold tracking-[0.15em] uppercase mb-4">
                  Seleccioná la cantidad de cuotas
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {CUOTAS.map(({ n, factor, label }) => {
                    const totalCuota = Math.round(baseTotal / factor);
                    const importe = Math.round(totalCuota / n);
                    const isSelected = cuotasGetnet === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCuotasGetnet(isSelected ? null : n)}
                        className={`flex flex-col items-center p-2.5 border text-center transition-all checkout-option ${
                          isSelected ? "checkout-option-selected text-gold" : "text-muted hover:text-white"
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wider mb-1">{label}</span>
                        <span className="text-sm font-bold">{formatPrice(toARS(importe))}</span>
                        <span className="text-[10px] opacity-60">c/u</span>
                      </button>
                    );
                  })}
                </div>
                {submitted && isGetnet && !cuotasGetnet && (
                  <p className="text-red-500 text-[10px] mt-2">Seleccioná la cantidad de cuotas</p>
                )}
              </div>
            )}

            {/* Transferencia: seña info */}
            {isTransferencia && (
              <div className="mt-4 p-4 border border-gold/30 bg-gold/5">
                <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-2">Detalle de seña</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-end gap-4">
                    <span className="text-muted">Total del pedido</span>
                    <CheckoutDualPrice amount={baseTotal} rate={rate} loading={dolarLoading} />
                  </div>
                  <div className="flex justify-between items-end gap-4 font-bold">
                    <span className="text-gold">Seña (70%) — a transferir ahora</span>
                    <CheckoutDualPrice amount={sena} rate={rate} loading={dolarLoading} />
                  </div>
                  <div className="flex justify-between items-end gap-4 text-xs text-muted pt-1 border-t border-[var(--color-input-border)]">
                    <span>Resto al retirar</span>
                    <CheckoutDualPrice amount={restoTransferencia} rate={rate} loading={dolarLoading} />
                  </div>
                </div>
              </div>
            )}

            {/* Efectivo: dolar rate info */}
            {metodo === "efectivo" && rate && (
              <div className="mt-4 p-3 checkout-card text-xs text-muted flex items-center gap-2">
                <Banknote size={13} className="text-gold shrink-0" />
                Cotización dólar blue utilizada: <span className="text-white font-medium ml-1">${rate.toLocaleString("es-AR")}</span>
              </div>
            )}
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
            ) : isGetnet ? (
              <>
                <CreditCard size={16} />
                Pagar con Getnet
              </>
            ) : isTransferencia ? (
              <>
                <Building2 size={16} />
                Confirmar y recibir datos bancarios
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                Confirmar pedido
              </>
            )}
          </button>
        </form>

        {/* Order summary */}
        <aside className="lg:col-span-5">
          <div className="checkout-card p-6 sticky top-32 shadow-sm">
            <h2 className="form-section-title mb-6">Tu pedido</h2>
            <ul className="space-y-4 mb-6">
              {items.map((item) => {
                const images = [
                  ...new Set([item.imagen_url, ...(item.imagenes_adicionales ?? [])].filter(Boolean)),
                ] as string[];
                const lineTotal = item.precio_venta * item.cantidad;

                return (
                <li key={item.id} className="flex gap-3 items-start pb-4 border-b border-[var(--color-input-border)] last:border-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => images.length > 0 && setGallery({ images, alt: item.nombre })}
                    disabled={images.length === 0}
                    aria-label={`Ver imágenes de ${item.nombre}`}
                    className="w-20 h-20 shrink-0 product-image-frame border border-[var(--color-input-border)] overflow-hidden flex items-center justify-center cursor-zoom-in hover:border-gold/50 transition-colors disabled:cursor-default"
                  >
                    <ProductImage
                      src={item.imagen_url}
                      alt={item.nombre}
                      width={80}
                      height={80}
                      className="w-full h-full object-contain p-1.5"
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-tight">{item.nombre}</p>
                    <p className="text-muted text-sm mt-1">{item.marca}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={() => updateCantidad(item.id, item.cantidad - 1)}
                        aria-label="Disminuir cantidad"
                        className="w-8 h-8 border border-[var(--color-input-border)] flex items-center justify-center text-muted hover:text-white hover:border-gold/50 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-white text-sm font-medium w-6 text-center">
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCantidad(item.id, item.cantidad + 1)}
                        aria-label="Aumentar cantidad"
                        className="w-8 h-8 border border-[var(--color-input-border)] flex items-center justify-center text-muted hover:text-white hover:border-gold/50 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-muted text-xs">
                        {item.cantidad} × {formatPrice(toARS(item.precio_venta))} c/u
                      </p>
                      <p className="text-gold text-sm font-bold">
                        {formatPrice(toARS(lineTotal))}
                      </p>
                      {rate !== null && (
                        <p className="text-gold/80 text-xs">
                          US$ {item.precio_venta.toLocaleString("es-AR")} × {item.cantidad} = US$ {lineTotal.toLocaleString("es-AR")} USD
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Quitar ${item.nombre} del carrito`}
                    className="text-red-500 hover:text-red-400 transition-colors shrink-0 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
                );
              })}
            </ul>

            <div className="border-t border-[var(--color-input-border)] pt-5 space-y-3 text-sm">
              <div className="flex justify-between items-end gap-4">
                <span className="text-muted">Subtotal productos</span>
                <CheckoutDualPrice amount={baseTotal} rate={rate} loading={dolarLoading} />
              </div>

              {/* Shipping */}
              <div className="flex justify-between">
                <span className="text-muted">Envío</span>
                {toARS(baseTotal) >= SITE_CONFIG.shipping.freeThreshold ? (
                  <span className="text-green-500 text-sm font-bold uppercase tracking-wider">Gratis</span>
                ) : (
                  <span className="text-white text-sm font-bold">A convenir</span>
                )}
              </div>

              {/* Getnet installment summary */}
              {isGetnet && getnetCuota && getnetTotal !== null && getnetCuotaImporte !== null && (
                <div className="checkout-card p-3 text-xs space-y-2 border border-gold/20">
                  <div className="flex justify-between">
                    <span className="text-muted">Cuotas</span>
                    <span className="text-white font-medium">{getnetCuota.label}</span>
                  </div>
                  <div className="flex justify-between items-end gap-4">
                    <span className="text-muted">Por cuota</span>
                    <CheckoutDualPrice amount={getnetCuotaImporte} rate={rate} loading={dolarLoading} />
                  </div>
                  <div className="flex justify-between items-end gap-4 pt-1.5 border-t border-[var(--color-input-border)]">
                    <span className="text-muted">Total a pagar</span>
                    <CheckoutDualPrice amount={getnetTotal} rate={rate} loading={dolarLoading} />
                  </div>
                </div>
              )}

              {/* Transferencia seña summary */}
              {isTransferencia && (
                <div className="space-y-2">
                  <div className="flex justify-between items-end gap-4 text-xs">
                    <span className="text-muted">Total del pedido</span>
                    <CheckoutDualPrice amount={baseTotal} rate={rate} loading={dolarLoading} />
                  </div>
                  <div className="flex justify-between items-end gap-4 text-xs bg-gold/10 px-2 py-1.5 border border-gold/20">
                    <span className="text-gold font-semibold">Seña (70%)</span>
                    <CheckoutDualPrice amount={sena} rate={rate} loading={dolarLoading} />
                  </div>
                  <div className="flex justify-between items-end gap-4 text-xs text-muted">
                    <span>Resto al retirar</span>
                    <CheckoutDualPrice amount={restoTransferencia} rate={rate} loading={dolarLoading} />
                  </div>
                </div>
              )}

              {/* Final total */}
              <div className="flex justify-between items-end pt-4 border-t border-[var(--color-input-border)]">
                <div className="flex flex-col">
                  <span className="text-white font-bold text-sm uppercase tracking-wider">Total</span>
                  <span className="text-muted text-xs sm:text-sm">
                    {isGetnet
                      ? cuotasGetnet
                        ? `${cuotasGetnet} cuota${cuotasGetnet > 1 ? "s" : ""}`
                        : "seleccioná cuotas"
                      : isTransferencia
                      ? "Seña a transferir"
                      : "Precio contado"}
                  </span>
                </div>
                {isGetnet && getnetTotal === null ? (
                  <span className="text-3xl font-bold leading-none text-gold">—</span>
                ) : (
                  <CheckoutDualPrice
                    amount={
                      isGetnet && getnetTotal !== null
                        ? getnetTotal
                        : isTransferencia
                        ? sena
                        : baseTotal
                    }
                    rate={rate}
                    loading={dolarLoading}
                    size="lg"
                  />
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ImageCarouselModal
        images={gallery?.images ?? []}
        alt={gallery?.alt ?? ""}
        open={!!gallery}
        onClose={() => setGallery(null)}
      />
    </div>
  );
}
