"use client";

import { useState, useTransition, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Menu, X, ChevronDown, ShoppingBag, Sun, Moon, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCatalogo } from "@/context/CatalogoContext";
import DolarWidget from "@/components/ui/DolarWidget";
import PrecioUSD from "@/components/productos/PrecioUSD";
import ProductImage from "@/components/ui/ProductImage";
import { createClient } from "@/lib/supabase/client";
import { PRODUCTS_TABLE } from "@/lib/supabase/tables";
import { formatPrice } from "@/lib/price-utils";
import type { Producto } from "@/types";

async function searchProductsInline(query: string): Promise<Producto[]> {
  if (query.length < 3) return [];
  const supabase = createClient();
  const tagTerm = query.toLowerCase().replace(/[{},]/g, "");
  const { data } = await supabase
    .from(PRODUCTS_TABLE)
    .select("id, nombre, marca, slug, precio_venta, imagen_url")
    .eq("activo", true)
    .or(`nombre.ilike.%${query}%,marca.ilike.%${query}%,tags.cs.{${tagTerm}}`)
    .order("destacado", { ascending: false })
    .limit(6);
  return (data as Producto[]) || [];
}

const SKINCARE_SUBITEMS: Record<string, string[]> = {
  "cuidado-facial": ["Limpieza", "Serum", "Crema", "Tratamiento", "Suncare", "Rutinas"],
  "cuidado-corporal": ["Corporales", "Manos"],
  "tipos-de-piel": ["Mixta", "Grasa", "Seca", "Normal", "Todo tipo"],
  "linea": ["Bioetape", "Semplice", "Patagonia"],
};

const BIENESTAR_SUBITEMS: Record<string, string[]> = {
  "aceites-esenciales": ["Aceites Puros Esenciales", "Aceites Cosmetológicos", "Blend"],
  "brumas-almohada": [],
  "tratamientos": [],
  "balsamos": [],
};

const AROMATIZANTES_SUBITEMS: Record<string, string[]> = {
  "aromatizantes-ambientales": ["Hogar", "Textil", "Auto"],
  "difusores": [],
  "ropa": [],
  "esenciales": [],
};

const MEGA_MENU_SUBITEMS: Record<string, string[]> = {
  ...SKINCARE_SUBITEMS,
  ...BIENESTAR_SUBITEMS,
  ...AROMATIZANTES_SUBITEMS,
};

interface NavSubcategoria {
  id: string;
  nombre: string;
  slug: string;
}

interface NavCategoria {
  id: string;
  nombre: string;
  slug: string;
  subcategorias: NavSubcategoria[];
}

interface Props {
  navCategorias: NavCategoria[];
  showCatalogo?: boolean;
  showFaq?: boolean;
  showNosotros?: boolean;
  showQuickSearch?: boolean;
  showDolarWidget?: boolean;
  logoUrl?: string;
  customerUser?: { name: string; email: string } | null;
}

export default function Header(props: Props) {
  return (
    <Suspense>
      <HeaderContent {...props} />
    </Suspense>
  );
}

