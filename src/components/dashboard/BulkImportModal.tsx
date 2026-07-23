"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { PRODUCTS_TABLE } from "@/lib/supabase/tables";
import { sanitizeProductPayload } from "@/lib/supabase/product-columns";
import { slugifyText, uniqueProductSlug } from "@/lib/product-slug";
import { Download, Upload, X, Check, AlertCircle, FileText } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  if (!isOpen) return null;

  const parseSiNo = (val: unknown, defaultVal = false) => {
    if (val === true || val === 1) return true;
    if (val === false || val === 0) return false;
    const s = String(val ?? "").trim().toUpperCase();
    if (s === "SI" || s === "SÍ" || s === "YES" || s === "TRUE" || s === "1") return true;
    if (s === "NO" || s === "FALSE" || s === "0") return false;
    return defaultVal;
  };

  type ImportRow = {
    nombre: string;
    marca: string;
    descripcion: string;
    descrip_provee: string;
    proveedor: string;
    precio_costo: unknown;
    precio_venta: unknown;
    stock: unknown;
    categoria: string;
    subcategoria: string;
    destacado: unknown;
    nuevo: unknown;
    activo: unknown;
    imagen_url: string;
  };

  function cell(raw: Record<string, unknown>, ...keys: string[]): string {
    for (const key of keys) {
      const val = raw[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val).trim();
      }
    }
    const lowerKeys = keys.map((k) => k.toLowerCase());
    for (const [key, val] of Object.entries(raw)) {
      if (lowerKeys.includes(key.toLowerCase().trim())) {
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return String(val).trim();
        }
      }
    }
    return "";
  }

  function normalizeImportRow(raw: Record<string, unknown>): ImportRow {
    return {
      nombre: cell(raw, "nombre", "Nombre", "producto", "Producto"),
      marca: cell(raw, "marca", "Marca", "brand", "Brand") || "Sin marca",
      descripcion: cell(raw, "descripcion", "Descripcion", "Descripción"),
      descrip_provee: cell(raw, "descrip_provee", "descrip provee", "original_name"),
      proveedor: cell(raw, "proveedor", "Proveedor"),
      precio_costo: raw.precio_costo ?? raw.costo ?? raw["Precio costo"],
      precio_venta: raw.precio_venta ?? raw.precio ?? raw["Precio venta"],
      stock: raw.stock ?? raw.Stock,
      categoria: cell(raw, "categoria", "Categoria", "Categoría"),
      subcategoria: cell(raw, "subcategoria", "Subcategoria", "Subcategoría"),
      destacado: raw.destacado ?? raw.Destacado,
      nuevo: raw.nuevo ?? raw.Nuevo,
      activo: raw.activo ?? raw.Activo,
      imagen_url: cell(raw, "imagen_url", "imagen", "Imagen", "imagenes", "portada"),
    };
  }

  const downloadTemplate = () => {
    const templateData = [
      {
        nombre: "Ejemplo Producto",
        marca: "Marca Ejemplo",
        descripcion: "Descripción larga del producto...",
        descrip_provee: "Nombre tal como figura en la lista del proveedor",
        proveedor: "Gcgroup",
        precio_costo: 5000,
        precio_venta: 8500,
        stock: 10,
        categoria: "General",
        subcategoria: "Femeninos",
        destacado: "NO",
        nuevo: "SI",
        activo: "SI",
        imagen_url: "https://ejemplo.com/foto-producto.webp",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla_productos.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);
        
        if (rawData.length === 0) {
          setError("El archivo está vacío.");
          return;
        }
        
        setData(rawData);
      } catch (err) {
        setError("Error al leer el archivo Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  async function mirrorImageToStorage(sourceUrl: string, slug: string): Promise<string | null> {
    const res = await fetch("/api/import-product-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: sourceUrl, slug }),
    });
    const json = (await res.json()) as { publicUrl?: string; error?: string };
    if (!res.ok) {
      console.warn(`Imagen no importada (${slug}):`, json.error);
      return null;
    }
    return json.publicUrl ?? null;
  }

  const processImport = async () => {
    if (data.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const rows = data
        .map((item) => normalizeImportRow(item as Record<string, unknown>))
        .filter((row) => row.nombre);

      if (rows.length === 0) {
        setError("No hay filas válidas: cada producto necesita al menos un nombre.");
        setLoading(false);
        return;
      }

      const skippedEmpty = data.length - rows.length;
      const defaultMarcaCount = rows.filter((r) => r.marca === "Sin marca").length;

      // 1. Obtener categorías, proveedores y slugs existentes
      const [{ data: categoriasDb }, { data: subcategoriasDb }, { data: proveedoresDb }, { data: existingSlugs }] = await Promise.all([
        supabase.from("categorias").select("id, nombre"),
        supabase.from("subcategorias").select("id, nombre, categoria_id"),
        supabase.from("proveedores").select("id, nombre"),
        supabase.from(PRODUCTS_TABLE).select("slug"),
      ]);

      const categoriaMap = new Map(categoriasDb?.map((c) => [c.nombre.toLowerCase(), c.id]));
      const categoriaIdToName = new Map(categoriasDb?.map((c) => [c.id, c.nombre.toLowerCase()]) || []);

      const subcategoriaByCatAndName = new Map<string, { id: string; categoria_id: string }>();
      const subcategoriaByName = new Map<string, { id: string; categoria_id: string }>();
      for (const sub of subcategoriasDb ?? []) {
        const catName = categoriaIdToName.get(sub.categoria_id) ?? "";
        subcategoriaByCatAndName.set(`${catName}|${sub.nombre.toLowerCase()}`, {
          id: sub.id,
          categoria_id: sub.categoria_id,
        });
        if (!subcategoriaByName.has(sub.nombre.toLowerCase())) {
          subcategoriaByName.set(sub.nombre.toLowerCase(), {
            id: sub.id,
            categoria_id: sub.categoria_id,
          });
        }
      }

      function resolveCategoriaSubcategoria(categoriaRaw: string, subcategoriaRaw: string) {
        const catNombre = categoriaRaw.trim().toLowerCase();
        const subNombre = subcategoriaRaw.trim().toLowerCase();
        let categoriaId = catNombre ? categoriaMap.get(catNombre) || null : null;
        let subcategoriaId: string | null = null;

        if (subNombre) {
          const scopedKey = catNombre ? `${catNombre}|${subNombre}` : "";
          const match =
            (scopedKey && subcategoriaByCatAndName.get(scopedKey)) ||
            subcategoriaByName.get(subNombre) ||
            null;
          if (match) {
            subcategoriaId = match.id;
            categoriaId = match.categoria_id;
          }
        }

        return { categoriaId, subcategoriaId };
      }

      const proveedorMap = new Map(proveedoresDb?.map(p => [p.nombre.toLowerCase().trim(), p.id]));

      // Set de slugs ya usados (DB + los que vamos generando en este lote)
      const usedSlugs = new Set<string>((existingSlugs ?? []).map(r => r.slug));

      // 2. Preparar filas y subir portadas al bucket
      type ImportDraft = {
        item: ImportRow;
        slug: string;
        sourceImage: string;
        storedImage: string | null;
      };

      const drafts: ImportDraft[] = rows.map((item) => ({
        item,
        slug: uniqueProductSlug(
          item.nombre,
          item.marca,
          usedSlugs,
          item.proveedor ? slugifyText(item.proveedor) : null
        ),
        sourceImage: item.imagen_url,
        storedImage: null,
      }));

      let imageFailures = 0;
      const imageConcurrency = 4;
      for (let i = 0; i < drafts.length; i += imageConcurrency) {
        const chunk = drafts.slice(i, i + imageConcurrency);
        await Promise.all(
          chunk.map(async (draft) => {
            if (!draft.sourceImage) return;
            draft.storedImage = await mirrorImageToStorage(draft.sourceImage, draft.slug);
            if (!draft.storedImage) imageFailures += 1;
          })
        );
      }

      const productosToInsert = await Promise.all(
        drafts.map(async ({ item, slug, storedImage }) => {
          const provNombre = item.proveedor.toLowerCase();
          const { categoriaId, subcategoriaId } = resolveCategoriaSubcategoria(
            item.categoria,
            item.subcategoria
          );
          const proveedorId = provNombre ? proveedorMap.get(provNombre) || null : null;

          return sanitizeProductPayload(supabase, {
            nombre: item.nombre,
            marca: item.marca,
            slug,
            descripcion: item.descripcion || "",
            descrip_provee: item.descrip_provee || null,
            proveedor_id: proveedorId,
            precio_costo: Number(item.precio_costo) || 0,
            precio_venta: Number(item.precio_venta) || 0,
            stock: Number(item.stock) || 0,
            imagen_url: storedImage,
            categoria_id: categoriaId,
            subcategoria_id: subcategoriaId,
            activo: parseSiNo(item.activo, true),
            destacado: parseSiNo(item.destacado, false),
            nuevo: parseSiNo(item.nuevo, false),
          });
        })
      );

      // 3. Insertar en lotes de 20 para seguridad
      const batchSize = 20;
      for (let i = 0; i < productosToInsert.length; i += batchSize) {
        const batch = productosToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase.from(PRODUCTS_TABLE).insert(batch);
        if (insertError) throw insertError;
      }

      toast.success(`Se importaron ${productosToInsert.length} productos correctamente.`);
      if (skippedEmpty > 0) {
        toast(`${skippedEmpty} fila${skippedEmpty !== 1 ? "s" : ""} vacía${skippedEmpty !== 1 ? "s" : ""} omitida${skippedEmpty !== 1 ? "s" : ""}.`, { icon: "ℹ️" });
      }
      if (defaultMarcaCount > 0) {
        toast(
          `${defaultMarcaCount} producto${defaultMarcaCount !== 1 ? "s" : ""} sin marca en el Excel — se guardó "Sin marca".`,
          { icon: "ℹ️" }
        );
      }
      if (imageFailures > 0) {
        toast.error(
          `${imageFailures} imagen${imageFailures !== 1 ? "es" : ""} no se pudieron subir al bucket (producto importado sin portada).`
        );
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error detallado:", err);
      setError(err.message || "Error al importar productos.");
      toast.error("Hubo un error al realizar la importación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border border-luxury-gray-mid w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-luxury-gray flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Upload className="text-gold" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-serif text-white">Importar Catálogo</h2>
              <p className="text-luxury-gray-light text-xs">Carga masiva de productos desde Excel</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#555555] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Download Template */}
          <div className="bg-luxury-black border border-luxury-gray p-4 rounded-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="text-luxury-gray-light" size={24} />
              <div>
                <p className="text-white text-sm font-medium">1. Descargar Plantilla</p>
                <p className="text-[#555555] text-xs">Usá nuestro formato oficial para evitar errores</p>
                <p className="text-[#444444] text-[10px] mt-1">
                  imagen_url: URL pública; se descarga y guarda en Storage como portada
                </p>
              </div>
            </div>
            <button 
              onClick={downloadTemplate}
              className="flex items-center gap-2 bg-luxury-gray hover:bg-[#252525] text-white text-xs px-4 py-2 rounded border border-luxury-gray-mid transition-colors"
            >
              <Download size={14} /> Descargar .xlsx
            </button>
          </div>

          {/* Step 2: Upload File */}
          <div className="space-y-4">
            <p className="text-white text-sm font-medium">2. Subir Archivo Excel</p>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                file ? "border-green-500/50 bg-green-500/5" : "border-luxury-gray-mid hover:border-gold/50 hover:bg-gold/5"
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls" 
                className="hidden" 
              />
              {file ? (
                <div className="space-y-2">
                  <Check className="mx-auto text-green-500" size={32} />
                  <p className="text-white text-sm font-medium">{file.name}</p>
                  <p className="text-green-500/70 text-xs">{data.length} productos detectados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto text-[#555555]" size={32} />
                  <p className="text-luxury-gray-light text-sm">Arrastrá el archivo aquí o hacé clic para buscar</p>
                  <p className="text-[#333333] text-xs">Formatos compatibles: .xlsx, .xls</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded flex items-center gap-3 text-red-500 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Preview Table */}
          {data.length > 0 && (
            <div className="space-y-3">
              <p className="text-white text-sm font-medium">Vista Previa (Primeros 5 items)</p>
              <div className="border border-luxury-gray rounded-lg overflow-hidden">
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-black/50 text-[#555555] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Marca</th>
                      <th className="px-3 py-2">Categoría</th>
                      <th className="px-3 py-2">Subcategoría</th>
                      <th className="px-3 py-2">Proveedor</th>
                      <th className="px-3 py-2">Descrip. provee</th>
                      <th className="px-3 py-2">Portada</th>
                      <th className="px-3 py-2 text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury-gray">
                    {data.slice(0, 5).map((item, i) => (
                      <tr key={i} className="text-luxury-gray-light">
                        <td className="px-3 py-2 text-white">{item.nombre}</td>
                        <td className="px-3 py-2">{item.marca}</td>
                        <td className="px-3 py-2">{item.categoria || "—"}</td>
                        <td className="px-3 py-2">{item.subcategoria || "—"}</td>
                        <td className="px-3 py-2 text-gold">{item.proveedor || "—"}</td>
                        <td className="px-3 py-2 max-w-[120px] truncate" title={item.descrip_provee}>
                          {item.descrip_provee || "—"}
                        </td>
                        <td className="px-3 py-2 max-w-[80px] truncate text-[#888]" title={item.imagen_url || item.imagen}>
                          {item.imagen_url || item.imagen ? "Sí" : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">${item.precio_venta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-luxury-gray flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm text-luxury-gray-light hover:text-white border border-luxury-gray-mid transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            onClick={processImport}
            disabled={loading || data.length === 0}
            className="flex-1 bg-gold disabled:bg-gray-800 disabled:text-gray-500 text-black font-bold px-4 py-2.5 text-sm tracking-wider transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Importar ahora
          </button>
        </div>
      </div>
    </div>
  );
}
