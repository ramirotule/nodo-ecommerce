"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { calculateInstallment, formatPrice } from "@/lib/price-utils";
import { SITE_CONFIG } from "@/constants/site";

export default function CartDrawer() {
  const { items, count, total, drawerOpen, closeDrawer, removeItem, updateCantidad } =
    useCart();

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
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-luxury-black border-l border-luxury-gray z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-luxury-gray">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-gold" />
            <span className="text-white text-sm font-semibold tracking-wider uppercase">
              Carrito
            </span>
            {count > 0 && (
              <span className="bg-gold text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
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
        {count > 0 && (
          <div className="px-5 py-3 bg-[#111111] border-b border-luxury-gray">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-luxury-gray-light">
                {total >= SITE_CONFIG.shipping.freeThreshold 
                  ? "¡Tenés envío gratis!" 
                  : `Te faltan ${formatPrice(SITE_CONFIG.shipping.freeThreshold - total)} para el envío gratis`}
              </span>
              <span className="text-[10px] font-bold text-gold">
                {Math.min(100, Math.round((total / SITE_CONFIG.shipping.freeThreshold) * 100))}%
              </span>
            </div>
            <div className="h-1 w-full bg-luxury-gray rounded-full overflow-hidden">
              <div 
                className="h-full bg-gold transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, (total / SITE_CONFIG.shipping.freeThreshold) * 100)}%` }}
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
                  <div className="w-16 h-16 shrink-0 bg-[#111111] border border-luxury-gray overflow-hidden">
                    {item.imagen_url ? (
                      <Image
                        src={item.imagen_url}
                        alt={item.nombre}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#333333] text-xl">
                        ✦
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-luxury-gray-light text-[10px] tracking-wider uppercase truncate">
                      {item.marca}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium leading-snug truncate">
                        {item.nombre}
                      </p>
                      {item.por_pedido && (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.5">
                          Por pedido
                        </span>
                      )}
                    </div>
                    <p className="text-gold text-sm font-bold mt-0.5">
                      {formatPrice(item.precio_venta)}
                      <span className="text-[10px] ml-1 font-normal text-gray-500 italic">contado/transf.</span>
                    </p>
                    <p className="text-gray-500 text-[10px]">
                      o 3 cuotas de {formatPrice(calculateInstallment(item.precio_venta))}
                    </p>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateCantidad(item.id, item.cantidad - 1)}
                        className="w-6 h-6 border border-luxury-gray-mid flex items-center justify-center text-luxury-gray-light hover:text-white hover:border-[#555555] transition-colors"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="text-white text-sm w-5 text-center">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => updateCantidad(item.id, item.cantidad + 1)}
                        className="w-6 h-6 border border-luxury-gray-mid flex items-center justify-center text-luxury-gray-light hover:text-white hover:border-[#555555] transition-colors"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-[#333333] hover:text-red-400 transition-colors self-start mt-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-luxury-gray px-5 py-5 space-y-4 bg-black/40">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[#555555] text-xs">
                <span>Precio de lista</span>
                <span className="line-through">{formatPrice(total * 1.2236)}</span>
              </div>
              
              <div className="flex items-center justify-between text-green-500/90 text-xs font-medium">
                <span>Ahorro por efectivo/transf.</span>
                <span>-{formatPrice(total * 1.2236 - total)}</span>
              </div>

              <div className="flex items-end justify-between pt-2">
                <div className="flex flex-col">
                  <span className="text-luxury-gray-light text-xs uppercase tracking-wider font-semibold">Total Especial</span>
                  <span className="text-[#555555] text-[10px] italic">Efectivo / Transferencia</span>
                </div>
                <span className="text-yellow-400 font-black text-3xl tracking-tighter">
                  {formatPrice(total)}
                </span>
              </div>
            </div>

            <p className="text-center text-[#555555] text-[10px] bg-[#111111] py-2 border border-luxury-gray">
              O 3 cuotas sin interés de <span className="text-white font-medium">{formatPrice(calculateInstallment(total))}</span>
            </p>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="flex items-center justify-center gap-2 w-full bg-gold text-black font-bold py-3.5 text-sm tracking-wider uppercase hover:bg-gold-light transition-colors"
            >
              Finalizar compra
              <ArrowRight size={16} />
            </Link>
            <button
              onClick={closeDrawer}
              className="w-full text-[#555555] hover:text-white text-xs py-1 transition-colors"
            >
              Seguir comprando
            </button>
          </div>
        )}
      </div>
    </>
  );
}
