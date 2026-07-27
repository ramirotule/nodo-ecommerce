"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Producto } from "@/types";
import { calcPrecioVentaFromCosto } from "@/lib/price-utils";
import { PRODUCTS_TABLE } from "@/lib/supabase/tables";
import { sanitizeProductPayload } from "@/lib/supabase/product-columns";
import {
  applyTextTransform,
  getProductFieldValue,
  uniqueProductSlug,
  type BulkTextField,
  type TextTransformOptions,
} from "@/lib/text-transform";
import { slugifyText } from "@/lib/product-slug";
import {
  categoriaFilterOptions,
  categoriaSelectOptions,
  subcategoriaSelectOptions,
} from "@/lib/catalog-select-options";
import CurrencyInput from "@/components/ui/CurrencyInput";
import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  ArrowDown,
  ArrowUp,
  X,
  RefreshCw,
  LayoutGrid,
} from "lucide-react";
import BulkImportModal from "./BulkImportModal";
import BulkImagenesModal from "./BulkImagenesModal";
import BulkActionsModal from "./BulkActionsModal";
import ReconciliarPreciosModal from "./ReconciliarPreciosModal";
import * as XLSX from "xlsx";
import CustomSelect from "@/components/ui/CustomSelect";
import toast from "react-hot-toast";

interface Stats {
  total: number;
  activos: number;
  sinStock: number;
  valorInventario: number;
  margenPromedio: number;
}

interface Props {
  productos: Producto[];
}

