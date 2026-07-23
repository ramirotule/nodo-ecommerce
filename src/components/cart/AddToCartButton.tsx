"use client";

import { useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { useCart, CartItem } from "@/context/CartContext";

interface Props {
  item: Omit<CartItem, "cantidad">;
  inStock: boolean;
  variant?: "card" | "page";
}

export default function AddToCartButton({ item, inStock, variant = "card" }: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (added) return;
    addItem({ ...item, por_pedido: !inStock });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  if (variant === "page") {
    return (
      <button
        onClick={handleAdd}
        data-umami-event={inStock ? "agregar-al-carrito" : "pedido-carrito"}
        data-umami-event-producto={item.nombre}
        className={`flex items-center justify-center gap-2 font-bold px-4 py-3.5 tracking-wider text-sm uppercase transition-all duration-300 flex-1 whitespace-nowrap cursor-pointer ${
          added
            ? "bg-green-600 text-white"
            : "bg-luxury-gray text-gold border border-gold/20 hover:border-gold hover:bg-gold hover:text-black focus-visible:border-gold focus-visible:bg-gold focus-visible:text-black"
        }`}
      >
        {added ? (
          <><Check size={18} />Agregado</>
        ) : (
          <><ShoppingBag size={18} />Agregar al carrito</>
        )}
      </button>
    );
  }

  // Card variant
  return (
    <button
      onClick={handleAdd}
      data-umami-event={inStock ? "agregar-al-carrito" : "pedido-carrito"}
      data-umami-event-producto={item.nombre}
      title={inStock ? "Agregar al carrito" : "Agregar por pedido"}
      className={`add-to-cart-btn flex flex-1 items-center justify-center gap-2 text-sm font-bold px-2 py-2.5 border transition-all duration-200 whitespace-nowrap cursor-pointer ${
        added
          ? "border-green-600 bg-green-600 text-white"
          : "bg-gold border-gold text-white hover:shadow-[0_4px_14px_rgba(0,0,0,0.22)] hover:-translate-y-px active:translate-y-0 active:shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
      }`}
    >
      {added ? (
        <><Check size={16} /><span className="hidden sm:inline">Listo</span></>
      ) : (
        <><ShoppingBag size={16} /><span className="hidden sm:inline">Agregar</span></>
      )}
    </button>
  );
}
