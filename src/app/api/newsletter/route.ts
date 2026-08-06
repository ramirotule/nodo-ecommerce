import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeNewsletterPhone } from "@/lib/newsletter/phone";

interface NewsletterBody {
  telefono: string;
  email?: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars faltantes");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as NewsletterBody;
    const telefono = body.telefono?.trim();

    if (!telefono) {
      return NextResponse.json({ error: "Ingresá tu celular" }, { status: 400 });
    }

    const telefonoNormalizado = normalizeNewsletterPhone(telefono);
    if (!telefonoNormalizado) {
      return NextResponse.json(
        { error: "Celular inválido. Usá el formato 11 1234-5678 o +54 9 11 1234-5678" },
        { status: 400 }
      );
    }

    const email = body.email?.trim() || null;
    const supabase = getSupabase();

    const { error } = await supabase.from("newsletter_suscriptores").upsert(
      {
        telefono,
        telefono_normalizado: telefonoNormalizado,
        email,
        activo: true,
      },
      { onConflict: "telefono_normalizado" }
    );

    if (error) {
      console.error("[newsletter] Supabase error:", JSON.stringify(error));
      return NextResponse.json(
        { error: "No se pudo guardar la suscripción. Intentá de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[newsletter] Error inesperado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
