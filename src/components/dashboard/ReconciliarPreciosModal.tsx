"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Download, Upload, X, Check, AlertCircle, FileText, FileSpreadsheet, ArrowRight, RefreshCw, ClipboardPaste } from "lucide-react";
import { PRODUCTS_TABLE } from "@/lib/supabase/tables";
import {
  sanitizeProductPayload,
} from "@/lib/supabase/product-columns";
import toast from "react-hot-toast";
import { calcPrecioVentaFromCosto } from "@/lib/price-utils";
import { parseProviderChat, normalizeForMatch, tokenSimilarity } from "@/lib/provider-chat-parser";
import CustomSelect from "@/components/ui/CustomSelect";

const FUZZY_MATCH_THRESHOLD = 0.5;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proveedores: { id: string; nombre: string }[];
}

interface ParsedRow {
  name: string;
  costo: number;
  baseName?: string;
  color?: string;
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
  proveedor_id?: string | null;
}

interface NuevoRow {
  key: string;
  nombre: string;
  baseName: string;
  color?: string;
  costo: number;
  selected: boolean;
}

interface ActualizadoRow {
  id: string;
  nombre: string;
  baseName: string;
  color?: string;
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

interface PosibleRow {
  id: string;
  nombreParsed: string;
  baseName: string;
  color?: string;
  nombre: string;
  marca: string;
  similarity: number;
  costoActual: number;
  nuevoCosto: number;
  ventaActual: number;
  nuevaVenta: number;
  recalcOk: boolean;
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

export default function ReconciliarPreciosModal({ isOpen, onClose, onSuccess, proveedores }: Props) {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [proveedorId, setProveedorId] = useState<string>("");
  const [modoInput, setModoInput] = useState<"excel" | "texto">("texto");
  const [chatText, setChatText] = useState("");
  const [unrecognizedCount, setUnrecognizedCount] = useState(0);
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
  const [posibles, setPosibles] = useState<PosibleRow[]>([]);

  if (!isOpen) return null;

  function resetAll() {
    setStep("upload");
    setProveedorId("");
    setModoInput("texto");
    setChatText("");
    setUnrecognizedCount(0);
    setFile(null);
    setParsedRows([]);
    setError(null);
    setNuevos([]);
    setActualizados([]);
    setADesactivar([]);
    setPosibles([]);
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

  function handleChatTextChange(value: string) {
    setChatText(value);
    setError(null);
    if (!value.trim()) {
      setParsedRows([]);
      setUnrecognizedCount(0);
      return;
    }
    const { rows, unrecognized } = parseProviderChat(value);
    setParsedRows(rows.map((r) => ({ name: r.name, costo: r.price, baseName: r.baseName, color: r.color })));
    setUnrecognizedCount(unrecognized);
  }

  async function analizar() {
    if (!proveedorId) {
      setError("Elegí primero el proveedor.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const { data: productosDb, error: fetchError } = await supabase
        .from(PRODUCTS_TABLE)
        .select("*");

      if (fetchError) throw fetchError;

      const productos = (productosDb ?? []) as ProductoLite[];
      usedSlugsRef.current = new Set(productos.map((p) => p.slug));

      const productosProveedor = productos.filter((p) => p.proveedor_id === proveedorId);

      const matchKey = (p: ProductoLite) =>
        normalizeForMatch(p.descrip_provee?.trim() || p.nombre.trim());

      const matchMap = new Map<string, ProductoLite>();
      for (const p of productosProveedor) {
        const key = matchKey(p);
        if (key) matchMap.set(key, p);
      }

      const parsedKeys = new Set(parsedRows.map((r) => normalizeForMatch(r.name)));

      const nextNuevos: NuevoRow[] = [];
      const nextActualizados: ActualizadoRow[] = [];
      const nextPosibles: PosibleRow[] = [];

      for (const row of parsedRows) {
        const key = normalizeForMatch(row.name);
        const exactMatch = matchMap.get(key);

        let match = exactMatch;
        let similarity = 1;

        if (!match) {
          let bestScore = 0;
          let best: ProductoLite | undefined;
          for (const p of productosProveedor) {
            const score = tokenSimilarity(row.name, p.descrip_provee?.trim() || p.nombre);
            if (score > bestScore) {
              bestScore = score;
              best = p;
            }
          }
          if (best && bestScore >= FUZZY_MATCH_THRESHOLD) {
            match = best;
            similarity = bestScore;
          }
        }

        if (!match) {
          nextNuevos.push({
            key,
            nombre: row.name,
            baseName: row.baseName ?? row.name,
            color: row.color,
            costo: row.costo,
            selected: true,
          });
          continue;
        }

        const costoActual = match.precio_costo ?? 0;
        const ventaActual = match.precio_venta ?? 0;

        if (exactMatch && row.costo === costoActual) continue;

        const nuevaVenta = calcPrecioVentaFromCosto(row.costo);
        const recalcOk = row.costo > 0;

        if (!exactMatch) {
          nextPosibles.push({
            id: match.id,
            nombreParsed: row.name,
            baseName: row.baseName ?? row.name,
            color: row.color,
            nombre: match.nombre,
            marca: match.marca,
            similarity,
            costoActual,
            nuevoCosto: row.costo,
            ventaActual,
            nuevaVenta,
            recalcOk,
            selected: false,
          });
          continue;
        }

        nextActualizados.push({
          id: match.id,
          nombre: match.nombre,
          baseName: row.baseName ?? row.name,
          color: row.color,
          marca: match.marca,
          costoActual,
          nuevoCosto: row.costo,
          ventaActual,
          nuevaVenta,
          recalcOk,
          selected: true,
        });
      }

      const matchedIds = new Set([
        ...nextActualizados.map((a) => a.id),
        ...nextPosibles.map((p) => p.id),
      ]);

      const nextADesactivar: DesactivarRow[] = productosProveedor
        .filter((p) => {
          const key = matchKey(p);
          return key && p.activo && !matchedIds.has(p.id) && !parsedKeys.has(key);
        })
        .map((p) => ({
          id: p.id,
          nombre: p.nombre,
          marca: p.marca,
          descrip_provee: p.descrip_provee?.trim() || p.nombre,
          selected: true,
        }));

      setNuevos(nextNuevos);
      setActualizados(nextActualizados);
      setPosibles(nextPosibles);
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

  function toggleGroup<T extends { selected: boolean }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    groupRows: T[]
  ) {
    const allSelected = groupRows.every((r) => r.selected);
    const set = new Set(groupRows);
    setter((prev) => prev.map((r) => (set.has(r) ? { ...r, selected: !allSelected } : r)));
  }

  /** Agrupa filas por (baseName + precio) para mostrar variantes de color como una sola fila. */
  function groupByModelAndPrice<T extends { baseName: string; color?: string; selected: boolean }>(
    rows: T[],
    getPrice: (r: T) => number
  ): { key: string; baseName: string; price: number; colors: string[]; rows: T[] }[] {
    const groups: { key: string; baseName: string; price: number; colors: string[]; rows: T[] }[] = [];
    const indexByKey = new Map<string, number>();

    for (const row of rows) {
      const price = getPrice(row);
      const key = `${row.baseName}__${price}`;
      let idx = indexByKey.get(key);
      if (idx === undefined) {
        idx = groups.length;
        indexByKey.set(key, idx);
        groups.push({ key, baseName: row.baseName, price, colors: [], rows: [] });
      }
      if (row.color) groups[idx].colors.push(row.color);
      groups[idx].rows.push(row);
    }

    return groups;
  }

  async function processReconciliation() {
    setApplying(true);
    setError(null);
    try {
      const selectedNuevos = nuevos.filter((n) => n.selected);
      const selectedActualizados = [
        ...actualizados.filter((a) => a.selected),
        ...posibles.filter((p) => p.selected),
      ];
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
              proveedor_id: proveedorId,
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
    posibles.filter((p) => p.selected).length +
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
              <div className="space-y-2">
                <p className="text-white text-sm font-medium">1. Elegir proveedor</p>
                <CustomSelect
                  value={proveedorId}
                  onChange={setProveedorId}
                  options={proveedores.map((p) => ({ value: p.id, label: p.nombre }))}
                  placeholder="Seleccioná el proveedor..."
                />
                <p className="text-[#555555] text-xs">
                  Solo se compara contra los productos ya cargados de este proveedor.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-white text-sm font-medium">2. Cargar la lista de precios</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModoInput("texto")}
                    className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold px-3 py-2 border transition-colors ${
                      modoInput === "texto"
                        ? "bg-gold border-gold text-black"
                        : "bg-luxury-gray border-luxury-gray-mid text-luxury-gray-light hover:text-white"
                    }`}
                  >
                    <ClipboardPaste size={14} /> Pegar texto del chat
                  </button>
                  <button
                    onClick={() => setModoInput("excel")}
                    className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold px-3 py-2 border transition-colors ${
                      modoInput === "excel"
                        ? "bg-gold border-gold text-black"
                        : "bg-luxury-gray border-luxury-gray-mid text-luxury-gray-light hover:text-white"
                    }`}
                  >
                    <FileSpreadsheet size={14} /> Subir Excel
                  </button>
                </div>

                {modoInput === "texto" ? (
                  <div className="space-y-2">
                    <textarea
                      value={chatText}
                      onChange={(e) => handleChatTextChange(e.target.value)}
                      placeholder={"Pegá acá el mensaje del proveedor, por ejemplo:\n▪️ IPHONE 16 128 GB ESIM - $ 815\nBLACK - WHITE - PINK"}
                      rows={10}
                      className="w-full bg-luxury-black border border-luxury-gray-mid text-white text-xs p-3 font-mono focus:outline-none focus:border-gold/60 transition-colors resize-y"
                    />
                    {chatText.trim().length > 0 && (
                      <p className="text-xs">
                        <span className="text-green-500/80">{parsedRows.length} líneas detectadas</span>
                        {unrecognizedCount > 0 && (
                          <span className="text-amber-500/80"> · {unrecognizedCount} no reconocidas (revisalas a mano)</span>
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="bg-luxury-black border border-luxury-gray p-4 rounded-lg flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <FileText className="text-luxury-gray-light" size={24} />
                        <div>
                          <p className="text-white text-sm font-medium">Descargar plantilla</p>
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
                  </>
                )}
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

              {nuevos.length === 0 && actualizados.length === 0 && posibles.length === 0 && aDesactivar.length === 0 ? (
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
                            {groupByModelAndPrice(nuevos, (n) => n.costo).map((g) => (
                              <tr key={g.key} className="text-luxury-gray-light">
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={g.rows.every((r) => r.selected)}
                                    onChange={() => toggleGroup(setNuevos, g.rows)}
                                    className="accent-gold w-3.5 h-3.5"
                                  />
                                </td>
                                <td className="px-3 py-2 text-white">
                                  {g.baseName}
                                  {g.colors.length > 0 && (
                                    <p className="text-[#555555] font-normal normal-case">
                                      Colores disponibles: {g.colors.join(", ").toLowerCase()}
                                    </p>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">{fmt(g.price)}</td>
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
                            {groupByModelAndPrice(actualizados, (a) => a.nuevoCosto).map((g) => {
                              const first = g.rows[0];
                              const sameCostoActual = g.rows.every((r) => r.costoActual === first.costoActual);
                              const sameVentaActual = g.rows.every((r) => r.ventaActual === first.ventaActual);
                              const recalcOk = g.rows.every((r) => r.recalcOk);
                              return (
                                <tr key={g.key} className="text-luxury-gray-light">
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={g.rows.every((r) => r.selected)}
                                      onChange={() => toggleGroup(setActualizados, g.rows)}
                                      className="accent-gold w-3.5 h-3.5"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-white">
                                    {g.baseName}
                                    <span className="text-[#555555]"> · {first.marca}</span>
                                    {g.colors.length > 0 && (
                                      <p className="text-[#555555] font-normal">
                                        Colores disponibles: {g.colors.join(", ").toLowerCase()}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap">
                                    {sameCostoActual ? (
                                      <>
                                        {fmt(first.costoActual)} <ArrowRight size={10} className="inline mx-1" /> {fmt(g.price)}
                                      </>
                                    ) : (
                                      fmt(g.price)
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap">
                                    {recalcOk ? (
                                      sameVentaActual ? (
                                        <>
                                          {fmt(first.ventaActual)} <ArrowRight size={10} className="inline mx-1" /> {fmt(first.nuevaVenta)}
                                        </>
                                      ) : (
                                        fmt(first.nuevaVenta)
                                      )
                                    ) : (
                                      <span className="text-amber-500 text-[10px] uppercase tracking-wide">
                                        Revisar margen a mano
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {posibles.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">
                          Posibles coincidencias — confirmá antes de aplicar ({posibles.length})
                        </p>
                        <label className="flex items-center gap-2 text-xs text-luxury-gray-light cursor-pointer">
                          <input
                            type="checkbox"
                            checked={posibles.every((p) => p.selected)}
                            onChange={() => toggleAll(setPosibles, posibles)}
                            className="accent-gold w-3.5 h-3.5"
                          />
                          Seleccionar todos
                        </label>
                      </div>
                      <p className="text-[#555555] text-xs">
                        No encontré el nombre exacto en el catálogo, pero se parece a estos productos. Tildá los que sean correctos.
                      </p>
                      <div className="border border-luxury-gray rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-black/50 text-[#555555] uppercase tracking-wider sticky top-0">
                            <tr>
                              <th className="px-3 py-2 w-8" />
                              <th className="px-3 py-2">Proveedor dice / Match en catálogo</th>
                              <th className="px-3 py-2 text-right">Costo</th>
                              <th className="px-3 py-2 text-right">Venta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-luxury-gray">
                            {posibles.map((p, i) => (
                              <tr key={`${p.id}-${i}`} className="text-luxury-gray-light">
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={p.selected}
                                    onChange={() => toggleRow(setPosibles, i)}
                                    className="accent-gold w-3.5 h-3.5"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <p className="text-[#888]">{p.nombreParsed}</p>
                                  <p className="text-white">
                                    {p.nombre} <span className="text-[#555555]">· {p.marca}</span>
                                  </p>
                                </td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                  {fmt(p.costoActual)} <ArrowRight size={10} className="inline mx-1" /> {fmt(p.nuevoCosto)}
                                </td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                  {p.recalcOk ? (
                                    <>
                                      {fmt(p.ventaActual)} <ArrowRight size={10} className="inline mx-1" /> {fmt(p.nuevaVenta)}
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
                disabled={analyzing || parsedRows.length === 0 || !proveedorId}
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