function HeaderContent({ navCategorias, showCatalogo = false, showFaq = true, showNosotros = true, showQuickSearch = true, showDolarWidget = false, logoUrl, customerUser }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [dropdownResults, setDropdownResults] = useState<Producto[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

  // Búsqueda en vivo a medida que se escribe (mismo criterio que el buscador del catálogo)
  useEffect(() => {
    if (busqueda.trim().length < 3) {
      setDropdownResults([]);
      setDropdownOpen(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchProductsInline(busqueda.trim());
      setDropdownResults(results);
      setDropdownOpen(results.length > 0);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  // Cerrar dropdown al hacer click afuera (desktop o mobile, el que esté visible)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideDesktop = searchContainerRef.current?.contains(target);
      const insideMobile = mobileSearchContainerRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("site-theme") as "dark" | "light" | null;
    const initial = stored ?? (document.documentElement.getAttribute("data-theme") as "dark" | "light") ?? "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("site-theme", next);
  }
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoriaActiva = searchParams.get("categoria");
  const router = useRouter();
  const { count, openDrawer } = useCart();
  const { open: openCatalogo } = useCatalogo();

  function openQuickSearch() {
    window.dispatchEvent(new Event("quick-search:open"));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!busqueda.trim()) return;
    startTransition(() => {
      router.push(`/buscar?q=${encodeURIComponent(busqueda.trim())}`);
    });
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-black border-b border-luxury-gray">
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex flex-col gap-3 lg:gap-4 pt-1 pb-4 md:pt-2 md:pb-6">
          {/* Fila superior: logo + utilidades */}
          <div className="flex items-center gap-3 lg:gap-5">
          {/* Logo */}
          <div className="shrink-0 py-2">
            <Link href="/">
              <Image
                src={logoUrl || (theme === "light" ? "/logo_transparent_light.png" : "/logo_transparent_dark.png")}
                alt="Logo"
                width={300}
                height={300}
                className="h-16 md:h-24 lg:h-28 w-auto object-contain transition-transform hover:scale-105"
                priority
              />
            </Link>
          </div>

          {/* Columna derecha */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Fila 1: Utilidades */}
            <div className="hidden md:flex items-center gap-4 border-b border-luxury-gray/50 pb-4">
              {/* Buscador */}
              <div ref={searchContainerRef} className="relative flex-1">
                <form onSubmit={handleSearch}>
                  <div className="flex items-center border border-luxury-gray-mid bg-luxury-gray/30 hover:border-gold/40 focus-within:border-gold/60 transition-colors px-3 py-1.5 gap-2">
                    {searching ? (
                      <Loader2 size={13} className="text-gold shrink-0 animate-spin" />
                    ) : (
                      <Search size={13} className="text-luxury-gray-light shrink-0" />
                    )}
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      onFocus={() => dropdownResults.length > 0 && setDropdownOpen(true)}
                      placeholder="Buscar productos..."
                      className="flex-1 bg-transparent text-white text-xs placeholder-[#555] focus:outline-none"
                    />
                  </div>
                </form>

                {/* Dropdown de resultados en vivo */}
                {dropdownOpen && dropdownResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-luxury-black border border-luxury-gray shadow-2xl shadow-black/80 divide-y divide-luxury-gray/50">
                    {dropdownResults.map((p) => (
                      <Link
                        key={p.id}
                        href={`/productos/${p.slug}`}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gold/5 transition-colors group"
                      >
                        <div className="w-10 h-10 shrink-0 bg-luxury-gray overflow-hidden">
                          <ProductImage src={p.imagen_url} alt={p.nombre} width={40} height={40} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate group-hover:text-gold transition-colors">{p.nombre}</p>
                          <p className="text-luxury-gray-light text-[11px]">{p.marca}</p>
                        </div>
                        {showDolarWidget ? (
                          <div className="shrink-0 text-right">
                            <PrecioUSD precioUsd={p.precio_venta} priceClassName="text-white text-sm font-semibold" />
                          </div>
                        ) : (
                          <p className="text-gold text-sm font-semibold shrink-0">{formatPrice(p.precio_venta)}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Links derecha */}
              <div className="flex items-center gap-5 shrink-0">
              {showCatalogo && (
                <button
                  onClick={openCatalogo}
                  className="text-[11px] tracking-[0.2em] text-luxury-gray-light hover:text-white transition-colors font-bold uppercase"
                >
                  Catálogo
                </button>
              )}
              {showNosotros && (
                <Link
                  href="/quienes-somos"
                  className={`text-[11px] tracking-[0.2em] transition-colors font-bold uppercase ${pathname === "/quienes-somos" ? "text-gold" : "text-luxury-gray-light hover:text-white"}`}
                >
                  Nosotros
                </Link>
              )}
              {showFaq && (
                <Link
                  href="/preguntas-frecuentes"
                  className={`text-[11px] tracking-[0.2em] transition-colors font-bold uppercase ${pathname === "/preguntas-frecuentes" ? "text-gold" : "text-luxury-gray-light hover:text-white"}`}
                >
                  Preguntas Frecuentes
                </Link>
              )}
              {customerUser ? (
                <Link
                  href="/cuenta"
                  className="text-[11px] tracking-[0.2em] text-gold hover:text-white transition-colors font-bold uppercase"
                >
                  Hola, {customerUser.name.split(" ")[0]}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="text-[11px] tracking-[0.2em] text-gold hover:text-white transition-colors font-bold uppercase"
                >
                  Iniciar Sesión
                </Link>
              )}
              <button
                onClick={toggleTheme}
                className="text-luxury-gray-light hover:text-gold transition-colors"
                title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
                aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              {showDolarWidget && <DolarWidget />}

              {/* Carrito */}
              <button
                onClick={openDrawer}
                aria-label="Ver carrito"
                className="relative text-white hover:text-gold transition-all flex items-center gap-1.5 group"
              >
                <div className="relative">
                  <ShoppingBag size={16} className="group-hover:scale-110 transition-transform" />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-gold text-black text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none border-2 border-black">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </div>
                <span className="text-[11px] tracking-widest font-medium uppercase">Carrito</span>
              </button>
              </div>
            </div>

            {/* Acciones mobile */}
            <div className="flex lg:hidden flex-1 justify-end items-center gap-4">
              <button
                onClick={openDrawer}
                aria-label="Ver carrito"
                className="relative text-white hover:text-gold transition-all p-1"
              >
                <div className="relative">
                  <ShoppingBag size={20} />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-gold text-black text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none border-2 border-black">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={toggleTheme}
                className="text-luxury-gray-light hover:text-gold transition-colors"
                aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                className="text-white hover:text-gold transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menú"
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
          </div>

          {/* Buscador mobile: siempre visible, fuera del menú hamburguesa */}
          <div ref={mobileSearchContainerRef} className="relative lg:hidden">
            <form onSubmit={handleSearch}>
              <div className="flex items-center border border-luxury-gray-mid bg-luxury-gray/30 focus-within:border-gold/60 transition-colors px-3 py-2 gap-2">
                {searching ? (
                  <Loader2 size={14} className="text-gold shrink-0 animate-spin" />
                ) : (
                  <Search size={14} className="text-luxury-gray-light shrink-0" />
                )}
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onFocus={() => dropdownResults.length > 0 && setDropdownOpen(true)}
                  placeholder="Buscar productos..."
                  className="flex-1 bg-transparent text-white text-xs placeholder-[#555] focus:outline-none"
                />
              </div>
            </form>

            {dropdownOpen && dropdownResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-luxury-black border border-luxury-gray shadow-2xl shadow-black/80 divide-y divide-luxury-gray/50">
                {dropdownResults.map((p) => (
                  <Link
                    key={p.id}
                    href={`/productos/${p.slug}`}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gold/5 transition-colors group"
                  >
                    <div className="w-10 h-10 shrink-0 bg-luxury-gray overflow-hidden">
                      <ProductImage src={p.imagen_url} alt={p.nombre} width={40} height={40} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate group-hover:text-gold transition-colors">{p.nombre}</p>
                      <p className="text-luxury-gray-light text-[11px]">{p.marca}</p>
                    </div>
                    {showDolarWidget ? (
                      <div className="shrink-0 text-right">
                        <PrecioUSD precioUsd={p.precio_venta} priceClassName="text-white text-sm font-semibold" />
                      </div>
                    ) : (
                      <p className="text-gold text-sm font-semibold shrink-0">{formatPrice(p.precio_venta)}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Fila categorías: ancho completo del header */}
          <div className="hidden lg:block border-t border-luxury-gray/30 pt-3">
            <nav className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-2 xl:gap-x-3">
              <Link
                href="/"
                className={`whitespace-nowrap text-sm tracking-wider transition-colors font-bold uppercase ${pathname === "/" ? "text-gold" : "text-white hover:text-gold"}`}
              >
                INICIO
              </Link>

              {navCategorias.map((cat) => (
                <div
                  key={cat.id}
                  className="relative shrink-0"
                  onMouseEnter={() => setOpenDropdown(cat.id)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <Link
                    href={`/productos?categoria=${cat.slug}`}
                    className={`flex items-center gap-1 whitespace-nowrap text-sm tracking-wider transition-colors font-bold uppercase ${categoriaActiva === cat.slug ? "text-gold" : "text-white hover:text-gold"}`}
                  >
                    {cat.nombre}
                    {cat.subcategorias.length > 0 && (
                      <ChevronDown size={12} className={`shrink-0 transition-transform ${openDropdown === cat.id ? "rotate-180" : ""}`} />
                    )}
                  </Link>

                  {openDropdown === cat.id && cat.subcategorias.length > 0 && (
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-4 z-50 ${cat.slug === "fragancias" || cat.subcategorias.some(s => s.slug in MEGA_MENU_SUBITEMS) ? "w-[280px]" : "w-[200px]"}`}>
                      <div className="bg-luxury-black border border-luxury-gray shadow-2xl shadow-black/80 p-5 flex flex-col gap-2">
                        {cat.subcategorias.some(s => s.slug in MEGA_MENU_SUBITEMS) ? (
                          cat.subcategorias.map((sub) => {
                            const subitems = MEGA_MENU_SUBITEMS[sub.slug] ?? [];
                            return (
                              <div key={sub.id} className="mt-1">
                                <Link
                                  href={`/productos?categoria=${cat.slug}&subcategoria=${sub.slug}`}
                                  className="block text-white font-serif font-light text-[15px] pb-1 mb-1 hover:text-(--color-nav-subcategory)! transition-colors"
                                >
                                  {sub.nombre}
                                </Link>
                                {subitems.map((item) => (
                                  <Link
                                    key={item}
                                    href={`/productos?categoria=${cat.slug}&subcategoria=${sub.slug}&tipo=${encodeURIComponent(item.toLowerCase())}`}
                                    className="block text-sm font-serif font-light text-[#cccccc] hover:text-(--color-nav-subcategory)! transition-colors py-1 pl-2"
                                  >
                                    {item}
                                  </Link>
                                ))}
                              </div>
                            );
                          })
                        ) : (
                          cat.subcategorias.map((sub) => (
                            <Link
                              key={sub.id}
                              href={`/productos?categoria=${cat.slug}&subcategoria=${sub.slug}`}
                              className="text-white font-serif font-light text-[15px] py-1 hover:text-(--color-nav-subcategory)! transition-colors block"
                            >
                              {sub.nombre}
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-luxury-black border-t border-luxury-gray px-4 py-6 max-h-[calc(100vh-96px)] overflow-y-auto overscroll-contain">
          <nav className="flex flex-col gap-4">
            <Link href="/" onClick={() => setMenuOpen(false)} className="text-sm tracking-wider text-white hover:text-gold transition-colors">
              INICIO
            </Link>

            {navCategorias.map((cat) => (
              <div key={cat.id} className="border-t border-luxury-gray-mid pt-4">
                <Link
                  href={`/productos?categoria=${cat.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="text-gold text-xs tracking-widest mb-3 uppercase font-bold block"
                >
                  {cat.nombre}
                </Link>
                {cat.subcategorias.length > 0 && (
                  <div className="flex flex-col gap-1 pl-2">
                    {cat.subcategorias.some(s => s.slug in MEGA_MENU_SUBITEMS) ? (
                      cat.subcategorias.map((sub) => {
                        const subitems = MEGA_MENU_SUBITEMS[sub.slug] ?? [];
                        return (
                          <div key={sub.id} className="mt-2">
                            <Link
                              href={`/productos?categoria=${cat.slug}&subcategoria=${sub.slug}`}
                              onClick={() => setMenuOpen(false)}
                              className="block text-white font-serif font-light text-[15px] pb-1 mb-1 hover:text-(--color-nav-subcategory)! transition-colors"
                            >
                              {sub.nombre}
                            </Link>
                            {subitems.map((item) => (
                              <Link
                                key={item}
                                href={`/productos?categoria=${cat.slug}&subcategoria=${sub.slug}&tipo=${encodeURIComponent(item.toLowerCase())}`}
                                onClick={() => setMenuOpen(false)}
                                className="block font-serif font-light text-sm text-[#cccccc] hover:text-(--color-nav-subcategory)! py-0.5 pl-2 transition-colors"
                              >
                                {item}
                              </Link>
                            ))}
                          </div>
                        );
                      })
                    ) : (
                      cat.subcategorias.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/productos?categoria=${cat.slug}&subcategoria=${sub.slug}`}
                          onClick={() => setMenuOpen(false)}
                          className="block font-serif font-light text-[15px] text-white hover:text-(--color-nav-subcategory)! py-1 transition-colors"
                        >
                          {sub.nombre}
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}

            {showCatalogo && (
              <button
                onClick={() => { setMenuOpen(false); openCatalogo(); }}
                className="text-sm tracking-wider text-white hover:text-gold transition-colors text-left border-t border-luxury-gray-mid pt-4"
              >
                CATÁLOGO
              </button>
            )}
            {showNosotros && (
              <Link
                href="/quienes-somos"
                onClick={() => setMenuOpen(false)}
                className={`text-sm tracking-wider transition-colors ${pathname === "/quienes-somos" ? "text-gold" : "text-white hover:text-gold"}`}
              >
                NOSOTROS
              </Link>
            )}
            {showFaq && (
              <Link
                href="/preguntas-frecuentes"
                onClick={() => setMenuOpen(false)}
                className={`text-sm tracking-wider transition-colors ${pathname === "/preguntas-frecuentes" ? "text-gold" : "text-white hover:text-gold"}`}
              >
                FAQ
              </Link>
            )}
            {customerUser ? (
              <Link
                href="/cuenta"
                onClick={() => setMenuOpen(false)}
                className="text-sm tracking-wider text-gold font-bold transition-colors"
              >
                HOLA, {customerUser.name.split(" ")[0].toUpperCase()}
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="text-sm tracking-wider text-gold font-bold transition-colors"
              >
                INICIAR SESIÓN
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
