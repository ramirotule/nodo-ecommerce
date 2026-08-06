"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ProductImage from "@/components/ui/ProductImage";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useDolar } from "@/context/DolarContext";
import { calculateInstallment, formatPrice } from "@/lib/price-utils";

interface Props {
  freeShippingFrom?: number
}

export default function CartDrawer({ freeShippingFrom }: Props) {
  const { items, count, total, drawerOpen, closeDrawer, removeItem, updateCantidad } =
    useCart();
  const { rate } = useDolar();

  function toARS(usd: number) {
    return rate ? usd * rate : usd;
  }

  // Lock body scroll when open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-luxury-black border-l border-luxury-gray-mid z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-luxury-gray">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={18} className="text-gold" />
            <span className="text-white text-base font-semibold tracking-wider uppercase">
              Carrito
            </span>
            {count > 0 && (
              <span className="bg-gold text-black text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
          <button
            onClick={closeDrawer}
            className="text-[#555555] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Shipping Progress Bar */}
        {count > 0 && freeShippingFrom && freeShippingFrom > 0 && (
          <div className="px-5 py-3 bg-[#111111] border-b border-luxury-gray">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs uppercase tracking-wide text-luxury-gray-light leading-snug">
                {toARS(total) >= freeShippingFrom
                  ? "¡Tenés envío gratis!"
                  : `Te faltan ${formatPrice(freeShippingFrom - toARS(total))} para el envío gratis`}
              </span>
              <span className="text-xs font-bold text-gold shrink-0 ml-2">
                {Math.min(100, Math.round((toARS(total) / freeShippingFrom) * 100))}%
              </span>
            </div>
            <div className="h-1 w-full bg-luxury-gray rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, (toARS(total) / freeShippingFrom) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-4 px-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag size={40} className="text-luxury-gray-mid mb-4" />
              <p className="text-[#555555] text-sm">Tu carrito está vacío</p>
              <button
                onClick={closeDrawer}
                className="mt-4 text-gold text-xs hover:underline"
              >
                Seguir explorando
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 pb-4 border-b border-luxury-gray last:border-0"
                >
                  {/* Thumbnail */}
                  <div className="w-[72px] h-[72px] shrink-0 product-image-frame border border-luxury-gray overflow-hidden flex items-center justify-center">
                    <ProductImage
                      src={item.imagen_url}
                      alt={item.nombre}
                      width={72}
                      height={72}
                      className="w-full h-full object-contain p-1.5"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-luxury-gray-light text-xs tracking-wider uppercase truncate">
                      {item.marca}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-white text-base font-product font-medium leading-snug truncate">
                        {item.nombre}
                      </p>
                      {item.por_pedido && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.5">
                          Por pedido
                        </span>
                      )}
                    </div>
                    <p className="text-gold text-base font-bold mt-1">
                      {formatPrice(toARS(item.precio_venta))}
                      <span className="text-xs ml-1.5 font-normal text-luxury-gray-light italic">contado/transf.</span>
                    </p>
                    <p className="text-luxury-gray-light text-xs mt-0.5">
                      o 3 cuotas de {formatPrice(calculateInstallment(toARS(item.precio_venta)))}
                    </p>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2.5 mt-2.5">
                      <button
                        onClick={() => updateCantidad(item.id, item.cantidad - 1)}
                        className="w-8 h-8 border border-luxury-gray-mid flex items-center justify-center text-luxury-gray-light hover:text-white hover:border-[#555555] transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-white text-base font-medium w-6 text-center">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => updateCantidad(item.id, item.cantidad + 1)}
                        className="w-8 h-8 border border-luxury-gray-mid flex items-center justify-center text-luxury-gray-light hover:text-white hover:border-[#555555] transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-400 transition-colors self-start mt-0.5 cursor-pointer p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-luxury-gray-mid px-5 py-5 space-y-4 bg-luxury-gray/60">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-luxury-gray-light text-sm">
                <span>Precio de lista</span>
                <span className="line-through">{formatPrice(toARS(total) * 1.2236)}</span>
              </div>

              <div className="flex items-center justify-between cart-savings text-sm font-semibold">
                <span>Ahorro por efectivo/transf.</span>
                <span>-{formatPrice(toARS(total) * 1.2236 - toARS(total))}</span>
              </div>

              <div className="flex items-end justify-between pt-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-luxury-gray-light text-sm uppercase tracking-wider font-semibold">Total Especial</span>
                  <span className="text-luxury-gray-light text-xs italic">Efectivo / Transferencia</span>
                </div>
                <span className="text-yellow-400 font-black text-3xl tracking-tighter">
                  {formatPrice(toARS(total))}
                </span>
              </div>
            </div>

            <p className="text-center text-luxury-gray-light text-sm bg-[#111111] py-2.5 px-3 border border-luxury-gray leading-snug">
              O 3 cuotas de <span className="text-white font-semibold">{formatPrice(calculateInstallment(toARS(total)))}</span>
            </p>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="flex items-center justify-center gap-2 w-full bg-gold text-black font-bold py-4 text-base tracking-wider uppercase hover:bg-gold-light transition-colors"
            >
              Finalizar compra
              <ArrowRight size={18} />
            </Link>
            <button
              onClick={closeDrawer}
              className="w-full text-luxury-gray-light hover:text-white text-sm py-1.5 transition-colors"
            >
              Seguir comprando
            </button>
          </div>
        )}
      </div>
    </>
  );
}
