"use client";

import { useState } from "react";
import {
  X,
  FileSpreadsheet,
  ArrowUp,
  Eye,
  EyeOff,
  FolderOpen,
  DollarSign,
  Truck,
  Images,
  Trash2,
  ChevronLeft,
  LayoutGrid,
  CaseSensitive,
  Star,
  StarOff,
  Coins,
  Tag,
} from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";
import {
  categoriaSelectOptions,
  subcategoriaSelectOptions,
} from "@/lib/catalog-select-options";
import {
  applyTextTransform,
  getProductFieldValue,
  type BulkTextField,
  type CapitalizeMode,
  type TextTransformOptions,
} from "@/lib/text-transform";

type View = "menu" | "proveedor" | "marca" | "categoria" | "renombrar" | "moneda";

interface SelectedProductPreview {
  id: string;
  nombre: string;
  marca: string;
  descripcion?: string;
  descripcion_corta?: string;
  descrip_provee?: string;
}

interface Categoria {
  id: string;
  nombre: string;
  activo?: boolean | null;
}

interface Subcategoria {
  id: string;
  nombre: string;
  categoria_id: string;
  activo?: boolean | null;
}

interface Proveedor {
  id: string;
  nombre: string;
}

interface Marca {
  id: string;
  nombre: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDismiss: () => void;
  selectedCount: number;
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  proveedores: Proveedor[];
  marcas: Marca[];
  bulkLoading: boolean;
  selectedProducts: SelectedProductPreview[];
  onExport: () => void;
  onShow: () => void;
  onHide: () => void;
  onUpdateProveedor: (proveedorId: string | null) => void;
  onUpdateMarca: (marca: string) => void;
  onUpdateCategoriaSubcategoria: (categoriaId: string, subcategoriaId: string | null) => void;
  onCreateCategoria: (nombre: string) => Promise<{ id: string; nombre: string } | null>;
  onCreateSubcategoria: (
    nombre: string,
    categoriaId: string
  ) => Promise<{ id: string; nombre: string; categoria_id: string } | null>;
  onOpenPrecio: () => void;
  onOpenImagenes: () => void;
  onBulkRename: (field: BulkTextField, options: TextTransformOptions) => void;
  onUpdateMoneda: (moneda: "ARS" | "USD") => void;
  onSetDestacado: (destacado: boolean) => void;
  onDelete: () => void;
}

const actionBtn =
  "flex flex-col items-center justify-center gap-2 p-4 border rounded-sm transition-colors text-center min-h-[88px]";

