"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

function sortSelectOptions(options: Option[]): Option[] {
  const pinned = options.filter((o) => !o.value);
  const rest = [...options.filter((o) => o.value)].sort((a, b) =>
    a.label.localeCompare(b.label, "es", { sensitivity: "base" })
  );
  return [...pinned, ...rest];
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  loading?: boolean;
  /** Altura reducida (40px) para alinearse con inputs compactos, ej. barras de búsqueda. */
  compact?: boolean;
  /** Lista en flujo normal (el contenedor crece al abrir). */
  menuInFlow?: boolean;
  /** Muestra botón X para limpiar cuando hay valor seleccionado. */
  clearable?: boolean;
  /** En modo compact, trunca el texto seleccionado con ellipsis. */
  truncateSelected?: boolean;
  /** Si la búsqueda no coincide con ninguna opción, permite crear desde el mismo input. */
  onCreateFromSearch?: (searchTerm: string) => void | Promise<void>;
  createOptionLabel?: (searchTerm: string) => string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  label,
  loading = false,
  compact = false,
  menuInFlow = false,
  clearable = true,
  truncateSelected = true,
  onCreateFromSearch,
  createOptionLabel = (term) => `Agregar "${term}"`,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [creatingFromSearch, setCreatingFromSearch] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sortedOptions = useMemo(() => sortSelectOptions(options), [options]);
  const selectedOption = sortedOptions.find((opt) => opt.value === value);
  const canClear = clearable && !loading && value !== "";

  function handleClear(event: React.MouseEvent | React.KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    onChange("");
    setIsOpen(false);
    setSearchTerm("");
  }

  const trimmedSearch = searchTerm.trim();

  // Filtrar opciones basado en la búsqueda
  const filteredOptions = sortedOptions.filter((opt) => {
    if (onCreateFromSearch && trimmedSearch && !opt.value) return false;
    return opt.label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const hasExactMatch = sortedOptions.some(
    (opt) => opt.value !== "" && opt.label.toLowerCase() === trimmedSearch.toLowerCase()
  );
  const showCreateOption = Boolean(
    onCreateFromSearch && trimmedSearch && !hasExactMatch
  );

  async function handleCreateFromSearch() {
    if (!onCreateFromSearch || !trimmedSearch || creatingFromSearch) return;
    setCreatingFromSearch(true);
    try {
      await onCreateFromSearch(trimmedSearch);
      setIsOpen(false);
      setSearchTerm("");
    } finally {
      setCreatingFromSearch(false);
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Enfocar el input cuando se abre el dropdown
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="text-luxury-gray-light text-xs uppercase tracking-widest block mb-1.5">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => {
          if (!loading) {
            setIsOpen(!isOpen);
            setSearchTerm("");
          }
        }}
        className={`w-full bg-luxury-gray border border-luxury-gray-mid text-white px-4 text-left text-sm transition-all flex items-center justify-between gap-2 hover:border-gold/50 ${
          compact ? "h-[40px] py-0" : "py-3"
        } ${isOpen ? "border-gold ring-1 ring-gold/20" : ""} ${loading ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
      >
        <span className={`min-w-0 flex-1 ${compact && truncateSelected ? "truncate whitespace-nowrap" : "whitespace-nowrap"} ${!selectedOption && !value ? "text-[#555555]" : "text-white"}`}>
          {loading
            ? "Cargando..."
            : selectedOption
              ? selectedOption.label
              : value || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {canClear && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Quitar selección"
              onClick={handleClear}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleClear(e);
                }
              }}
              className="p-0.5 text-[#555555] hover:text-white transition-colors rounded-sm"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-gold transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isOpen && (
        <div
          className={
            menuInFlow
              ? "w-full mt-1 bg-luxury-gray border border-luxury-gray-mid shadow-2xl max-h-72 overflow-hidden flex flex-col"
              : "absolute z-[110] w-full mt-1 bg-luxury-gray border border-luxury-gray-mid shadow-2xl max-h-72 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
          }
        >
          {/* Input de Búsqueda */}
          <div className="p-2 border-b border-luxury-gray-mid bg-luxury-black">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && showCreateOption) {
                  e.preventDefault();
                  handleCreateFromSearch();
                }
              }}
              placeholder="Buscar..."
              className="w-full bg-luxury-gray border border-luxury-gray-mid text-white px-2 py-1.5 text-xs focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {/* Lista de Opciones */}
          <div className="overflow-y-auto custom-scrollbar flex-1">
            {filteredOptions.length === 0 && !showCreateOption ? (
              <div className="px-4 py-3 text-xs text-[#555555] italic text-center">No se encontraron resultados</div>
            ) : (
              <>
                {filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gold hover:text-black ${
                      value === opt.value ? "bg-gold/10 text-gold font-medium" : "text-[#cccccc]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {showCreateOption && (
                  <button
                    type="button"
                    onClick={handleCreateFromSearch}
                    disabled={creatingFromSearch}
                    className="w-full text-left px-4 py-3 text-sm transition-colors text-gold hover:bg-gold hover:text-black border-t border-luxury-gray-mid disabled:opacity-50"
                  >
                    {creatingFromSearch ? "Agregando..." : createOptionLabel(trimmedSearch)}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
