import { createClient } from "@/lib/supabase/server";
import { Producto } from "@/types";
import { PRODUCTS_TABLE } from "@/lib/supabase/tables";
import ProductoGrid from "@/components/productos/ProductoGrid";
import FiltrosCatalogo from "@/components/productos/FiltrosCatalogo";
import { getSiteConfig } from "@/lib/site-config/getSiteConfig";

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
  vista?: string;
}

async function getProductos(params: SearchParams): Promise<Producto[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from(PRODUCTS_TABLE)
      .select("*")
      .eq("activo", true);

    if (params.nuevo === "true") query = query.eq("nuevo", true);
    if (params.destacado === "true") query = query.eq("destacado", true);
    if (params.marca) query = query.eq("marca", params.marca);

    let categoriaId: string | null = null;
    if (params.categoria) {
      const { data: cat } = await supabase
        .from("categorias")
        .select("id")
        .eq("slug", params.categoria)
        .maybeSingle();
      categoriaId = cat?.id ?? null;
    }

    if (params.subcategoria) {
      let subQuery = supabase
        .from("subcategorias")
        .select("id")
        .eq("slug", params.subcategoria);

      if (categoriaId) {
        subQuery = subQuery.eq("categoria_id", categoriaId);
      }

      const { data: sub } = await subQuery.maybeSingle();

      if (sub) {
        query = query.eq("subcategoria_id", sub.id);
      } else {
        return [];
      }
    } else if (params.categoria) {
      if (categoriaId) {
        const { data: subs } = await supabase
          .from("subcategorias")
          .select("id")
          .eq("categoria_id", categoriaId);

        const subIds = (subs ?? []).map((s) => s.id);

        if (subIds.length > 0) {
          query = query.or(
            `categoria_id.eq.${categoriaId},subcategoria_id.in.(${subIds.join(",")})`
          );
        } else {
          query = query.eq("categoria_id", categoriaId);
        }
      } else {
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
      const tagTerm = term.toLowerCase().replace(/[{},]/g, "");
      query = query.or(
        `nombre.ilike.%${term}%,marca.ilike.%${term}%,descripcion.ilike.%${term}%,tags.cs.{${tagTerm}}`,
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
  const supabase = await createClient()

  const [productos, siteConfig] = await Promise.all([
    getProductos(searchParams),
    getSiteConfig(),
  ])

  // Fetch subcategories and brands of the current category for the filter bar
  let subcategoriasFiltro: { id: string; nombre: string; slug: string }[] = []
  let marcasFiltro: string[] = []
  if (searchParams.categoria) {
    const { data: cat } = await supabase
      .from('categorias')
      .select('id')
      .eq('slug', searchParams.categoria)
      .single()
    if (cat) {
      const { data: subs } = await supabase
        .from('subcategorias')
        .select('id, nombre, slug')
        .eq('categoria_id', cat.id)
        .eq('activo', true)
        .order('orden')
      subcategoriasFiltro = subs ?? []

      if (searchParams.subcategoria) {
        const { data: sub } = await supabase
          .from('subcategorias')
          .select('id')
          .eq('slug', searchParams.subcategoria)
          .eq('categoria_id', cat.id)
          .maybeSingle()

        if (sub) {
          const { data: marcasRows } = await supabase
            .from(PRODUCTS_TABLE)
            .select('marca')
            .eq('activo', true)
            .eq('subcategoria_id', sub.id)

          marcasFiltro = [
            ...new Set(
              (marcasRows ?? [])
                .map((row) => row.marca?.trim())
                .filter((marca): marca is string => Boolean(marca))
            ),
          ].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
        }
      } else {
        const subIds = subcategoriasFiltro.map((s) => s.id)
        let marcasQuery = supabase
          .from(PRODUCTS_TABLE)
          .select('marca')
          .eq('activo', true)

        if (subIds.length > 0) {
          marcasQuery = marcasQuery.or(
            `categoria_id.eq.${cat.id},subcategoria_id.in.(${subIds.join(',')})`
          )
        } else {
          marcasQuery = marcasQuery.eq('categoria_id', cat.id)
        }

        const { data: marcasRows } = await marcasQuery
        marcasFiltro = [
          ...new Set(
            (marcasRows ?? [])
              .map((row) => row.marca?.trim())
              .filter((marca): marca is string => Boolean(marca))
          ),
        ].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
      }
    }
  }

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
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="px-4 sm:px-6 lg:px-8 mb-5">
        <p className="text-gold text-xs tracking-[0.3em] uppercase mb-1">
          Catálogo
        </p>
        <h1 className="font-serif text-2xl md:text-3xl text-white mb-1.5">
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
          subcategorias={subcategoriasFiltro}
          marcas={marcasFiltro}
        />
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        <ProductoGrid
          productos={productos}
          emptyMessage="No encontramos productos con ese filtro. Probá con otras opciones."
          dolarEnabled={siteConfig.feature_precios_usd}
          vista={searchParams.vista || "estandar"}
          showViewToggle={false}
        />
      </div>
    </div>
  );
}