export default function BulkActionsModal({
  isOpen,
  onClose,
  onDismiss,
  selectedCount,
  categorias,
  subcategorias,
  proveedores,
  marcas,
  bulkLoading,
  selectedProducts,
  onExport,
  onShow,
  onHide,
  onUpdateProveedor,
  onUpdateMarca,
  onUpdateCategoriaSubcategoria,
  onCreateCategoria,
  onCreateSubcategoria,
  onOpenPrecio,
  onOpenImagenes,
  onBulkRename,
  onUpdateMoneda,
  onSetDestacado,
  onDelete,
}: Props) {
  const [view, setView] = useState<View>("menu");
  const [proveedorId, setProveedorId] = useState("");
  const [marcaNombre, setMarcaNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [subcategoriaId, setSubcategoriaId] = useState("");
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [categoriaError, setCategoriaError] = useState("");
  const [renameField, setRenameField] = useState<BulkTextField>("nombre");
  const [renamePrefix, setRenamePrefix] = useState("");
  const [renameSuffix, setRenameSuffix] = useState("");
  const [renameFind, setRenameFind] = useState("");
  const [renameReplace, setRenameReplace] = useState("");
  const [renameRemoveEmojis, setRenameRemoveEmojis] = useState(true);
  const [renameTrimSpaces, setRenameTrimSpaces] = useState(true);
  const [renameCollapseSpaces, setRenameCollapseSpaces] = useState(true);
  const [renameCapitalize, setRenameCapitalize] = useState<CapitalizeMode>("none");

  if (!isOpen) return null;

  function resetRenameForm() {
    setRenameField("nombre");
    setRenamePrefix("");
    setRenameSuffix("");
    setRenameFind("");
    setRenameReplace("");
    setRenameRemoveEmojis(true);
    setRenameTrimSpaces(true);
    setRenameCollapseSpaces(true);
    setRenameCapitalize("none");
  }

  function close() {
    setView("menu");
    setProveedorId("");
    setMarcaNombre("");
    setCategoriaId("");
    setSubcategoriaId("");
    setMoneda("ARS");
    setCategoriaError("");
    resetRenameForm();
    onClose();
  }

  function dismiss() {
    close();
    onDismiss();
  }

  function runAndClose(fn: () => void) {
    fn();
    close();
  }

  const categoriaOptions = categoriaSelectOptions(categorias);

  const subcategoriasDeCategoria = subcategorias.filter((s) => s.categoria_id === categoriaId);

  const subcategoriaOptions = subcategoriaSelectOptions(subcategoriasDeCategoria);

  const proveedorOptions = [
    { value: "", label: "Sin proveedor" },
    ...proveedores.map((p) => ({ value: p.id, label: p.nombre })),
  ];

  const marcaOptions = marcas.map((m) => ({ value: m.nombre, label: m.nombre }));

  const renameFieldOptions = [
    { value: "nombre", label: "Nombre del producto" },
    { value: "marca", label: "Marca" },
    { value: "descrip_provee", label: "Nombre en lista del proveedor" },
    { value: "descripcion", label: "Descripción" },
    { value: "descripcion_corta", label: "Descripción corta" },
  ];

  const capitalizeOptions = [
    { value: "none", label: "Sin cambios" },
    { value: "title", label: "Tipo título (Cada Palabra)" },
    { value: "sentence", label: "Primera letra mayúscula" },
    { value: "upper", label: "TODO MAYÚSCULAS" },
    { value: "lower", label: "todo minúsculas" },
  ];

  const renameOptions: TextTransformOptions = {
    prefix: renamePrefix || undefined,
    suffix: renameSuffix || undefined,
    find: renameFind || undefined,
    replace: renameReplace,
    removeEmojis: renameRemoveEmojis,
    trimSpaces: renameTrimSpaces,
    collapseSpaces: renameCollapseSpaces,
    capitalize: renameCapitalize,
  };

  const renamePreview = selectedProducts.slice(0, 3).map((product) => {
    const before = getProductFieldValue(product, renameField);
    const after = applyTextTransform(before, renameOptions);
    return { id: product.id, before, after, changed: before !== after };
  });

  const renameChangesCount = selectedProducts.filter((product) => {
    const before = getProductFieldValue(product, renameField);
    return before !== applyTextTransform(before, renameOptions);
  }).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border border-luxury-gray-mid w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-luxury-gray-mid shrink-0">
          <div className="flex items-center gap-3">
            {view !== "menu" && (
              <button
                type="button"
                onClick={() => setView("menu")}
                className="text-[#555555] hover:text-white transition-colors p-1 -ml-1"
                aria-label="Volver"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <LayoutGrid size={16} className="text-gold" />
                <h2 className="font-serif text-xl text-white">Acciones masivas</h2>
              </div>
              <p className="text-[#555555] text-xs mt-0.5">
                {selectedCount} producto{selectedCount !== 1 ? "s" : ""} seleccionado
                {selectedCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="text-gold text-[10px] uppercase tracking-wider hover:underline mr-1"
            >
              Desmarcar todos
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-[#555555] hover:text-white transition-colors p-1"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className={`relative p-6 ${
            view === "categoria" || view === "renombrar" || view === "moneda" || view === "marca" || view === "proveedor"
              ? "overflow-y-auto max-h-[min(60vh,520px)]"
              : "overflow-visible"
          }`}
        >
          {bulkLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 backdrop-blur-[1px]">
              <div className="w-6 h-6 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
            </div>
          )}

          {view === "menu" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => runAndClose(onExport)}
                className={`${actionBtn} text-gold border-gold/20 hover:bg-gold/10`}
              >
                <div className="relative">
                  <FileSpreadsheet size={20} />
                  <ArrowUp size={10} className="absolute -right-1 -bottom-1 text-white" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Exportar</span>
              </button>

              <button
                type="button"
                onClick={() => runAndClose(onShow)}
                disabled={bulkLoading}
                className={`${actionBtn} text-green-400 border-green-400/20 hover:bg-green-400/10 disabled:opacity-50`}
              >
                <Eye size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Mostrar</span>
              </button>

              <button
                type="button"
                onClick={() => runAndClose(onHide)}
                disabled={bulkLoading}
                className={`${actionBtn} text-gray-400 border-gray-400/20 hover:bg-gray-400/10 disabled:opacity-50`}
              >
                <EyeOff size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Ocultar</span>
              </button>

              <button
                type="button"
                onClick={() => setView("categoria")}
                disabled={bulkLoading}
                className={`${actionBtn} text-gold border-gold/20 hover:bg-gold/10 disabled:opacity-50`}
              >
                <FolderOpen size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Categoría</span>
              </button>

              <button
                type="button"
                onClick={() => runAndClose(onOpenPrecio)}
                disabled={bulkLoading}
                className={`${actionBtn} text-blue-400 border-blue-400/20 hover:bg-blue-400/10 disabled:opacity-50`}
              >
                <DollarSign size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Precio</span>
              </button>

              <button
                type="button"
                onClick={() => setView("proveedor")}
                disabled={bulkLoading}
                className={`${actionBtn} text-orange-400 border-orange-400/20 hover:bg-orange-400/10 disabled:opacity-50`}
              >
                <Truck size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Proveedor</span>
              </button>

              <button
                type="button"
                onClick={() => setView("marca")}
                disabled={bulkLoading}
                className={`${actionBtn} text-pink-400 border-pink-400/20 hover:bg-pink-400/10 disabled:opacity-50`}
              >
                <Tag size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Marca</span>
              </button>

              <button
                type="button"
                onClick={() => runAndClose(onOpenImagenes)}
                disabled={bulkLoading}
                className={`${actionBtn} text-purple-400 border-purple-400/20 hover:bg-purple-400/10 disabled:opacity-50`}
              >
                <Images size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Imágenes</span>
              </button>

              <button
                type="button"
                onClick={() => runAndClose(() => onSetDestacado(true))}
                disabled={bulkLoading}
                className={`${actionBtn} text-yellow-400 border-yellow-400/20 hover:bg-yellow-400/10 disabled:opacity-50`}
              >
                <Star size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Destacar</span>
              </button>

              <button
                type="button"
                onClick={() => runAndClose(() => onSetDestacado(false))}
                disabled={bulkLoading}
                className={`${actionBtn} text-gray-400 border-gray-400/20 hover:bg-gray-400/10 disabled:opacity-50`}
              >
                <StarOff size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Sin destacar</span>
              </button>

              <button
                type="button"
                onClick={() => setView("moneda")}
                disabled={bulkLoading}
                className={`${actionBtn} text-cyan-400 border-cyan-400/20 hover:bg-cyan-400/10 disabled:opacity-50`}
              >
                <Coins size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Moneda</span>
              </button>

              <button
                type="button"
                onClick={() => setView("renombrar")}
                disabled={bulkLoading}
                className={`${actionBtn} text-teal-400 border-teal-400/20 hover:bg-teal-400/10 disabled:opacity-50`}
              >
                <CaseSensitive size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Renombrar</span>
              </button>

              <button
                type="button"
                onClick={() => runAndClose(onDelete)}
                disabled={bulkLoading}
                className={`${actionBtn} text-red-400 border-red-400/20 hover:bg-red-400/10 disabled:opacity-50 col-span-2 sm:col-span-1`}
              >
                <Trash2 size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Eliminar</span>
              </button>
            </div>
          )}

          {view === "renombrar" && (
            <div className="space-y-5 max-w-xl">
              <p className="text-luxury-gray-light text-sm">
                Editá el texto de los {selectedCount} productos seleccionados. Podés combinar varias
                transformaciones a la vez.
              </p>

              <CustomSelect
                value={renameField}
                onChange={(val) => setRenameField(val as BulkTextField)}
                options={renameFieldOptions}
                label="Campo a editar"
                menuInFlow
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
                    Agregar al inicio
                  </span>
                  <input
                    type="text"
                    value={renamePrefix}
                    onChange={(e) => setRenamePrefix(e.target.value)}
                    placeholder="Ej: Oferta "
                    className="w-full bg-luxury-gray border border-luxury-gray-mid text-white px-3 py-2 text-sm focus:outline-none focus:border-gold"
                  />
                </label>
                <label className="block">
                  <span className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
                    Agregar al final
                  </span>
                  <input
                    type="text"
                    value={renameSuffix}
                    onChange={(e) => setRenameSuffix(e.target.value)}
                    placeholder="Ej: - Nuevo"
                    className="w-full bg-luxury-gray border border-luxury-gray-mid text-white px-3 py-2 text-sm focus:outline-none focus:border-gold"
                  />
                </label>
                <label className="block">
                  <span className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
                    Buscar
                  </span>
                  <input
                    type="text"
                    value={renameFind}
                    onChange={(e) => setRenameFind(e.target.value)}
                    placeholder="Texto a reemplazar"
                    className="w-full bg-luxury-gray border border-luxury-gray-mid text-white px-3 py-2 text-sm focus:outline-none focus:border-gold"
                  />
                </label>
                <label className="block">
                  <span className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
                    Reemplazar por
                  </span>
                  <input
                    type="text"
                    value={renameReplace}
                    onChange={(e) => setRenameReplace(e.target.value)}
                    placeholder="Nuevo texto (vacío = borrar)"
                    className="w-full bg-luxury-gray border border-luxury-gray-mid text-white px-3 py-2 text-sm focus:outline-none focus:border-gold"
                  />
                </label>
              </div>

              <CustomSelect
                value={renameCapitalize}
                onChange={(val) => setRenameCapitalize(val as CapitalizeMode)}
                options={capitalizeOptions}
                label="Capitalización"
                menuInFlow
              />

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-luxury-gray-light cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renameRemoveEmojis}
                    onChange={(e) => setRenameRemoveEmojis(e.target.checked)}
                    className="w-4 h-4 rounded border-luxury-gray-mid bg-black text-gold focus:ring-gold"
                  />
                  Eliminar emojis
                </label>
                <label className="flex items-center gap-2 text-sm text-luxury-gray-light cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renameTrimSpaces}
                    onChange={(e) => setRenameTrimSpaces(e.target.checked)}
                    className="w-4 h-4 rounded border-luxury-gray-mid bg-black text-gold focus:ring-gold"
                  />
                  Recortar espacios al inicio y final
                </label>
                <label className="flex items-center gap-2 text-sm text-luxury-gray-light cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renameCollapseSpaces}
                    onChange={(e) => setRenameCollapseSpaces(e.target.checked)}
                    className="w-4 h-4 rounded border-luxury-gray-mid bg-black text-gold focus:ring-gold"
                  />
                  Colapsar espacios múltiples
                </label>
              </div>

              {renamePreview.length > 0 && (
                <div className="border border-luxury-gray-mid bg-black/20 p-3 space-y-2">
                  <p className="text-[10px] text-[#555555] uppercase tracking-widest font-bold">
                    Vista previa ({renameChangesCount} de {selectedCount} con cambios)
                  </p>
                  {renamePreview.map((row) => (
                    <div key={row.id} className="text-xs space-y-1">
                      <p className="text-[#555555] line-clamp-1">{row.before || "—"}</p>
                      <p className={`line-clamp-1 ${row.changed ? "text-gold" : "text-[#555555]"}`}>
                        → {row.after || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  onBulkRename(renameField, renameOptions);
                  close();
                }}
                disabled={bulkLoading || renameChangesCount === 0}
                className="w-full py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                Aplicar a {renameChangesCount} producto{renameChangesCount !== 1 ? "s" : ""}
              </button>
            </div>
          )}

          {view === "moneda" && (
            <div className="space-y-4 max-w-xl">
              <p className="text-luxury-gray-light text-sm">
                Elegí la moneda para los {selectedCount} productos seleccionados.
              </p>
              <CustomSelect
                value={moneda}
                onChange={(val) => setMoneda(val as "ARS" | "USD")}
                options={[
                  { value: "ARS", label: "Pesos (ARS)" },
                  { value: "USD", label: "Dólares (USD)" },
                ]}
                label="Moneda"
                menuInFlow
                clearable={false}
              />
              <button
                type="button"
                onClick={() => {
                  onUpdateMoneda(moneda);
                  close();
                }}
                disabled={bulkLoading}
                className="w-full py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                Aplicar moneda
              </button>
            </div>
          )}

          {view === "proveedor" && (
            <div className="space-y-4 max-w-xl">
              <p className="text-luxury-gray-light text-sm">
                Asigná un proveedor a los {selectedCount} productos seleccionados.
              </p>
              <CustomSelect
                value={proveedorId}
                onChange={setProveedorId}
                options={proveedorOptions}
                placeholder="Seleccionar proveedor..."
                label="Proveedor"
                menuInFlow
              />
              <button
                type="button"
                onClick={() => {
                  onUpdateProveedor(proveedorId || null);
                  close();
                }}
                disabled={bulkLoading}
                className="w-full py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                Aplicar proveedor
              </button>
            </div>
          )}

          {view === "marca" && (
            <div className="space-y-4 max-w-xl">
              <p className="text-luxury-gray-light text-sm">
                Asigná una marca a los {selectedCount} productos seleccionados.
              </p>
              <CustomSelect
                value={marcaNombre}
                onChange={setMarcaNombre}
                options={marcaOptions}
                placeholder="Seleccionar marca..."
                label="Marca"
                menuInFlow
                clearable={false}
              />
              <button
                type="button"
                onClick={() => {
                  onUpdateMarca(marcaNombre);
                  close();
                }}
                disabled={bulkLoading || !marcaNombre.trim()}
                className="w-full py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                Aplicar marca
              </button>
            </div>
          )}

          {view === "categoria" && (
            <div className="space-y-4 max-w-xl">
              <p className="text-luxury-gray-light text-sm">
                Asigná categoría y subcategoría a los {selectedCount} productos seleccionados.
                Si no aparecen en la lista, buscá el nombre y agregalas desde ahí.
              </p>

              <CustomSelect
                value={categoriaId}
                onChange={(val) => {
                  setCategoriaId(val);
                  setSubcategoriaId("");
                  setCategoriaError("");
                }}
                options={categoriaOptions}
                placeholder="Buscar o seleccionar categoría..."
                label="Categoría"
                menuInFlow
                onCreateFromSearch={async (nombre) => {
                  setCategoriaError("");
                  const created = await onCreateCategoria(nombre);
                  if (created) {
                    setCategoriaId(created.id);
                    setSubcategoriaId("");
                  } else {
                    setCategoriaError("No se pudo crear la categoría.");
                  }
                }}
                createOptionLabel={(term) => `Agregar categoría "${term}"`}
              />

              {categoriaId && (
                <CustomSelect
                  value={subcategoriaId}
                  onChange={(val) => {
                    setSubcategoriaId(val);
                    setCategoriaError("");
                  }}
                  options={subcategoriaOptions}
                  placeholder="Buscar o seleccionar subcategoría..."
                  label="Subcategoría (opcional)"
                  menuInFlow
                  onCreateFromSearch={async (nombre) => {
                    setCategoriaError("");
                    const created = await onCreateSubcategoria(nombre, categoriaId);
                    if (created) {
                      setSubcategoriaId(created.id);
                    } else {
                      setCategoriaError("No se pudo crear la subcategoría.");
                    }
                  }}
                  createOptionLabel={(term) => `Agregar subcategoría "${term}"`}
                />
              )}

              {categoriaError && (
                <p className="text-red-400 text-xs">{categoriaError}</p>
              )}

              <button
                type="button"
                onClick={() => {
                  onUpdateCategoriaSubcategoria(categoriaId, subcategoriaId || null);
                  close();
                }}
                disabled={bulkLoading || !categoriaId}
                className="w-full py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                Aplicar categoría
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