export default function DashboardClient({ productos: initialProductos }: Props) {
  const searchParams = useSearchParams();
  const [productos, setProductos] = useState<Producto[]>(initialProductos);
  const [loading, setLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: "", nombre: "" });
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isReconciliarModalOpen, setIsReconciliarModalOpen] = useState(false);
  const [bulkImagenesModal, setBulkImagenesModal] = useState(false);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [categoriaFiltrada, setCategoriaFiltrada] = useState<string>(searchParams.get('cat') ?? "");
  const [subcategoriaFiltrada, setSubcategoriaFiltrada] = useState<string>(searchParams.get('sub') ?? "");
  const [proveedorFiltrado, setProveedorFiltrado] = useState<string>(searchParams.get('prov') ?? "");
  const [bulkActionsModal, setBulkActionsModal] = useState(false);
  const [precioModal, setPrecioModal] = useState<{ open: boolean; venta: number; costo: number }>({ open: false, venta: 0, costo: 0 });
  const [categoriasDb, setCategoriasDb] = useState<{id: string, nombre: string, activo?: boolean}[]>([]);
  const [proveedoresDb, setProveedoresDb] = useState<{id: string, nombre: string}[]>([]);
  const [marcasDb, setMarcasDb] = useState<{id: string, nombre: string}[]>([]);
  const [subcategoriasDb, setSubcategoriasDb] = useState<{id: string, nombre: string, slug: string, categoria_id: string, activo?: boolean}[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function fetchProductos() {
    try {
      setBulkLoading(true);
      // Cargamos categorías y productos en paralelo para máxima eficiencia
      const [{ data: cats }, { data: subs }, { data: prods, error: prodsError }, { data: provs }] = await Promise.all([
        supabase.from("categorias").select("id, nombre, activo").order("nombre"),
        supabase.from("subcategorias").select("id, nombre, categoria_id, activo").order("nombre"),
        supabase.from(PRODUCTS_TABLE).select("*").order("created_at", { ascending: false }),
        supabase.from("proveedores").select("id, nombre"),
      ]);

      if (prodsError) {
        console.error("Error cargando productos:", prodsError.message);
        toast.error(`Error al cargar productos: ${prodsError.message}`);
        return;
      }

      if (!prods) return;

      const catMap = new Map(cats?.map(c => [c.id.toString(), c.nombre]) || []);
      const subMap = new Map(subs?.map(s => [s.id.toString(), s.nombre]) || []);
      const provMap = new Map(provs?.map(p => [p.id.toString(), p.nombre]) || []);

      const formattedData = (prods as any[]).map(p => ({
        ...p,
        categoria: p.categoria_id ? (catMap.get(p.categoria_id.toString()) || "") : (p.categoria || ""),
        subcategorias: p.subcategoria_id
          ? { nombre: subMap.get(p.subcategoria_id.toString()) ?? "" }
          : undefined,
        proveedores: p.proveedor_id ? { nombre: provMap.get(p.proveedor_id.toString()) ?? null } : null,
      }));

      setProductos(formattedData as Producto[]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setBulkLoading(false);
    }
  }

  const fetchCategorias = async () => {
    const [{ data: cats }, { data: subs }, { data: provs }, { data: marcas }] = await Promise.all([
      supabase.from("categorias").select("id, nombre, activo").order("nombre"),
      supabase.from("subcategorias").select("id, nombre, slug, categoria_id, activo").order("nombre"),
      supabase.from("proveedores").select("id, nombre").order("nombre"),
      supabase.from("marcas").select("id, nombre").order("nombre"),
    ]);
    if (cats) setCategoriasDb(cats);
    if (subs) setSubcategoriasDb(subs);
    if (provs) setProveedoresDb(provs);
    if (marcas) setMarcasDb(marcas);
  };

  const marcasBulk = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of marcasDb) {
      const trimmed = m.nombre.trim();
      if (trimmed) seen.set(trimmed.toLowerCase(), trimmed);
    }
    for (const p of productos) {
      const trimmed = p.marca?.trim();
      if (trimmed) seen.set(trimmed.toLowerCase(), trimmed);
    }
    return Array.from(seen.values())
      .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
      .map((nombre) => ({ id: nombre, nombre }));
  }, [marcasDb, productos]);

  useEffect(() => {
    fetchCategorias();
    fetchProductos();
  }, []);

  useEffect(() => {
    if (selectedIds.size === 0) setBulkActionsModal(false);
  }, [selectedIds.size]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (busqueda) params.set('q', busqueda);
    if (categoriaFiltrada) params.set('cat', categoriaFiltrada);
    if (subcategoriaFiltrada) params.set('sub', subcategoriaFiltrada);
    if (proveedorFiltrado) params.set('prov', proveedorFiltrado);
    const qs = params.toString();
    router.replace(`/dashboard${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [busqueda, categoriaFiltrada, subcategoriaFiltrada, proveedorFiltrado]);

  // Cálculos de estadísticas en tiempo real
  const currentStats = {
    total: productos.length,
    activos: productos.filter((p) => p.activo).length,
    sinStock: productos.filter((p) => p.stock === 0).length,
    valorInventario: productos.reduce((sum, p) => sum + (p.precio_costo || 0) * p.stock, 0),
    margenPromedio: (() => {
      const conCosto = productos.filter((p) => p.precio_costo && p.precio_costo > 0);
      if (conCosto.length === 0) return 0;
      const total = conCosto.reduce(
        (sum, p) => sum + ((p.precio_venta - (p.precio_costo || 0)) / p.precio_venta) * 100,
        0
      );
      return Math.round(total / conCosto.length);
    })(),
  };

  // Multi-select logic
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === productosFiltrados.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(productosFiltrados.map((p) => p.id)));
    }
  };

  async function toggleActivo(id: string, activo: boolean) {
    setLoading(id);
    await supabase.from(PRODUCTS_TABLE).update({ activo: !activo }).eq("id", id);
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, activo: !activo } : p))
    );
    setLoading(null);
  }

  async function bulkToggleActivo(activo: boolean) {
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    await supabase.from(PRODUCTS_TABLE).update({ activo }).in("id", ids);
    setProductos((prev) =>
      prev.map((p) => (selectedIds.has(p.id) ? { ...p, activo } : p))
    );
    setSelectedIds(new Set());
    setBulkLoading(false);
    toast.success(`Se actualizaron ${ids.length} productos.`);
  }
  
  async function bulkToggleDestacado(destacado: boolean) {
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from(PRODUCTS_TABLE)
      .update({ destacado })
      .in("id", ids);

    if (error) {
      toast.error("Error al actualizar destacados.");
    } else {
      setProductos((prev) =>
        prev.map((p) => (selectedIds.has(p.id) ? { ...p, destacado } : p))
      );
      setSelectedIds(new Set());
      toast.success(
        destacado
          ? `${ids.length} producto${ids.length !== 1 ? "s" : ""} marcado${ids.length !== 1 ? "s" : ""} como destacado${ids.length !== 1 ? "s" : ""}.`
          : `Se quitó el destacado de ${ids.length} producto${ids.length !== 1 ? "s" : ""}.`
      );
    }
    setBulkLoading(false);
  }

  async function bulkUpdateMoneda(moneda: "ARS" | "USD") {
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from(PRODUCTS_TABLE)
      .update({ moneda })
      .in("id", ids);

    if (error) {
      toast.error("Error al actualizar moneda.");
    } else {
      setProductos((prev) =>
        prev.map((p) => (selectedIds.has(p.id) ? { ...p, moneda } : p))
      );
      setSelectedIds(new Set());
      toast.success(`Moneda actualizada a ${moneda} en ${ids.length} producto${ids.length !== 1 ? "s" : ""}.`);
    }
    setBulkLoading(false);
  }

  async function createCategoriaBulk(nombre: string) {
    const trimmed = nombre.trim();
    if (!trimmed) return null;

    const existing = categoriasDb.find(
      (c) => c.nombre.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      toast.error("Ya existe una categoría con ese nombre.");
      return existing;
    }

    const slug = slugifyText(trimmed);
    const { data, error } = await supabase
      .from("categorias")
      .insert({ nombre: trimmed, slug, orden: categoriasDb.length + 1 })
      .select("id, nombre, activo")
      .single();

    if (error) {
      toast.error(error.message);
      return null;
    }

    setCategoriasDb((prev) => [...prev, data]);
    toast.success(`Categoría "${trimmed}" creada.`);
    return data;
  }

  async function createSubcategoriaBulk(nombre: string, categoriaId: string) {
    const trimmed = nombre.trim();
    if (!trimmed || !categoriaId) return null;

    const existing = subcategoriasDb.find(
      (s) =>
        s.categoria_id === categoriaId &&
        s.nombre.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      toast.error("Ya existe esa subcategoría en la categoría seleccionada.");
      return existing;
    }

    const slug = slugifyText(trimmed);
    const orden =
      subcategoriasDb.filter((s) => s.categoria_id === categoriaId).length + 1;

    const { data, error } = await supabase
      .from("subcategorias")
      .insert({
        nombre: trimmed,
        slug,
        orden,
        categoria_id: categoriaId,
        activo: true,
      })
      .select("id, nombre, slug, categoria_id, activo")
      .single();

    if (error) {
      toast.error(error.message);
      return null;
    }

    setSubcategoriasDb((prev) => [...prev, data]);
    toast.success(`Subcategoría "${trimmed}" creada.`);
    return data;
  }

  async function bulkUpdateCategoriaSubcategoria(categoriaId: string, subcategoriaId: string | null) {
    setBulkLoading(true);
    const ids = Array.from(selectedIds);

    const cat = categoriasDb.find((c) => c.id === categoriaId);
    if (!cat) {
      toast.error("Categoría no encontrada.");
      setBulkLoading(false);
      return;
    }

    const sub = subcategoriaId
      ? subcategoriasDb.find((s) => s.id === subcategoriaId)
      : null;

    if (subcategoriaId && !sub) {
      toast.error("Subcategoría no encontrada.");
      setBulkLoading(false);
      return;
    }

    if (sub && sub.categoria_id !== categoriaId) {
      toast.error("La subcategoría no pertenece a la categoría seleccionada.");
      setBulkLoading(false);
      return;
    }

    const { error } = await supabase
      .from(PRODUCTS_TABLE)
      .update({
        categoria_id: categoriaId,
        subcategoria_id: subcategoriaId,
      })
      .in("id", ids);

    if (error) {
      toast.error("Error al actualizar categoría.");
    } else {
      setProductos((prev) =>
        prev.map((p) =>
          selectedIds.has(p.id)
            ? {
                ...p,
                categoria_id: categoriaId,
                categoria: cat.nombre,
                subcategoria_id: subcategoriaId ?? undefined,
                subcategorias: sub ? { nombre: sub.nombre } : undefined,
              }
            : p
        )
      );
      setSelectedIds(new Set());
      toast.success("Categoría actualizada correctamente.");
    }
    setBulkLoading(false);
  }

  async function bulkUpdateProveedor(proveedorId: string | null) {
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from(PRODUCTS_TABLE)
      .update({ proveedor_id: proveedorId })
      .in("id", ids);
    if (error) {
      toast.error("Error al actualizar proveedor.");
    } else {
      const provNombre = proveedorId
        ? proveedoresDb.find((p) => p.id === proveedorId)?.nombre ?? null
        : null;
      setProductos((prev) =>
        prev.map((p) =>
          selectedIds.has(p.id)
            ? {
                ...p,
                proveedor_id: proveedorId ?? undefined,
                proveedores: proveedorId && provNombre ? { nombre: provNombre } : undefined,
              }
            : p
        )
      );
      setSelectedIds(new Set());
      toast.success(`Proveedor actualizado en ${ids.length} productos.`);
    }
    setBulkLoading(false);
  }

  async function bulkUpdateMarca(marca: string) {
    const trimmed = marca.trim();
    if (!trimmed) return;

    setBulkLoading(true);
    const targets = productos.filter((p) => selectedIds.has(p.id));
    const usedSlugs = new Set(
      productos.filter((p) => !selectedIds.has(p.id)).map((p) => p.slug)
    );

    let errors = 0;
    const updates: Array<{ id: string; marca: string; slug: string }> = [];

    for (const product of targets) {
      const provNombre = product.proveedor_id
        ? proveedoresDb.find((p) => p.id === product.proveedor_id)?.nombre
        : null;
      const provKey = provNombre ? slugifyText(provNombre) : null;
      const slug = uniqueProductSlug(product.nombre, trimmed, usedSlugs, provKey);
      usedSlugs.add(slug);
      updates.push({ id: product.id, marca: trimmed, slug });
    }

    for (const { id, marca: newMarca, slug } of updates) {
      const payload = await sanitizeProductPayload(supabase, { marca: newMarca, slug });
      const { error } = await supabase.from(PRODUCTS_TABLE).update(payload).eq("id", id);
      if (error) {
        console.error("Error al actualizar marca:", error.message);
        errors++;
      }
    }

    if (errors > 0) {
      toast.error(`No se pudieron actualizar ${errors} producto${errors !== 1 ? "s" : ""}.`);
      await fetchProductos();
    } else {
      setProductos((prev) =>
        prev.map((p) => {
          const update = updates.find((u) => u.id === p.id);
          return update ? { ...p, marca: update.marca, slug: update.slug } : p;
        })
      );
      setSelectedIds(new Set());
      toast.success(`Marca actualizada en ${updates.length} producto${updates.length !== 1 ? "s" : ""}.`);
    }
    setBulkLoading(false);
  }

  async function bulkUpdatePrecios() {
    const { venta, costo } = precioModal;
    if (venta <= 0 && costo <= 0) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    const payload: Record<string, number> = {};
    if (costo > 0) {
      payload.precio_costo = costo;
      if (venta <= 0) payload.precio_venta = calcPrecioVentaFromCosto(costo);
    }
    if (venta > 0) payload.precio_venta = venta;
    const { error } = await supabase.from(PRODUCTS_TABLE).update(payload).in("id", ids);
    if (error) {
      toast.error("Error al actualizar precios.");
    } else {
      setProductos((prev) => prev.map((p) => selectedIds.has(p.id) ? { ...p, ...payload } : p));
      setSelectedIds(new Set());
      setPrecioModal({ open: false, venta: 0, costo: 0 });
      toast.success(`Precios actualizados en ${ids.length} productos.`);
    }
    setBulkLoading(false);
  }

  function handleImagesSaved(id: string, imagen_url: string | null, imagenes_adicionales: string[]) {
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, imagen_url: imagen_url ?? undefined, imagenes_adicionales } : p))
    );
  }

  async function ejecutarEliminarBulk() {
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    await supabase.from(PRODUCTS_TABLE).delete().in("id", ids);
    setProductos((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setBulkLoading(false);
    setBulkDeleteModal(false);
    toast.success("Productos eliminados correctamente.");
  }

  const downloadExcel = (data?: Producto[]) => {
    const toExport = data || productos.filter((p) => selectedIds.has(p.id));
    if (toExport.length === 0) return;

    const subMap = new Map(subcategoriasDb.map((s) => [s.id, s.nombre]));

    const exportData = toExport.map((p) => ({
      nombre: p.nombre,
      marca: p.marca,
      categoria: p.categoria || "",
      subcategoria:
        p.subcategorias?.nombre ||
        (p.subcategoria_id ? subMap.get(p.subcategoria_id) || "" : ""),
      proveedor: p.proveedores?.nombre || "",
      descrip_provee: p.descrip_provee || "",
      precio_costo: p.precio_costo || 0,
      precio_venta: p.precio_venta || 0,
      stock: p.stock || 0,
      imagenes: [p.imagen_url, ...(p.imagenes_adicionales || [])].filter(Boolean).join(" | "),
      activo: p.activo ? "SI" : "NO",
      destacado: p.destacado ? "SI" : "NO",
      nuevo: p.nuevo ? "SI" : "NO",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, `export_productos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  function confirmarEliminar(id: string, nombre: string) {
    setDeleteModal({ isOpen: true, id, nombre });
  }

  async function ejecutarEliminar() {
    if (!deleteModal.id) return;
    setLoading(deleteModal.id);
    await supabase.from(PRODUCTS_TABLE).delete().eq("id", deleteModal.id);
    setProductos((prev) => prev.filter((p) => p.id !== deleteModal.id));
    setLoading(null);
    setDeleteModal({ isOpen: false, id: "", nombre: "" });
    toast.success("Producto eliminado.");
  }

  async function bulkRenameText(field: BulkTextField, options: TextTransformOptions) {
    const targets = productos.filter((p) => selectedIds.has(p.id));
    if (targets.length === 0) return;

    setBulkLoading(true);

    const usedSlugs = new Set(
      productos.filter((p) => !selectedIds.has(p.id)).map((p) => p.slug)
    );

    const updates: Array<{ id: string; payload: Record<string, string> }> = [];

    for (const product of targets) {
      const before = getProductFieldValue(product, field);
      const after = applyTextTransform(before, options);
      if (after === before) continue;

      const payload: Record<string, string> = { [field]: after };

      if (field === "nombre" || field === "marca") {
        const newNombre = field === "nombre" ? after : product.nombre;
        const newMarca = field === "marca" ? after : product.marca;
        const provNombre = product.proveedor_id
          ? proveedoresDb.find((p) => p.id === product.proveedor_id)?.nombre
          : null;
        const provKey = provNombre ? slugifyText(provNombre) : null;
        payload.slug = uniqueProductSlug(newNombre, newMarca, usedSlugs, provKey);
      }

      updates.push({ id: product.id, payload });
    }

    if (updates.length === 0) {
      toast.error("Ningún producto requería cambios con esas reglas.");
      setBulkLoading(false);
      return;
    }

    let errors = 0;
    for (const { id, payload } of updates) {
      const sanitized = await sanitizeProductPayload(supabase, payload);
      const { error } = await supabase.from(PRODUCTS_TABLE).update(sanitized).eq("id", id);
      if (error) {
        console.error("Error renombrando producto:", error.message);
        errors++;
      }
    }

    if (errors > 0) {
      toast.error(`No se pudieron actualizar ${errors} producto${errors !== 1 ? "s" : ""}.`);
      await fetchProductos();
    } else {
      setProductos((prev) =>
        prev.map((p) => {
          const update = updates.find((u) => u.id === p.id);
          return update ? { ...p, ...update.payload } : p;
        })
      );
      toast.success(`Se actualizaron ${updates.length} producto${updates.length !== 1 ? "s" : ""}.`);
    }

    setSelectedIds(new Set());
    setBulkLoading(false);
  }

  const catSeleccionada = categoriasDb.find(c => c.nombre === categoriaFiltrada);
  const subcategoriasParaCategoria = catSeleccionada
    ? subcategoriasDb.filter(s => s.categoria_id === catSeleccionada.id)
    : [];

  const productosFiltrados = productos.filter((p) => {
    // 1. Filtro por búsqueda
    const term = busqueda.toLowerCase().trim();
    const matchesBusqueda = !term ||
      p.nombre.toLowerCase().includes(term) ||
      p.marca.toLowerCase().includes(term) ||
      (p.tags ?? []).some((tag) => tag.toLowerCase().includes(term));

    // 2. Filtro por categoría
    const cat = p.categoria || "Fragancias";
    const matchesCategoria = !categoriaFiltrada || cat === categoriaFiltrada;

    // 3. Filtro por subcategoría
    const matchesSubcategoria = !subcategoriaFiltrada || (p as any).subcategoria_id === subcategoriaFiltrada;

    // 4. Filtro por proveedor
    const matchesProveedor =
      !proveedorFiltrado || p.proveedor_id?.toString() === proveedorFiltrado;

    // 5. Filtro "solo pendientes de completar"
    const matchesPendiente = !soloPendientes || p.pendiente_completar;

    return matchesBusqueda && matchesCategoria && matchesSubcategoria && matchesProveedor && matchesPendiente;
  }).sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue: any = a[sortConfig.key as keyof Producto];
    let bValue: any = b[sortConfig.key as keyof Producto];

    // Casos especiales para campos virtuales o anidados
    if (sortConfig.key === "categoria") {
      aValue = a.categoria || "Fragancias";
      bValue = b.categoria || "Fragancias";
    }

    if (sortConfig.key === "subcategoria") {
      aValue = a.subcategorias?.nombre ?? "";
      bValue = b.subcategorias?.nombre ?? "";
    }

    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <div className="bg-luxury-black border border-luxury-gray p-5">
          <div className="flex items-center gap-2 text-luxury-gray-light text-xs mb-2">
            <Package size={14} /> TOTAL
          </div>
          <p className="text-white font-bold text-2xl">{currentStats.total}</p>
          <p className="text-[#555555] text-xs">productos</p>
        </div>
        <div className="bg-luxury-black border border-luxury-gray p-5">
          <div className="flex items-center gap-2 text-gold text-xs mb-2">
            <Eye size={14} /> ACTIVOS
          </div>
          <p className="text-white font-bold text-2xl">{currentStats.activos}</p>
          <p className="text-[#555555] text-xs">publicados</p>
        </div>
        <div className="bg-luxury-black border border-luxury-gray p-5">
          <div className="flex items-center gap-2 text-orange-400 text-xs mb-2">
            <AlertTriangle size={14} /> SIN STOCK
          </div>
          <p className="text-white font-bold text-2xl">{currentStats.sinStock}</p>
          <p className="text-[#555555] text-xs">para reponer</p>
        </div>
        <div className="bg-luxury-black border border-luxury-gray p-5">
          <div className="flex items-center gap-2 text-green-400 text-xs mb-2">
            <DollarSign size={14} /> INVENTARIO
          </div>
          <p className="text-white font-bold text-2xl">
            ${currentStats.valorInventario.toLocaleString("es-AR")}
          </p>
          <p className="text-[#555555] text-xs">valor costo</p>
        </div>
        <div className="bg-luxury-black border border-luxury-gray p-5">
          <div className="flex items-center gap-2 text-gold text-xs mb-2">
            <TrendingUp size={14} /> MARGEN
          </div>
          <p className="text-white font-bold text-2xl">{currentStats.margenPromedio}%</p>
          <p className="text-[#555555] text-xs">promedio</p>
        </div>
      </div>

      {/* Acciones de catálogo — fila superior */}
      <div className="flex justify-end gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-1.5 bg-luxury-gray text-white border border-luxury-gray-mid font-bold px-3 py-2 text-xs tracking-wider hover:bg-[#252525] transition-colors whitespace-nowrap group h-10"
        >
          <div className="relative flex items-center">
            <FileSpreadsheet size={14} className="text-gold" />
            <ArrowDown size={8} className="text-white absolute -right-1 -bottom-1 bg-luxury-gray rounded-full group-hover:translate-y-0.5 transition-transform" />
          </div>
          Importar
        </button>
        <button
          onClick={() => downloadExcel(productosFiltrados)}
          className="flex items-center gap-1.5 bg-luxury-gray text-white border border-luxury-gray-mid font-bold px-3 py-2 text-xs tracking-wider hover:bg-[#252525] transition-colors whitespace-nowrap group h-10"
        >
          <div className="relative flex items-center">
            <FileSpreadsheet size={14} className="text-gold" />
            <ArrowUp size={8} className="text-white absolute -right-1 -bottom-1 bg-luxury-gray rounded-full group-hover:-translate-y-0.5 transition-transform" />
          </div>
          Exportar
        </button>
        <button
          onClick={() => setIsReconciliarModalOpen(true)}
          className="flex items-center gap-1.5 bg-luxury-gray text-white border border-luxury-gray-mid font-bold px-3 py-2 text-xs tracking-wider hover:bg-[#252525] transition-colors whitespace-nowrap h-10"
        >
          <RefreshCw size={14} className="text-gold shrink-0" />
          Actualizar precios
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3 items-start sm:items-center flex-wrap">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, marca o tags..."
          className="bg-luxury-black border border-luxury-gray-mid text-white placeholder-[#555555] px-3 py-2 focus:outline-none focus:border-gold transition-colors text-sm w-full sm:w-64 h-10"
        />
        <div className="w-full sm:w-52 shrink-0">
          <CustomSelect
            compact
            value={categoriaFiltrada}
            onChange={(val) => { setCategoriaFiltrada(val); setSubcategoriaFiltrada(""); }}
              options={[
                { value: "", label: "Ver Todo" },
                ...categoriaFilterOptions(categoriasDb),
              ]}
            placeholder="Categoría"
          />
        </div>
        {subcategoriasParaCategoria.length > 0 && (
          <div className="w-full sm:w-52 shrink-0">
            <CustomSelect
              compact
              value={subcategoriaFiltrada}
              onChange={(val) => setSubcategoriaFiltrada(val)}
              options={[
                { value: "", label: "Todas" },
                  ...subcategoriaSelectOptions(subcategoriasParaCategoria),
              ]}
              placeholder="Subcategoría"
            />
          </div>
        )}
        <div className="w-full sm:w-56 shrink-0">
          <CustomSelect
            compact
            value={proveedorFiltrado}
            onChange={setProveedorFiltrado}
            options={[
              { value: "", label: "Todos los proveedores" },
              ...proveedoresDb.map(p => ({ value: p.id, label: p.nombre })),
            ]}
            placeholder="Proveedor"
          />
        </div>
        <button
          onClick={() => setSoloPendientes((prev) => !prev)}
          className={`h-10 px-3 text-[11px] font-bold uppercase tracking-wider border transition-colors whitespace-nowrap ${
            soloPendientes
              ? "bg-amber-500/15 text-amber-500 border-amber-500/40"
              : "bg-luxury-black text-luxury-gray-light border-luxury-gray-mid hover:border-amber-500/40 hover:text-amber-500"
          }`}
        >
          Solo pendientes
        </button>
        <Link
          href="/dashboard/nuevo"
          className="flex items-center gap-1.5 bg-gold text-black font-bold px-3 py-2 text-xs tracking-wider hover:bg-gold-light transition-colors whitespace-nowrap h-10 sm:ml-auto"
        >
          <Plus size={14} />
          Nuevo
        </Link>
      </div>

      {/* Tabla */}
      <div className="bg-luxury-black border border-luxury-gray overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-luxury-gray bg-black/30">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === productosFiltrados.length && productosFiltrados.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-luxury-gray-mid bg-black text-gold focus:ring-gold"
                  />
                </th>
                <th 
                  className="text-left text-[#555555] text-xs tracking-widest uppercase px-4 py-3 cursor-pointer hover:text-white transition-colors group"
                  onClick={() => handleSort("nombre")}
                >
                  <div className="flex items-center gap-2">
                    Producto
                    <span className={`transition-all ${sortConfig?.key === "nombre" ? "opacity-100 text-gold" : "opacity-30 text-white"}`}>
                      {sortConfig?.key === "nombre" && sortConfig.direction === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                    </span>
                  </div>
                </th>
                <th 
                  className="text-left text-[#555555] text-xs tracking-widest uppercase px-4 py-3 hidden lg:table-cell cursor-pointer hover:text-white transition-colors group"
                  onClick={() => handleSort("categoria")}
                >
                  <div className="flex items-center gap-2">
                    Categoría
                    <span className={`transition-all ${sortConfig?.key === "categoria" ? "opacity-100 text-gold" : "opacity-30 text-white"}`}>
                      {sortConfig?.key === "categoria" && sortConfig.direction === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                    </span>
                  </div>
                </th>
                <th 
                  className="text-left text-[#555555] text-xs tracking-widest uppercase px-4 py-3 hidden lg:table-cell cursor-pointer hover:text-white transition-colors group"
                  onClick={() => handleSort("subcategoria")}
                >
                  <div className="flex items-center gap-2">
                    Subcategoría
                    <span className={`transition-all ${sortConfig?.key === "subcategoria" ? "opacity-100 text-gold" : "opacity-30 text-white"}`}>
                      {sortConfig?.key === "subcategoria" && sortConfig.direction === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                    </span>
                  </div>
                </th>
                <th
                  className="text-center text-[#555555] text-xs tracking-widest uppercase px-4 py-3 cursor-pointer hover:text-white transition-colors group"
                  onClick={() => handleSort("precio_costo")}
                >
                  <div className="flex items-center justify-center gap-2">
                    Costo
                    <span className={`transition-all ${sortConfig?.key === "precio_costo" ? "opacity-100 text-gold" : "opacity-30 text-white"}`}>
                      {sortConfig?.key === "precio_costo" && sortConfig.direction === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                    </span>
                  </div>
                </th>
                <th
                  className="text-center text-[#555555] text-xs tracking-widest uppercase px-4 py-3 cursor-pointer hover:text-white transition-colors group"
                  onClick={() => handleSort("precio_venta")}
                >
                  <div className="flex items-center justify-center gap-2">
                    Venta
                    <span className={`transition-all ${sortConfig?.key === "precio_venta" ? "opacity-100 text-gold" : "opacity-30 text-white"}`}>
                      {sortConfig?.key === "precio_venta" && sortConfig.direction === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                    </span>
                  </div>
                </th>
                <th className="text-center text-[#555555] text-xs tracking-widest uppercase px-4 py-3 hidden md:table-cell">Proveedor</th>
                <th 
                  className="text-center text-[#555555] text-xs tracking-widest uppercase px-4 py-3 cursor-pointer hover:text-white transition-colors group"
                  onClick={() => handleSort("activo")}
                >
                  <div className="flex items-center justify-center gap-2">
                    Estado
                    <span className={`transition-all ${sortConfig?.key === "activo" ? "opacity-100 text-gold" : "opacity-30 text-white"}`}>
                      {sortConfig?.key === "activo" && sortConfig.direction === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                    </span>
                  </div>
                </th>
                <th className="text-center text-[#555555] text-xs tracking-widest uppercase px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111111]">
              {productosFiltrados.map((producto) => {
                return (
                  <tr
                    key={producto.id}
                    className={`hover:bg-[#111111] transition-colors ${!producto.activo ? "opacity-50" : ""} ${selectedIds.has(producto.id) ? "bg-gold/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(producto.id)}
                        onChange={() => toggleSelect(producto.id)}
                        className="w-4 h-4 rounded border-luxury-gray-mid bg-black text-gold focus:ring-gold"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={producto.imagen_url}
                          alt={producto.nombre}
                          width={32}
                          height={32}
                          className="w-8 h-8 object-cover shrink-0 hidden sm:block"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium line-clamp-1">{producto.nombre}</p>
                            {producto.pendiente_completar && (
                              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                Pendiente
                              </span>
                            )}
                          </div>
                          <p className="text-[#555555] text-xs">{producto.marca}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-luxury-gray-light text-xs hidden lg:table-cell">
                      {producto.categoria || "Fragancias"}
                    </td>
                    <td className="px-4 py-3 text-luxury-gray-light text-xs hidden lg:table-cell">
                      {producto.subcategorias?.nombre ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-luxury-gray-light">
                      {producto.precio_costo ? `${producto.moneda === 'USD' ? 'US$' : '$'} ${producto.precio_costo.toLocaleString("es-AR")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gold font-semibold">
                      {producto.moneda === 'USD' ? 'US$' : '$'} {producto.precio_venta.toLocaleString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className="text-xs text-luxury-gray-light">
                        {producto.proveedores?.nombre ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActivo(producto.id, producto.activo)}
                        disabled={loading === producto.id}
                        className={`text-xs px-3 py-1 font-bold transition-colors ${
                          producto.activo
                            ? "bg-green-500 text-black hover:bg-green-600"
                            : "bg-red-500 text-white hover:bg-red-600"
                        }`}
                      >
                        {producto.activo ? "Activo" : "Oculto"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/productos/${producto.slug}`} target="_blank"
                          className="text-[#555555] hover:text-gold transition-colors" title="Ver en tienda">
                          <Eye size={14} />
                        </Link>
                        <Link href={`/dashboard/editar/${producto.id}`}
                          className="text-[#555555] hover:text-gold transition-colors" title="Editar">
                          <Edit2 size={14} />
                        </Link>
                        <button
                          onClick={() => confirmarEliminar(producto.id, producto.nombre)}
                          disabled={loading === producto.id}
                          className="text-[#555555] hover:text-red-400 transition-colors" title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {productosFiltrados.length === 0 && (
            <div className="text-center py-12 text-[#555555]">
              <Package size={32} className="mx-auto mb-3 opacity-30" />
              <p>No hay productos que mostrar.</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-[#333333] text-xs mt-4 text-center">
        {productosFiltrados.length} de {productos.length} productos
      </p>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] bg-luxury-gray border border-gold/30 shadow-2xl px-6 py-4 flex items-center gap-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-sm">{selectedIds.size} seleccionados</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-gold text-[10px] uppercase tracking-wider hover:underline"
            >
              Desmarcar todos
            </button>
          </div>
          <div className="h-8 w-px bg-luxury-gray-mid" />
          <button
            type="button"
            onClick={() => setBulkActionsModal(true)}
            disabled={bulkLoading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gold text-black hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            <LayoutGrid size={14} />
            Acciones masivas
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[#555555] hover:text-white transition-colors p-1"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <BulkActionsModal
        isOpen={bulkActionsModal}
        onClose={() => setBulkActionsModal(false)}
        onDismiss={() => {
          setBulkActionsModal(false);
          setSelectedIds(new Set());
        }}
        selectedCount={selectedIds.size}
        categorias={categoriasDb}
        subcategorias={subcategoriasDb}
        proveedores={proveedoresDb}
        marcas={marcasBulk}
        bulkLoading={bulkLoading}
        selectedProducts={productos
          .filter((p) => selectedIds.has(p.id))
          .map((p) => ({
            id: p.id,
            nombre: p.nombre,
            marca: p.marca,
            descripcion: p.descripcion,
            descripcion_corta: p.descripcion_corta,
            descrip_provee: p.descrip_provee,
          }))}
        onExport={() => downloadExcel()}
        onShow={() => bulkToggleActivo(true)}
        onHide={() => bulkToggleActivo(false)}
        onUpdateProveedor={bulkUpdateProveedor}
        onUpdateMarca={bulkUpdateMarca}
        onUpdateCategoriaSubcategoria={bulkUpdateCategoriaSubcategoria}
        onCreateCategoria={createCategoriaBulk}
        onCreateSubcategoria={createSubcategoriaBulk}
        onOpenPrecio={() => setPrecioModal({ open: true, venta: 0, costo: 0 })}
        onOpenImagenes={() => setBulkImagenesModal(true)}
        onBulkRename={bulkRenameText}
        onUpdateMoneda={bulkUpdateMoneda}
        onSetDestacado={bulkToggleDestacado}
        onDelete={() => setBulkDeleteModal(true)}
      />

      {/* Modal eliminación unitaria */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-luxury-gray-mid w-full max-w-md p-6 md:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle size={24} />
              <h2 className="font-serif text-xl text-white">Confirmar eliminación</h2>
            </div>
            <p className="text-luxury-gray-light text-sm mb-6 leading-relaxed">
              ¿Estás seguro que deseas eliminar{" "}
              <strong className="text-gold">{deleteModal.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, id: "", nombre: "" })}
                className="flex-1 px-4 py-2.5 text-sm text-luxury-gray-light hover:text-white border border-luxury-gray-mid hover:bg-luxury-gray transition-colors"
                disabled={loading === deleteModal.id}
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarEliminar}
                disabled={loading === deleteModal.id}
                className="flex-1 px-4 py-2.5 text-sm text-white bg-red-600/90 hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
              >
                {loading === deleteModal.id ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminación masiva */}
      {bulkDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-luxury-gray-mid w-full max-w-md p-6 md:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle size={24} />
              <h2 className="font-serif text-xl text-white">Eliminación Masiva</h2>
            </div>
            <p className="text-luxury-gray-light text-sm mb-6 leading-relaxed">
              ¿Estás seguro que deseas eliminar <strong className="text-white">{selectedIds.size} productos</strong> seleccionados? Esta acción es permanente y afectará a todo el catálogo.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBulkDeleteModal(false)}
                className="flex-1 px-4 py-2.5 text-sm text-luxury-gray-light hover:text-white border border-luxury-gray-mid hover:bg-luxury-gray transition-colors"
                disabled={bulkLoading}
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarEliminarBulk}
                disabled={bulkLoading}
                className="flex-1 px-4 py-2.5 text-sm text-white bg-red-600/90 hover:bg-red-500 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {bulkLoading ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Eliminar {selectedIds.size} {selectedIds.size === 1 ? 'producto' : 'productos'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Actualización Masiva de Precios */}
      {precioModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-luxury-gray-mid w-full max-w-sm p-6 md:p-8">
            <h2 className="font-serif text-xl text-white mb-1">Actualizar precios</h2>
            <p className="text-[#555555] text-xs mb-6">
              {selectedIds.size} producto{selectedIds.size !== 1 ? "s" : ""} seleccionado{selectedIds.size !== 1 ? "s" : ""}. Dejá en blanco el campo que no querés modificar.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-luxury-gray-light text-xs uppercase tracking-widest mb-1.5">Precio de Venta</label>
                <CurrencyInput
                  value={precioModal.venta}
                  onChange={(value) => setPrecioModal(prev => ({ ...prev, venta: value }))}
                  placeholder="Precio nuevo..."
                  inputClassName="bg-[#111]"
                />
              </div>
              <div>
                <label className="block text-luxury-gray-light text-xs uppercase tracking-widest mb-1.5">Precio de Costo</label>
                <CurrencyInput
                  value={precioModal.costo}
                  onChange={(value) => setPrecioModal(prev => ({ ...prev, costo: value }))}
                  placeholder="Precio nuevo..."
                  inputClassName="bg-[#111]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPrecioModal({ open: false, venta: 0, costo: 0 })}
                className="flex-1 px-4 py-2.5 text-sm text-luxury-gray-light hover:text-white border border-luxury-gray-mid hover:bg-luxury-gray transition-colors"
                disabled={bulkLoading}
              >
                Cancelar
              </button>
              <button
                onClick={bulkUpdatePrecios}
                disabled={bulkLoading || (precioModal.venta <= 0 && precioModal.costo <= 0)}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {bulkLoading ? <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : null}
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Imágenes Masivo */}
      {bulkImagenesModal && (
        <BulkImagenesModal
          productos={productos}
          selectedIds={selectedIds}
          onClose={() => setBulkImagenesModal(false)}
          onSaved={handleImagesSaved}
        />
      )}

      {/* Modal Importación Excel */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchProductos();
          router.refresh();
        }}
      />

      {/* Modal Reconciliación de precios del proveedor */}
      <ReconciliarPreciosModal
        isOpen={isReconciliarModalOpen}
        onClose={() => setIsReconciliarModalOpen(false)}
        onSuccess={() => {
          fetchProductos();
          router.refresh();
        }}
        proveedores={proveedoresDb}
      />
    </>
  );
}
