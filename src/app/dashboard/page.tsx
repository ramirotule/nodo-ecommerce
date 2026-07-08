import { createClient } from "@/lib/supabase/server";
import { Producto } from "@/types";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: rawProductos },
    { data: categorias },
  ] = await Promise.all([
    supabase.from("productos").select("*").order("created_at", { ascending: false }),
    supabase.from("categorias").select("id, nombre"),
  ]);

  const catMap = new Map(categorias?.map(c => [c.id.toString(), c.nombre]) || []);

  const productos = (rawProductos as any[] || []).map(p => ({
    ...p,
    categoria: p.categoria_id ? (catMap.get(p.categoria_id.toString()) || "") : (p.categoria || "")
  }));

  return <DashboardClient productos={productos as Producto[]} />;
}
