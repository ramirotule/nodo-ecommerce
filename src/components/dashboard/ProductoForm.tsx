"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Producto } from "@/types";
import CustomSelect from "@/components/ui/CustomSelect";
import { PRODUCTS_TABLE, PRODUCTS_STORAGE_BUCKET } from "@/lib/supabase/tables";
import { sanitizeProductPayload } from "@/lib/supabase/product-columns";
import { resolveProductSlug, slugifyText } from "@/lib/product-slug";
import {
  categoriaSelectOptions,
  subcategoriaSelectOptions,
} from "@/lib/catalog-select-options";
import { calcPrecioVentaFromCosto } from "@/lib/price-utils";
import CurrencyInput from "@/components/ui/CurrencyInput";

import {
  Plus,
  Trash2,
  Star,
  ImagePlus,
  Loader2,
  X,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  GripVertical
} from "lucide-react";
import ProductImage from "@/components/ui/ProductImage";

interface Props {
  producto?: Partial<Producto>;
  isEdit?: boolean;
}


const supabase = createClient();

function proveedorSlugKey(
  proveedorId: string | undefined,
  proveedores: { id: string; nombre: string }[]
): string | null {
  if (!proveedorId) return null;
  const nombre = proveedores.find((p) => p.id === proveedorId)?.nombre;
  return nombre ? slugifyText(nombre) : null;
}

