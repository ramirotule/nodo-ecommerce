import { createClient } from "@/lib/supabase/server";
import { Producto } from "@/types";
import ProductoGrid from "@/components/productos/ProductoGrid";
import FiltrosCatalogo from "@/components/productos/FiltrosCatalogo";
import CategoriasSidebar from "@/components/productos/CategoriasSidebar";

interface SearchParams {
  ordenar?: string;
  busqueda?: string;
  nuevo?: string;
  destacado?: string;
  q?: string;
  marca?: string;
  categoria?: string;
  subcategoria?: string;
  seccion?: string;
  tipo?: string;
}

async function getProductos(params: SearchParams): Promise<Producto[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("productos")
      .select("*")
      .eq("activo", true);

    if (params.nuevo === "true") query = query.eq("nuevo", true);
    if (params.destacado === "true") query = query.eq("destacado", true);
    if (params.marca) query = query.eq("marca", params.marca);

    // Filtro por subcategoría (via slug → id)
    if (params.subcategoria) {
      const { data: sub } = await supabase
        .from("subcategorias")
        .select("id")
        .eq("slug", params.subcategoria)
        .single();
      if (sub) {
        query = query.eq("subcategoria_id", sub.id);
      }
    } else if (params.categoria) {
      // Sin subcategoría específica: filtrar por todos los productos de esa categoría
      const { data: subs } = await supabase
        .from("subcategorias")
        .select("id, categorias!inner(slug)")
        .eq("categorias.slug", params.categoria);
      if (subs && subs.length > 0) {
        query = query.in("subcategoria_id", subs.map(s => s.id));
      } else {
        // Fallback: filtro por texto (productos sin subcategoria_id asignado)
        query = query.ilike("categoria", `%${params.categoria.replace(/-/g, " ")}%`);
      }
    }

    if (params.seccion === "bienestar") {
      query = query.ilike("categoria", "%bienestar%");
    }

    if (params.seccion === "aromatizantes") {
      query = query.ilike("categoria", "%aromatizantes%");
    }

    if (params.seccion === "cuidados-piel") {
      query = query.ilike("categoria", "%piel%");
    }

    if (params.busqueda || params.q) {
      const term = params.busqueda || params.q || "";
      query = query.or(
        `nombre.ilike.%${term}%,marca.ilike.%${term}%,descripcion.ilike.%${term}%`,
      );
    }

    switch (params.ordenar) {
      case "precio_asc":
        query = query.order("precio_venta", { ascending: true });
        break;
      case "precio_desc":
        query = query.order("precio_venta", { ascending: false });
        break;
      case "nombre":
        query = query.order("nombre", { ascending: true });
        break;
      default:
        query = query
          .order("destacado", { ascending: false })
          .order("created_at", { ascending: false });
    }

    const { data } = await query.limit(100);
    return (data as Producto[]) || [];
  } catch {
    return [];
  }
}

export default async function CatalogView({
  searchParams,
  title,
}: {
  searchParams: SearchParams;
  title?: string;
}) {
  const productos = await getProductos(searchParams);

  const displayTitle = title || (searchParams.nuevo === "true"
    ? "Novedades"
    : searchParams.destacado === "true"
      ? "Productos Destacados"
      : searchParams.categoria
        ? searchParams.categoria.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())
        : searchParams.seccion === "bienestar"
          ? "Línea Bienestar"
          : searchParams.seccion === "cuidados-piel"
            ? "Cuidados de la Piel"
            : "Catálogo de Productos");

  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="px-4 sm:px-6 lg:px-8 mb-10">
        <p className="text-gold text-xs tracking-[0.3em] uppercase mb-2">
          Catálogo
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-white mb-4">
          {displayTitle}
        </h1>
        <p className="text-luxury-gray-light text-sm">
          {productos.length}{" "}
          {"producto"}
          {productos.length !== 1 ? "s" : ""} {productos.length === 1 ? "encontrado" : "encontrados"} en{" "}
          {searchParams.categoria
            ? searchParams.categoria
                .replace(/-/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())
            : searchParams.seccion === "bienestar"
              ? "toda la categoría Bienestar"
              : searchParams.seccion === "aromatizantes"
                ? "toda la categoría Aromatizantes"
                : searchParams.seccion === "cuidados-piel"
                  ? "toda la categoría Cuidados de la Piel"
                  : "el catálogo"}
        </p>
      </div>

      {/* Filtros Superiores (Horizontales) */}
      <div className="px-4 sm:px-6 lg:px-8">
        <FiltrosCatalogo
          activeParams={searchParams as Record<string, string | undefined>}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-12 px-4 sm:px-6 lg:px-8">
        {/* Grilla de Productos (Centro) */}
        <div className="flex-1 min-w-0">
          <ProductoGrid
            productos={productos}
            emptyMessage="No encontramos productos con ese filtro. Probá con otras opciones."
          />
        </div>

        {/* Sidebar Derecha (Categorías) - Solo mostrar si NO es bienestar o aromatizantes */}
        {!(searchParams.seccion === "bienestar" || 
           searchParams.seccion === "aromatizantes" || 
           searchParams.seccion === "cuidados-piel") && (
          <aside className="lg:w-72 shrink-0">
            <CategoriasSidebar />
          </aside>
        )}
      </div>
    </div>
  );
}
