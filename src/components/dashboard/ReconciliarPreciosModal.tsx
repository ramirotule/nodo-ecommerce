"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Download, Upload, X, Check, AlertCircle, FileText, ArrowRight, RefreshCw } from "lucide-react";
import { PRODUCTS_TABLE } from "@/lib/supabase/tables";
import {
  sanitizeProductPayload,
} from "@/lib/supabase/product-columns";
import toast from "react-hot-toast";
import { calcPrecioVentaFromCosto } from "@/lib/price-utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  name: string;
  costo: number;
}

interface ProductoLite {
  id: string;
  nombre: string;
  marca: string;
  descrip_provee?: string | null;
  precio_costo: number | null;
  precio_venta: number | null;
  activo: boolean;
  slug: string;
}

interface NuevoRow {
  key: string;
  nombre: string;
  costo: number;
  selected: boolean;
}

interface ActualizadoRow {
  id: string;
  nombre: string;
  marca: string;
  costoActual: number;
  nuevoCosto: number;
  ventaActual: number;
  nuevaVenta: number;
  recalcOk: boolean;
  selected: boolean;
}

interface DesactivarRow {
  id: string;
  nombre: string;
  marca: string;
  descrip_provee: string;
  selected: boolean;
}

const baseSlug = (nombre: string, marca: string) =>
  `${nombre}-${marca}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

function uniqueSlug(nombre: string, marca: string, usedSlugs: Set<string>): string {
  const base = baseSlug(nombre, marca);
  if (!usedSlugs.has(base)) {
    usedSlugs.add(base);
    return base;
  }
  let i = 2;
  while (usedSlugs.has(`${base}-${i}`)) i++;
  const slug = `${base}-${i}`;
  usedSlugs.add(slug);
  return slug;
}

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

export default function ReconciliarPreciosModal({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const usedSlugsRef = useRef<Set<string>>(new Set());
  const supabase = createClient();

  const [nuevos, setNuevos] = useState<NuevoRow[]>([]);
  const [actualizados, setActualizados] = useState<ActualizadoRow[]>([]);
  const [aDesactivar, setADesactivar] = useState<DesactivarRow[]>([]);

  if (!isOpen) return null;

  function resetAll() {
    setStep("upload");
    setFile(null);
    setParsedRows([]);
    setError(null);
    setNuevos([]);
    setActualizados([]);
    setADesactivar([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  const downloadTemplate = () => {
    const templateData = [{ nombre_proveedor: "Producto de ejemplo", precio_costo: 5000 }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista");
    XLSX.writeFile(wb, "plantilla_lista_proveedor.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

        if (rawData.length === 0) {
          setError("El archivo está vacío.");
          return;
        }

        const headers = Object.keys(rawData[0]);
        const nameHeader = headers.find((h) => /nombre|producto|descrip|detalle|item/i.test(h)) || headers[0];
        const costHeader =
          headers.find((h) => /costo|precio|neto|importe/i.test(h)) ||
          headers.find((h) => typeof rawData[0][h] === "number") ||
          headers[1];

        const rows: ParsedRow[] = rawData
          .map((row) => ({
            name: String(row[nameHeader] ?? "").trim(),
            costo: Number(row[costHeader]),
          }))
          .filter((r) => r.name.length > 0 && Number.isFinite(r.costo) && r.costo >= 0);

        if (rows.length === 0) {
          setError("No se pudo detectar el nombre y el costo en el archivo.");
          return;
        }

        setParsedRows(rows);
      } catch {
        setError("Error al leer el archivo Excel.");
      }
    };
    reader.readAsBinaryString(f);
  };

  async function analizar() {
    setAnalyzing(true);
    setError(null);
    try {
      const { data: productosDb, error: fetchError } = await supabase
        .from(PRODUCTS_TABLE)
        .select("*");

      if (fetchError) throw fetchError;

      const productos = (productosDb ?? []) as ProductoLite[];
      usedSlugsRef.current = new Set(productos.map((p) => p.slug));

      const matchKey = (p: ProductoLite) =>
        (p.descrip_provee?.trim() || p.nombre.trim()).toLowerCase();

      const matchMap = new Map<string, ProductoLite>();
      for (const p of productos) {
        const key = matchKey(p);
        if (key) matchMap.set(key, p);
      }

      const parsedKeys = new Set(parsedRows.map((r) => r.name.toLowerCase()));

      const nextNuevos: NuevoRow[] = [];
      const nextActualizados: ActualizadoRow[] = [];

      for (const row of parsedRows) {
        const key = row.name.toLowerCase();
        const match = matchMap.get(key);

        if (!match) {
          nextNuevos.push({ key, nombre: row.name, costo: row.costo, selected: true });
          continue;
        }

        const costoActual = match.precio_costo ?? 0;
        const ventaActual = match.precio_venta ?? 0;

        if (row.costo === costoActual) continue;

        const nuevaVenta = calcPrecioVentaFromCosto(row.costo);
        const recalcOk = row.costo > 0;

        nextActualizados.push({
          id: match.id,
          nombre: match.nombre,
          marca: match.marca,
          costoActual,
          nuevoCosto: row.costo,
          ventaActual,
          nuevaVenta,
          recalcOk,
          selected: true,
        });
      }

      const nextADesactivar: DesactivarRow[] = productos
        .filter(
          (p) => {
            const key = matchKey(p);
            return key && p.activo && !parsedKeys.has(key);
          }
        )
        .map((p) => ({
          id: p.id,
          nombre: p.nombre,
          marca: p.marca,
          descrip_provee: p.descrip_provee?.trim() || p.nombre,
          selected: true,
        }));

      setNuevos(nextNuevos);
      setActualizados(nextActualizados);
      setADesactivar(nextADesactivar);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al analizar el archivo.");
    } finally {
      setAnalyzing(false);
    }
  }

  function toggleRow<T extends { selected: boolean }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    index: number
  ) {
    setter((prev) => prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)));
  }

  function toggleAll<T extends { selected: boolean }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    rows: T[]
  ) {
    const allSelected = rows.every((r) => r.selected);
    setter((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  }

  async function processReconciliation() {
    setApplying(true);
    setError(null);
    try {
      const selectedNuevos = nuevos.filter((n) => n.selected);
      const selectedActualizados = actualizados.filter((a) => a.selected);
      const selectedDesactivar = aDesactivar.filter((d) => d.selected);

      if (selectedNuevos.length > 0) {
        const toInsert = await Promise.all(
          selectedNuevos.map(async (n) =>
            sanitizeProductPayload(supabase, {
              nombre: n.nombre,
              marca: "Sin marca",
              slug: uniqueSlug(n.nombre, "sin-marca", usedSlugsRef.current),
              descripcion: "",
              precio_costo: n.costo,
              precio_venta: calcPrecioVentaFromCosto(n.costo),
              stock: 0,
              moneda: "ARS",
              descrip_provee: n.nombre,
              activo: false,
              pendiente_completar: true,
            })
          )
        );

        const batchSize = 20;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);
          const { error: insertError } = await supabase.from(PRODUCTS_TABLE).insert(batch);
          if (insertError) throw insertError;
        }
      }

      if (selectedActualizados.length > 0) {
        const chunkSize = 20;
        for (let i = 0; i < selectedActualizados.length; i += chunkSize) {
          const chunk = selectedActualizados.slice(i, i + chunkSize);
          const results = await Promise.all(
            chunk.map((row) => {
              const updatePayload: { precio_costo: number; precio_venta?: number } = {
                precio_costo: row.nuevoCosto,
              };
              if (row.recalcOk) updatePayload.precio_venta = row.nuevaVenta;
              return supabase.from(PRODUCTS_TABLE).update(updatePayload).eq("id", row.id);
            })
          );
          const failed = results.find((r) => r.error);
          if (failed?.error) throw failed.error;
        }
      }

      if (selectedDesactivar.length > 0) {
        const { error: deactivateError } = await supabase
          .from(PRODUCTS_TABLE)
          .update({ activo: false })
          .in(
            "id",
            selectedDesactivar.map((d) => d.id)
          );
        if (deactivateError) throw deactivateError;
      }

      toast.success(
        `${selectedNuevos.length} nuevos, ${selectedActualizados.length} actualizados, ${selectedDesactivar.length} desactivados.`
      );
      onSuccess();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al aplicar los cambios.";
      setError(message);
      toast.error("Hubo un error al aplicar los cambios.");
    } finally {
      setApplying(false);
    }
  }

  const totalSeleccionado =
    nuevos.filter((n) => n.selected).length +
    actualizados.filter((a) => a.selected).length +
    aDesactivar.filter((d) => d.selected).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border border-luxury-gray-mid w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-luxury-gray flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <RefreshCw className="text-gold" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-serif text-white">Actualizar precios del proveedor</h2>
              <p className="text-luxury-gray-light text-xs">
                {step === "upload" ? "Subí la lista de precios de hoy" : "Revisá los cambios antes de aplicarlos"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-[#555555] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === "upload" && (
            <>
              <div className="bg-luxury-black border border-luxury-gray p-4 rounded-lg flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="text-luxury-gray-light" size={24} />
                  <div>
                    <p className="text-white text-sm font-medium">1. Descargar Plantilla</p>
                    <p className="text-[#555555] text-xs">Dos columnas: nombre del proveedor y precio de costo</p>
                  </div>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 bg-luxury-gray hover:bg-[#252525] text-white text-xs px-4 py-2 rounded border border-luxury-gray-mid transition-colors"
                >
                  <Download size={14} /> Descargar .xlsx
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-white text-sm font-medium">2. Subir Lista del Proveedor</p>
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
                      <p className="text-green-500/70 text-xs">{parsedRows.length} filas detectadas</p>
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
            </>
          )}

          {step === "review" && (
            <>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded flex items-center gap-3 text-red-500 text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              {nuevos.length === 0 && actualizados.length === 0 && aDesactivar.length === 0 ? (
                <p className="text-luxury-gray-light text-sm py-8 text-center">
                  El archivo coincide con el catálogo, no hay cambios que aplicar.
                </p>
              ) : (
                <>
                  {nuevos.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">
                          Productos nuevos ({nuevos.length})
                        </p>
                        <label className="flex items-center gap-2 text-xs text-luxury-gray-light cursor-pointer">
                          <input
                            type="checkbox"
                            checked={nuevos.every((n) => n.selected)}
                            onChange={() => toggleAll(setNuevos, nuevos)}
                            className="accent-gold w-3.5 h-3.5"
                          />
                          Seleccionar todos
                        </label>
                      </div>
                      <div className="border border-luxury-gray rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-black/50 text-[#555555] uppercase tracking-wider sticky top-0">
                            <tr>
                              <th className="px-3 py-2 w-8" />
                              <th className="px-3 py-2">Nombre (proveedor)</th>
                              <th className="px-3 py-2 text-right">Costo</th>
                              <th className="px-3 py-2 text-right">Se crea como</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-luxury-gray">
                            {nuevos.map((n, i) => (
                              <tr key={n.key} className="text-luxury-gray-light">
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={n.selected}
                                    onChange={() => toggleRow(setNuevos, i)}
                                    className="accent-gold w-3.5 h-3.5"
                                  />
                                </td>
                                <td className="px-3 py-2 text-white">{n.nombre}</td>
                                <td className="px-3 py-2 text-right">{fmt(n.costo)}</td>
                                <td className="px-3 py-2 text-right text-amber-500 text-[10px] uppercase tracking-wide">
                                  Oculto · Pendiente
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {actualizados.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">
                          Precios actualizados ({actualizados.length})
                        </p>
                        <label className="flex items-center gap-2 text-xs text-luxury-gray-light cursor-pointer">
                          <input
                            type="checkbox"
                            checked={actualizados.every((a) => a.selected)}
                            onChange={() => toggleAll(setActualizados, actualizados)}
                            className="accent-gold w-3.5 h-3.5"
                          />
                          Seleccionar todos
                        </label>
                      </div>
                      <div className="border border-luxury-gray rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-black/50 text-[#555555] uppercase tracking-wider sticky top-0">
                            <tr>
                              <th className="px-3 py-2 w-8" />
                              <th className="px-3 py-2">Nombre</th>
                              <th className="px-3 py-2 text-right">Costo</th>
                              <th className="px-3 py-2 text-right">Venta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-luxury-gray">
                            {actualizados.map((a, i) => (
                              <tr key={a.id} className="text-luxury-gray-light">
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={a.selected}
                                    onChange={() => toggleRow(setActualizados, i)}
                                    className="accent-gold w-3.5 h-3.5"
                                  />
                                </td>
                                <td className="px-3 py-2 text-white">
                                  {a.nombre}
                                  <span className="text-[#555555]"> · {a.marca}</span>
                                </td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                  {fmt(a.costoActual)} <ArrowRight size={10} className="inline mx-1" /> {fmt(a.nuevoCosto)}
                                </td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                  {a.recalcOk ? (
                                    <>
                                      {fmt(a.ventaActual)} <ArrowRight size={10} className="inline mx-1" /> {fmt(a.nuevaVenta)}
                                    </>
                                  ) : (
                                    <span className="text-amber-500 text-[10px] uppercase tracking-wide">
                                      Revisar margen a mano
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {aDesactivar.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">
                          Ya no están en la lista — desactivar ({aDesactivar.length})
                        </p>
                        <label className="flex items-center gap-2 text-xs text-luxury-gray-light cursor-pointer">
                          <input
                            type="checkbox"
                            checked={aDesactivar.every((d) => d.selected)}
                            onChange={() => toggleAll(setADesactivar, aDesactivar)}
                            className="accent-gold w-3.5 h-3.5"
                          />
                          Seleccionar todos
                        </label>
                      </div>
                      <div className="border border-luxury-gray rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-black/50 text-[#555555] uppercase tracking-wider sticky top-0">
                            <tr>
                              <th className="px-3 py-2 w-8" />
                              <th className="px-3 py-2">Nombre</th>
                              <th className="px-3 py-2">Nombre proveedor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-luxury-gray">
                            {aDesactivar.map((d, i) => (
                              <tr key={d.id} className="text-luxury-gray-light">
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={d.selected}
                                    onChange={() => toggleRow(setADesactivar, i)}
                                    className="accent-gold w-3.5 h-3.5"
                                  />
                                </td>
                                <td className="px-3 py-2 text-white">
                                  {d.nombre} <span className="text-[#555555]">· {d.marca}</span>
                                </td>
                                <td className="px-3 py-2">{d.descrip_provee}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-luxury-gray flex gap-3">
          {step === "upload" ? (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 text-sm text-luxury-gray-light hover:text-white border border-luxury-gray-mid transition-colors"
                disabled={analyzing}
              >
                Cancelar
              </button>
              <button
                onClick={analizar}
                disabled={analyzing || parsedRows.length === 0}
                className="flex-1 bg-gold disabled:bg-gray-800 disabled:text-gray-500 text-black font-bold px-4 py-2.5 text-sm tracking-wider transition-all flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Analizar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("upload")}
                className="flex-1 px-4 py-2.5 text-sm text-luxury-gray-light hover:text-white border border-luxury-gray-mid transition-colors"
                disabled={applying}
              >
                Volver
              </button>
              <button
                onClick={processReconciliation}
                disabled={applying || totalSeleccionado === 0}
                className="flex-1 bg-gold disabled:bg-gray-800 disabled:text-gray-500 text-black font-bold px-4 py-2.5 text-sm tracking-wider transition-all flex items-center justify-center gap-2"
              >
                {applying ? (
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Confirmar cambios ({totalSeleccionado})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