export default function ProductoForm({ producto = {}, isEdit = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [categoriasDb, setCategoriasDb] = useState<{id: string, nombre: string, activo?: boolean}[]>([]);
  const [subcategoriasDb, setSubcategoriasDb] = useState<{id: string, nombre: string, activo?: boolean}[]>([]);
  const [proveedoresDb, setProveedoresDb] = useState<{id: string, nombre: string}[]>([]);
  const [marcasDb, setMarcasDb] = useState<{id: string, nombre: string}[]>([]);
  const [loadingSubcategorias, setLoadingSubcategorias] = useState(false);

  const [form, setForm] = useState({
    nombre: producto.nombre || "",
    marca: producto.marca || "",
    descripcion: producto.descripcion || "",
    descrip_provee: producto.descrip_provee || "",
    tags: producto.tags || [] as string[],
    descripcion_corta: producto.descripcion_corta || "",
    precio_costo: producto.precio_costo ?? 0,
    precio_venta: producto.precio_venta ?? 0,
    stock: producto.stock != null ? String(producto.stock) : "1",
    imagen_url: producto.imagen_url || "",
    imagenes_adicionales: producto.imagenes_adicionales || [],
    categoria_id: producto.categoria_id?.toString() || "",
    categoria_nombre: producto.categoria || "",
    subcategoria_id: producto.subcategoria_id?.toString() || "",
    moneda: (producto.moneda as 'ARS' | 'USD') || 'ARS',
    proveedor_id: producto.proveedor_id?.toString() || "",
    activo: producto.activo !== undefined ? producto.activo : true,
    destacado: producto.destacado || false,
    nuevo: producto.nuevo || false,
    pedido: producto.pedido || false,
    meta_titulo: producto.meta_titulo || "",
    meta_descripcion: producto.meta_descripcion || "",
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isDeleteImagesModalOpen, setIsDeleteImagesModalOpen] = useState(false);
  const dragImageIndex = useRef<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || form.tags.includes(tag)) return;
    setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
  }

  function removeTag(tag: string) {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
      setTagInput("");
    } else if (e.key === "Backspace" && tagInput === "" && form.tags.length > 0) {
      removeTag(form.tags[form.tags.length - 1]);
    }
  }

  async function createCategoriaFromSearch(nombre: string) {
    const trimmed = nombre.trim();
    if (!trimmed) return null;

    const existing = categoriasDb.find(
      (c) => c.nombre.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;

    const { data, error } = await supabase
      .from("categorias")
      .insert({ nombre: trimmed, slug: slugifyText(trimmed), orden: categoriasDb.length + 1 })
      .select("id, nombre, activo")
      .single();

    if (error || !data) {
      setError(error?.message || "No se pudo crear la categoría.");
      return null;
    }

    setCategoriasDb((prev) => [...prev, data]);
    setForm((prev) => ({
      ...prev,
      categoria_id: data.id,
      categoria_nombre: data.nombre,
      subcategoria_id: "",
    }));
    return data;
  }

  async function createSubcategoriaFromSearch(nombre: string) {
    const trimmed = nombre.trim();
    if (!trimmed || !form.categoria_id) return null;

    const existing = subcategoriasDb.find(
      (s) => s.nombre.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      setForm((prev) => ({ ...prev, subcategoria_id: existing.id }));
      return existing;
    }

    const { data, error } = await supabase
      .from("subcategorias")
      .insert({
        nombre: trimmed,
        slug: slugifyText(trimmed),
        orden: subcategoriasDb.length + 1,
        categoria_id: form.categoria_id,
        activo: true,
      })
      .select("id, nombre")
      .single();

    if (error || !data) {
      setError(error?.message || "No se pudo crear la subcategoría.");
      return null;
    }

    setSubcategoriasDb((prev) => [...prev, data]);
    setForm((prev) => ({ ...prev, subcategoria_id: data.id }));
    return data;
  }

  useEffect(() => {
    async function fetchCategorias() {
      const { data, error } = await supabase.from("categorias").select("id, nombre, activo").order("nombre");
      
      if (error) {
        console.error("Error cargando categorías de la DB:", error);
      } else if (data) {
        setCategoriasDb(data);
        
        // Sincronizar el nombre de la categoría si tenemos el ID (caso edición)
        if (form.categoria_id) {
          const found = data.find(c => c.id.toString() === form.categoria_id.toString());
          if (found) {
            setForm(prev => ({ ...prev, categoria_nombre: found.nombre }));
          }
        } else if (producto.categoria) {
          // Fallback si vino el nombre pero no el ID
          const found = data.find(c => c.nombre.toLowerCase() === producto.categoria?.toLowerCase());
          if (found) {
            setForm(prev => ({ ...prev, categoria_id: found.id, categoria_nombre: found.nombre }));
          }
        }
      }
    }

    fetchCategorias();
  }, [producto.id, form.categoria_id]);

  useEffect(() => {
    if (!form.categoria_id) {
      setSubcategoriasDb([]);
      return;
    }
    async function fetchSubcategorias() {
      setLoadingSubcategorias(true);
      const { data, error } = await supabase
        .from("subcategorias")
        .select("id, nombre, activo")
        .eq("categoria_id", form.categoria_id)
        .order("nombre");
      if (error) {
        console.error("Error cargando subcategorías:", error);
      } else {
        setSubcategoriasDb(data || []);
      }
      setLoadingSubcategorias(false);
    }
    fetchSubcategorias();
  }, [form.categoria_id]);

  useEffect(() => {
    async function fetchMarcas() {
      const { data } = await supabase
        .from("marcas")
        .select("id, nombre, activo")
        .eq("activo", true)
        .order("nombre");
      setMarcasDb(data || []);
    }
    fetchMarcas();
  }, []);

  useEffect(() => {
    async function fetchProveedores() {
      const { data } = await supabase
        .from('proveedores')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')
      setProveedoresDb(data || [])
    }
    fetchProveedores()
  }, [])

  function update(key: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCostoChange(value: number) {
    setForm((prev) => ({
      ...prev,
      precio_costo: value,
      precio_venta: value > 0 ? calcPrecioVentaFromCosto(value) : prev.precio_venta,
    }));
  }

  function reorderImages(from: number, to: number) {
    setForm((prev) => {
      const current = Array.from(new Set([prev.imagen_url, ...prev.imagenes_adicionales])).filter(Boolean) as string[];
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const [nuevoPrincipal, ...nuevasAdicionales] = next;
      return {
        ...prev,
        imagen_url: nuevoPrincipal ?? "",
        imagenes_adicionales: nuevasAdicionales,
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const nombreTrimmed = form.nombre.trim();
    const marcaTrimmed = form.marca.trim();
    if (!marcaTrimmed) {
      setError("Seleccioná una marca.");
      setLoading(false);
      return;
    }
    const costoParsed = form.precio_costo > 0 ? form.precio_costo : null;

    let slugQuery = supabase.from(PRODUCTS_TABLE).select("slug");
    if (isEdit && producto.id) {
      slugQuery = slugQuery.neq("id", producto.id);
    }
    const { data: slugRows } = await slugQuery;
    const usedSlugs = new Set(slugRows?.map((row) => row.slug) ?? []);

    const proveedorKey = proveedorSlugKey(form.proveedor_id, proveedoresDb);
    const currentProveedorKey = proveedorSlugKey(
      producto.proveedor_id?.toString(),
      proveedoresDb
    );

    const slug = resolveProductSlug({
      nombre: nombreTrimmed,
      marca: marcaTrimmed,
      proveedorKey,
      currentSlug: producto.slug,
      currentNombre: producto.nombre,
      currentMarca: producto.marca,
      currentProveedorKey,
      usedSlugs,
      isEdit,
    });

    const payload = await sanitizeProductPayload(supabase, {
      nombre: nombreTrimmed,
      marca: marcaTrimmed,
      slug,
      descripcion: form.descripcion.trim(),
      tags: form.tags,
      descripcion_corta: form.descripcion_corta.trim() || null,
      precio_costo: costoParsed,
      precio_venta:
        costoParsed && costoParsed > 0
          ? calcPrecioVentaFromCosto(costoParsed)
          : form.precio_venta,
      stock: parseInt(form.stock) || 0,
      imagen_url: form.imagen_url.trim() || null,
      categoria_id: form.categoria_id || null,
      subcategoria_id: form.subcategoria_id || null,
      moneda: form.moneda,
      proveedor_id: form.proveedor_id || null,
      activo: form.activo,
      destacado: form.destacado,
      nuevo: form.nuevo,
      pedido: form.pedido,
      meta_titulo: form.meta_titulo.trim() || null,
      meta_descripcion: form.meta_descripcion.trim() || null,
      imagenes_adicionales: form.imagenes_adicionales,
      descrip_provee: form.descrip_provee.trim() || null,
    });

    let result;
    if (isEdit && producto.id) {
      result = await supabase.from(PRODUCTS_TABLE).update(payload).eq("id", producto.id);
    } else {
      result = await supabase.from(PRODUCTS_TABLE).insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setSuccess(isEdit ? "Producto actualizado correctamente." : "Producto creado correctamente.");
    router.refresh();
    setTimeout(() => router.back(), 1500);
  }

  const precioInvalido =
    form.precio_costo > 0 &&
    form.precio_venta > 0 &&
    form.precio_venta <= form.precio_costo;

  const marcaOptions = [
    ...marcasDb.map((m) => ({ value: m.nombre, label: m.nombre })),
    ...(form.marca && !marcasDb.some((m) => m.nombre === form.marca)
      ? [{ value: form.marca, label: `${form.marca} (actual)` }]
      : []),
  ];

  const fieldClass =
    "w-full bg-luxury-gray border border-luxury-gray-mid text-white px-4 py-3 focus:outline-none focus:border-gold text-sm transition-colors";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-white">
          {isEdit ? "Editar Producto" : "Nuevo Producto"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos básicos */}
        <div className="bg-luxury-black border border-luxury-gray p-6 space-y-4">
          <h2 className="text-gold text-xs tracking-[0.2em] uppercase mb-4">
            Información del Producto
          </h2>

          <div className="mb-4">
            <CustomSelect
              label="Categoría *"
              value={form.categoria_id}
              onChange={(val) => {
                const name = categoriasDb.find(c => c.id === val)?.nombre || "";
                setForm(prev => ({ ...prev, categoria_id: val, categoria_nombre: name, subcategoria_id: "" }));
              }}
              options={categoriaSelectOptions(categoriasDb)}
              placeholder="Buscar o seleccionar categoría..."
              onCreateFromSearch={async (nombre) => {
                await createCategoriaFromSearch(nombre);
              }}
              createOptionLabel={(term) => `Agregar categoría "${term}"`}
            />
          </div>

          {form.categoria_id && (
            <div className="mb-6">
              <CustomSelect
                label="Subcategoría"
                value={form.subcategoria_id}
                loading={loadingSubcategorias}
                placeholder="Buscar o seleccionar subcategoría..."
                onChange={(val) => setForm(prev => ({ ...prev, subcategoria_id: val }))}
                options={subcategoriaSelectOptions(subcategoriasDb)}
                onCreateFromSearch={async (nombre) => {
                  await createSubcategoriaFromSearch(nombre);
                }}
                createOptionLabel={(term) => `Agregar subcategoría "${term}"`}
              />
            </div>
          )}

          {proveedoresDb.length > 0 && (
            <div className="mb-4">
              <CustomSelect
                label="Proveedor"
                value={form.proveedor_id}
                placeholder="Seleccionar proveedor..."
                onChange={(val) => setForm(prev => ({ ...prev, proveedor_id: val === "__none__" ? "" : val }))}
                options={[
                  { value: "__none__", label: "— Sin proveedor —" },
                  ...proveedoresDb.map((p) => ({ value: p.id, label: p.nombre })),
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
                Nombre *
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => update("nombre", e.target.value)}
                required
                className={fieldClass}
              />
            </div>
            <div>
              <CustomSelect
                label="Marca *"
                value={form.marca}
                onChange={(val) => update("marca", val)}
                placeholder="Seleccionar marca..."
                options={marcaOptions}
              />
            </div>
          </div>

          <div>
            <label className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
              Descrip_provee
            </label>
            <input
              type="text"
              value={form.descrip_provee}
              onChange={(e) => update("descrip_provee", e.target.value)}
              placeholder="Nombre tal como aparece en la lista del proveedor..."
              className={fieldClass}
            />
            <p className="text-[#555555] text-[10px] mt-1.5 italic">
              Se usa para emparejar este producto en la importación masiva de precios. No se muestra en la tienda.
            </p>
          </div>

          <div>
            <label className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
              Descripción
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => update("descripcion", e.target.value)}
              rows={4}
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div>
            <label className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
              Tags de búsqueda
            </label>
            <div className="w-full bg-luxury-gray border border-luxury-gray-mid px-3 py-2 flex flex-wrap gap-1.5 focus-within:border-gold transition-colors">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 bg-luxury-gray-mid text-white text-xs px-2 py-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-[#555555] hover:text-red-400 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { addTag(tagInput); setTagInput(""); }}
                placeholder={form.tags.length === 0 ? "Escribí un tag y presioná Enter..." : "Agregar otro..."}
                className="flex-1 min-w-[140px] bg-transparent text-white text-sm px-1 py-1 focus:outline-none placeholder-[#555555]"
              />
            </div>
            <p className="text-[#555555] text-[10px] mt-1.5 italic">
              Palabras clave para que el producto aparezca en más búsquedas (ej: &quot;gamer&quot;, &quot;oferta&quot;, &quot;liviano&quot;). Enter o coma para agregar.
            </p>
          </div>

          <div>
            <label className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
              Descripción Corta
            </label>
            <input
              type="text"
              value={form.descripcion_corta}
              onChange={(e) => update("descripcion_corta", e.target.value)}
              maxLength={500}
              className="w-full bg-luxury-gray border border-luxury-gray-mid text-white px-4 py-3 focus:outline-none focus:border-gold text-sm transition-colors"
            />
          </div>

        </div>

        {/* Gestión de Imágenes */}
        <div className="bg-luxury-black border border-luxury-gray p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gold text-xs tracking-[0.2em] uppercase">
              Galería de Imágenes
            </h2>
            <div className="flex items-center gap-3">
              {(() => {
                const allImageUrls = Array.from(new Set([form.imagen_url, ...form.imagenes_adicionales])).filter(Boolean) as string[];
                if (allImageUrls.length === 0) return null;
                const allSelected = selectedImages.length === allImageUrls.length;
                return (
                  <label className="flex items-center gap-2 text-luxury-gray-light text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelectedImages(allSelected ? [] : allImageUrls)}
                      className="w-4 h-4 rounded border-gold text-gold focus:ring-gold bg-black/50"
                    />
                    Seleccionar todas
                  </label>
                );
              })()}
              {selectedImages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsDeleteImagesModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={14} />
                  Eliminar ({selectedImages.length})
                </button>
              )}
              <label className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${uploading ? "bg-luxury-gray text-[#555555]" : "bg-gold text-black hover:bg-gold-light"}`}>
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {uploading ? "Subiendo..." : "Subir Imágenes"}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;

                    setUploading(true);
                    const newImages: string[] = [];

                    try {
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                        const filePath = `productos/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                          .from(PRODUCTS_STORAGE_BUCKET)
                          .upload(filePath, file);

                        if (uploadError) {
                          console.error("Error subiendo imagen:", uploadError);
                          continue;
                        }

                        const { data: { publicUrl } } = supabase.storage
                          .from(PRODUCTS_STORAGE_BUCKET)
                          .getPublicUrl(filePath);

                        newImages.push(publicUrl);
                      }

                      setForm(prev => {
                        let updatedPrincipal = prev.imagen_url;
                        let imagesToAdd = newImages;

                        if (!updatedPrincipal && newImages.length > 0) {
                          updatedPrincipal = newImages[0];
                          imagesToAdd = newImages.slice(1);
                        }

                        const updatedAdicionales = [...prev.imagenes_adicionales, ...imagesToAdd];
                        return {
                          ...prev,
                          imagenes_adicionales: updatedAdicionales,
                          imagen_url: updatedPrincipal
                        };
                      });
                    } finally {
                      setUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Grilla de Imágenes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {/* Todas las imágenes (adicionales + principal si no está en la lista) */}
            {Array.from(new Set([form.imagen_url, ...form.imagenes_adicionales])).filter(img => img).map((img, idx) => (
              <div
                key={img}
                draggable
                onDragStart={() => { dragImageIndex.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); setDragOverImageIndex(idx); }}
                onDrop={() => {
                  const from = dragImageIndex.current;
                  dragImageIndex.current = null;
                  setDragOverImageIndex(null);
                  if (from === null || from === idx) return;
                  reorderImages(from, idx);
                }}
                onDragEnd={() => { dragImageIndex.current = null; setDragOverImageIndex(null); }}
                className={`group relative aspect-square bg-luxury-gray border overflow-hidden rounded-sm transition-all cursor-grab active:cursor-grabbing ${
                  dragOverImageIndex === idx ? "border-gold" : selectedImages.includes(img) ? "border-red-500 ring-1 ring-red-500" : "border-luxury-gray-mid"
                }`}
              >
                <ProductImage
                  src={img}
                  alt={`Imagen ${idx}`}
                  fill
                  className="object-contain p-2 pointer-events-none"
                />

                {/* Manija de arrastre */}
                <div className="absolute bottom-2 right-2 z-10 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical size={14} />
                </div>

                {/* Checkbox de Selección */}
                <div className={`absolute top-2 right-2 z-10 transition-opacity ${selectedImages.includes(img) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  <input
                    type="checkbox"
                    checked={selectedImages.includes(img)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedImages(prev => [...prev, img]);
                      } else {
                        setSelectedImages(prev => prev.filter(i => i !== img));
                      }
                    }}
                    className="w-4 h-4 rounded border-gold text-gold focus:ring-gold bg-black/50"
                  />
                </div>

                {/* Overlay de Portada */}
                {form.imagen_url === img && (
                  <div className="absolute top-2 left-2 bg-gold text-black px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tighter rounded-sm z-10">
                    Portada
                  </div>
                )}

                {/* Acciones Hover */}
                {!selectedImages.includes(img) && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => update("imagen_url", img)}
                      className={`p-1.5 rounded-full transition-colors ${form.imagen_url === img ? "text-gold bg-white" : "text-white bg-white/10 hover:bg-white/20"}`}
                      title="Elegir como portada"
                    >
                      <Star size={14} fill={form.imagen_url === img ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => {
                          const isPrincipal = prev.imagen_url === img;
                          const filteredAdicionales = prev.imagenes_adicionales.filter(i => i !== img);
                          let nextPrincipal = prev.imagen_url;
                          
                          if (isPrincipal) {
                            nextPrincipal = filteredAdicionales.length > 0 ? filteredAdicionales[0] : "";
                          }
                          
                          return {
                            ...prev,
                            imagen_url: nextPrincipal,
                            imagenes_adicionales: filteredAdicionales
                          };
                        });
                      }}
                      className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors"
                      title="Eliminar imagen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Placeholder vacío si no hay imágenes */}
            {(!form.imagen_url && form.imagenes_adicionales.length === 0) && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed border-luxury-gray-mid text-[#333333]">
                <ImagePlus size={32} className="mb-2 opacity-20" />
                <p className="text-xs italic">No hay imágenes cargadas aún.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-luxury-gray">
            <p className="text-[#555555] text-[10px] leading-relaxed italic">
              * La imagen marcada con la estrella dorada será la que se muestre en el catálogo principal. <br/>
              * Podés subir múltiples imágenes a la vez. El sistema optimizará la carga.
            </p>
          </div>
        </div>

        {/* Precios */}
        <div className="bg-luxury-black border border-luxury-gray p-6 space-y-4">
          <h2 className="text-gold text-xs tracking-[0.2em] uppercase mb-4">
            Precios & Stock
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
                Moneda
              </label>
              <div className="flex gap-2">
                {(['ARS', 'USD'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update("moneda", m)}
                    className={`flex-1 py-3 text-sm font-bold tracking-wider border transition-colors ${
                      form.moneda === m
                        ? 'bg-gold border-gold text-black'
                        : 'bg-luxury-gray border-luxury-gray-mid text-luxury-gray-light hover:border-gold'
                    }`}
                  >
                    {m === 'ARS' ? '$ Pesos' : 'US$ Dólares'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
                Precio Costo
              </label>
              <CurrencyInput
                value={form.precio_costo}
                onChange={handleCostoChange}
                moneda={form.moneda}
              />
            </div>
            <div>
              <label className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
                Precio Venta *
              </label>
              <CurrencyInput
                value={form.precio_venta}
                onChange={(value) => update("precio_venta", value)}
                moneda={form.moneda}
                readOnly={form.precio_costo > 0}
                required
              />
              {form.precio_costo > 0 && (
                <p className="text-[#555555] text-[10px] mt-1.5 italic">
                  Calculado: (costo ÷ 0,87 + 30), redondeado al múltiplo de 5 superior.
                </p>
              )}
            </div>
            <div>
              <label className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
                Stock *
              </label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => update("stock", e.target.value)}
                required
                min="0"
                className="w-full bg-luxury-gray border border-luxury-gray-mid text-white px-4 py-3 focus:outline-none focus:border-gold text-sm transition-colors"
              />
            </div>
          </div>

          {precioInvalido && (
            <div className="text-sm px-4 py-2.5 border border-red-400/30 text-red-400 bg-red-400/5">
              El precio de venta es igual o menor al precio de costo — ¡Revisar precio!
            </div>
          )}
        </div>

        {/* Opciones */}
        <div className="bg-luxury-black border border-luxury-gray p-6">
          <h2 className="text-gold text-xs tracking-[0.2em] uppercase mb-4">
            Visibilidad
          </h2>
          <div className="flex flex-wrap gap-6">
            {[
              { key: "activo", label: "Activo (visible en tienda)" },
              { key: "destacado", label: "Destacado en Home" },
              { key: "nuevo", label: "Marcar como Nuevo" },
              { key: "pedido", label: "Se trae por pedido (48hs)" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key as keyof typeof form] as boolean}
                  onChange={(e) => update(key, e.target.checked)}
                  className="accent-gold w-4 h-4"
                />
                <span className="text-[#cccccc] text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* SEO */}
        <div className="bg-luxury-black border border-luxury-gray p-6 space-y-4">
          <h2 className="text-gold text-xs tracking-[0.2em] uppercase mb-4">
            SEO (opcional — se genera automáticamente)
          </h2>
          <div>
            <label className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
              Meta Título ({form.meta_titulo.length}/160)
            </label>
            <input
              type="text"
              value={form.meta_titulo}
              onChange={(e) => update("meta_titulo", e.target.value)}
              maxLength={160}
              className="w-full bg-luxury-gray border border-luxury-gray-mid text-white px-4 py-3 focus:outline-none focus:border-gold text-sm transition-colors"
            />
          </div>
          <div>
            <label className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
              Meta Descripción ({form.meta_descripcion.length}/320)
            </label>
            <textarea
              value={form.meta_descripcion}
              onChange={(e) => update("meta_descripcion", e.target.value)}
              maxLength={320}
              rows={3}
              className="w-full bg-luxury-gray border border-luxury-gray-mid text-white px-4 py-3 focus:outline-none focus:border-gold text-sm transition-colors resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 px-4 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 px-4 py-3">
            {success}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || uploading}
            className="flex-1 bg-gold text-black font-bold py-4 tracking-[0.2em] text-sm uppercase hover:bg-gold-light transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "SUBIENDO IMÁGENES..." : isEdit ? "GUARDAR CAMBIOS" : "CREAR PRODUCTO"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading || uploading}
            className="px-8 py-4 bg-transparent border border-luxury-gray-mid text-luxury-gray-light font-bold text-sm tracking-[0.2em] hover:text-white hover:border-white transition-all duration-300 disabled:opacity-50"
          >
            CANCELAR
          </button>
        </div>
      </form>

      {/* Overlay de Carga Full Screen */}
      {loading && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
              <Loader2 className="absolute inset-0 m-auto text-gold animate-pulse" size={24} />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-gold font-serif text-xl tracking-widest animate-pulse">
                {isEdit ? "ACTUALIZANDO" : "CREANDO"}
              </p>
              <p className="text-[#555555] text-[10px] uppercase tracking-[0.3em] mt-1">
                Por favor, esperá un momento
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de eliminación masiva de imágenes */}
      {isDeleteImagesModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-luxury-gray-mid w-full max-w-md p-6 md:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle size={24} />
              <h2 className="font-serif text-xl text-white">Confirmar eliminación</h2>
            </div>
            <p className="text-luxury-gray-light text-sm mb-6 leading-relaxed">
              ¿Estás seguro que deseas eliminar <strong className="text-white">{selectedImages.length} imágenes</strong> seleccionadas? Esta acción quitará las fotos de la galería del producto.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteImagesModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm text-luxury-gray-light hover:text-white border border-luxury-gray-mid hover:bg-luxury-gray transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setForm(prev => {
                    const newAdicionales = prev.imagenes_adicionales.filter(img => !selectedImages.includes(img));
                    let newPrincipal = prev.imagen_url;
                    
                    if (selectedImages.includes(prev.imagen_url)) {
                      newPrincipal = newAdicionales.length > 0 ? newAdicionales[0] : "";
                    }
                    
                    return {
                      ...prev,
                      imagenes_adicionales: newAdicionales,
                      imagen_url: newPrincipal
                    };
                  });
                  setSelectedImages([]);
                  setIsDeleteImagesModalOpen(false);
                }}
                className="flex-1 px-4 py-2.5 text-sm text-white bg-red-600/90 hover:bg-red-500 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Trash2 size={14} />
                Eliminar {selectedImages.length} {selectedImages.length === 1 ? 'imagen' : 'imágenes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
