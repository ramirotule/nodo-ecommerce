import { createClient } from "@/lib/supabase/server";
import { Producto } from "@/types";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: rawProductos },
    { data: categorias },
    { data: proveedores },
  ] = await Promise.all([
    supabase.from("productos").select("*").order("created_at", { ascending: false }),
    supabase.from("categorias").select("id, nombre"),
    supabase.from("proveedores").select("id, nombre"),
  ]);

  const catMap = new Map(categorias?.map(c => [c.id.toString(), c.nombre]) || []);
  const provMap = new Map(proveedores?.map(p => [p.id.toString(), p.nombre]) || []);

  const productos = (rawProductos as any[] || []).map(p => ({
    ...p,
    categoria: p.categoria_id ? (catMap.get(p.categoria_id.toString()) || "") : (p.categoria || ""),
    proveedores: p.proveedor_id ? { nombre: provMap.get(p.proveedor_id.toString()) ?? null } : null,
  }));

  return <DashboardClient productos={productos as Producto[]} />;
}
