import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface CartItem {
  id: string;
  nombre: string;
  marca: string;
  slug: string;
  precio_venta: number;
  imagen_url?: string;
  cantidad: number;
}

interface CheckoutBody {
  items: CartItem[];
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  direccion?: string;
  notas?: string;
  metodo_pago: "efectivo" | "transferencia" | "mercadopago";
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars faltantes");
  return createClient(url, key, { auth: { persistSession: false } });
}

function generarNumeroPedido(): string {
  const d = new Date();
  const fecha = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `ORD-${fecha}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: CheckoutBody = await req.json();
    const { items, nombre, apellido, telefono, email, direccion, notas, metodo_pago } = body;

    if (!items?.length || !nombre?.trim() || !apellido?.trim() || !telefono?.trim() || !metodo_pago) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const subtotal = items.reduce((s, i) => s + i.precio_venta * i.cantidad, 0);
    const supabase = getSupabase();

    const { data: pedido, error } = await supabase
      .from("pedidos")
      .insert({
        numero_pedido: generarNumeroPedido(),
        cliente_nombre: nombre.trim(),
        cliente_apellido: apellido.trim(),
        cliente_telefono: telefono.trim(),
        cliente_email: email?.trim() || null,
        cliente_direccion: direccion?.trim() || null,
        cliente_notas: notas?.trim() || null,
        items: items.map((i) => ({
          id: i.id,
          nombre: i.nombre,
          marca: i.marca,
          slug: i.slug,
          precio_venta: i.precio_venta,
          imagen_url: i.imagen_url || null,
          cantidad: i.cantidad,
        })),
        subtotal,
        total: subtotal,
        metodo_pago,
        estado: "pendiente",
      })
      .select()
      .single();

    if (error) {
      console.error("[checkout] Supabase error:", JSON.stringify(error));
      return NextResponse.json(
        { error: `Error al guardar el pedido: ${error.message}` },
        { status: 500 }
      );
    }
    if (!pedido) {
      return NextResponse.json({ error: "No se pudo crear el pedido" }, { status: 500 });
    }

    const orderId = pedido.id as string;
    const baseUrl = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // --- MercadoPago ---
    if (metodo_pago === "mercadopago") {
      const mpToken = process.env.MP_ACCESS_TOKEN;
      if (!mpToken) {
        return NextResponse.json({ error: "MercadoPago no está configurado aún." }, { status: 500 });
      }

      const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mpToken}`,
        },
        body: JSON.stringify({
          items: items.map((i) => ({
            id: i.id,
            title: `${i.nombre} — ${i.marca}`,
            quantity: i.cantidad,
            unit_price: i.precio_venta,
            currency_id: "ARS",
          })),
          payer: {
            name: nombre,
            surname: apellido,
            email: email || "comprador@mitienda.com",
          },
          back_urls: {
            success: `${baseUrl}/checkout/confirmacion?id=${orderId}&mp=success`,
            failure: `${baseUrl}/checkout?error=pago_fallido`,
            pending: `${baseUrl}/checkout/confirmacion?id=${orderId}&mp=pending`,
          },
          auto_return: "approved",
          external_reference: orderId,
          statement_descriptor: "Mi Tienda",
        }),
      });

      if (!mpRes.ok) {
        const errText = await mpRes.text();
        console.error("[checkout] MP error:", errText);
        return NextResponse.json({ error: "Error al crear el pago en MercadoPago" }, { status: 502 });
      }

      const mpData = await mpRes.json();
      const initPoint: string =
        process.env.NODE_ENV === "production" ? mpData.init_point : mpData.sandbox_init_point;

      await supabase.from("pedidos").update({ mp_preference_id: mpData.id }).eq("id", orderId);

      return NextResponse.json({ orderId, redirectUrl: initPoint });
    }

    // Efectivo o transferencia
    return NextResponse.json({
      orderId,
      redirectUrl: `${baseUrl}/checkout/confirmacion?id=${orderId}`,
    });
  } catch (err) {
    console.error("[checkout] Error inesperado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
