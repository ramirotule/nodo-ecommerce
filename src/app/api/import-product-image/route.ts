import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PRODUCTS_STORAGE_BUCKET } from "@/lib/supabase/tables";

const MAX_BYTES = 10 * 1024 * 1024;

function extFromContentType(contentType: string | null, url: string): string {
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("gif")) return "gif";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";

  const match = url.split("?")[0].match(/\.(webp|png|gif|jpe?g)$/i);
  if (match) return match[1].toLowerCase().replace("jpeg", "jpg");
  return "jpg";
}

export async function POST(req: NextRequest) {
  const { imageUrl, slug } = (await req.json()) as {
    imageUrl?: string;
    slug?: string;
  };

  if (!imageUrl?.trim()) {
    return NextResponse.json({ error: "Falta imageUrl" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl.trim());
  } catch {
    return NextResponse.json({ error: "URL de imagen inválida" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "URL de imagen inválida" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (perfil?.rol !== "admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (imageUrl.includes("/storage/v1/object/public/productos/")) {
    return NextResponse.json({ publicUrl: imageUrl.trim() });
  }

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: "image/*" },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo descargar la imagen" }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `Error al descargar imagen (${response.status})` },
      { status: 502 }
    );
  }

  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.startsWith("image/")) {
    return NextResponse.json({ error: "La URL no apunta a una imagen" }, { status: 400 });
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Imagen demasiado grande (máx. 10 MB)" }, { status: 400 });
  }

  const ext = extFromContentType(contentType, parsed.toString());
  const safeSlug = (slug || "producto")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
  const fileName = `productos/import-${safeSlug}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCTS_STORAGE_BUCKET)
    .upload(fileName, buffer, {
      contentType: contentType || `image/${ext === "jpg" ? "jpeg" : ext}`,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PRODUCTS_STORAGE_BUCKET).getPublicUrl(fileName);

  return NextResponse.json({ publicUrl });
}
