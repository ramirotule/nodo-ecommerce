"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, X, ChevronDown, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCatalogo } from "@/context/CatalogoContext";
import { SITE_CONFIG } from "@/constants/site";

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
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} width="20" height="20">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function Header({ navCategorias }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [, startTransition] = useTransition();
  const pathname = usePathname();
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
        <div className="flex items-center gap-12 lg:gap-20 pt-1 pb-6 md:pt-2 md:pb-8">
          {/* Logo */}
          <div className="shrink-0 py-2">
            <Link href="/">
              <Image
                src="/logo2.png"
                alt="Logo"
                width={300}
                height={300}
                className="h-20 md:h-32 lg:h-44 w-auto object-contain transition-transform hover:scale-105"
                priority
              />
            </Link>
          </div>

          {/* Columna derecha */}
          <div className="flex-1 flex flex-col gap-6 xl:gap-8">
            {/* Fila 1: Utilidades */}
            <div className="hidden md:flex items-center justify-end gap-6 border-b border-luxury-gray/50 pb-4">
              <Link
                href={SITE_CONFIG.contact.phone ? `https://wa.me/${SITE_CONFIG.contact.phone}?text=${encodeURIComponent(SITE_CONFIG.contact.emprenderMsg)}` : "#"}
                target={SITE_CONFIG.contact.phone ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="text-[11px] tracking-[0.2em] text-gold hover:text-white transition-colors font-bold uppercase flex items-center gap-2 group"
              >
                <WhatsAppIcon className="w-3 h-3 transition-transform group-hover:scale-110" />
                Contacto
              </Link>
              <button
                onClick={openCatalogo}
                className="text-[11px] tracking-[0.2em] text-luxury-gray-light hover:text-white transition-colors font-bold uppercase"
              >
                Catálogo
              </button>
              <Link
                href="/quienes-somos"
                className={`text-[11px] tracking-[0.2em] transition-colors font-bold uppercase ${pathname === "/quienes-somos" ? "text-gold" : "text-luxury-gray-light hover:text-white"}`}
              >
                Nosotros
              </Link>
              <Link
                href="/preguntas-frecuentes"
                className={`text-[11px] tracking-[0.2em] transition-colors font-bold uppercase ${pathname === "/preguntas-frecuentes" ? "text-gold" : "text-luxury-gray-light hover:text-white"}`}
              >
                Preguntas Frecuentes
              </Link>
              <Link
                href="/login"
                className="text-[11px] tracking-[0.2em] text-gold border border-gold/50 px-3 py-1 rounded hover:bg-gold hover:text-black transition-all font-bold uppercase"
              >
                Acceso Emprendedores
              </Link>
            </div>

            {/* Fila 2: Navegación + Acciones */}
            <div className="flex items-center justify-between">
              {/* Nav Desktop */}
              <nav className="hidden lg:flex items-center gap-x-6 xl:gap-x-10">
                <Link
                  href="/"
                  className={`text-xs tracking-[0.2em] transition-colors font-bold uppercase ${pathname === "/" ? "text-gold" : "text-white hover:text-gold"}`}
                >
                  INICIO
                </Link>

                {navCategorias.map((cat) => (
                  <div
                    key={cat.id}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(cat.id)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      onClick={() => setOpenDropdown(openDropdown === cat.id ? null : cat.id)}
                      className="flex items-center gap-1.5 text-xs tracking-[0.2em] text-white hover:text-gold transition-colors font-bold uppercase"
                    >
                      {cat.nombre}
                      {cat.subcategorias.length > 0 && (
                        <ChevronDown size={12} className={`transition-transform ${openDropdown === cat.id ? "rotate-180" : ""}`} />
                      )}
                    </button>

                    {openDropdown === cat.id && cat.subcategorias.length > 0 && (
                      <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-4 z-50 ${cat.slug === "fragancias" || cat.subcategorias.some(s => s.slug in MEGA_MENU_SUBITEMS) ? "w-[280px]" : "w-[200px]"}`}>
                        <div className="bg-luxury-black border border-luxury-gray shadow-2xl shadow-black/80 p-5 flex flex-col gap-2">
                          <Link
                            href={`/productos?categoria=${cat.slug}`}
                            className="text-[#715F24] text-xs font-bold tracking-[0.2em] uppercase border-b border-luxury-gray-mid pb-2 mb-1 hover:text-gold transition-colors block"
                          >
                            VER TODO
                          </Link>

                          {cat.subcategorias.some(s => s.slug in MEGA_MENU_SUBITEMS) ? (
                            cat.subcategorias.map((sub) => {
                              const subitems = MEGA_MENU_SUBITEMS[sub.slug] ?? [];
                              return (
                                <div key={sub.id} className="mt-1">
                                  <Link
                                    href={`/productos?categoria=${cat.slug}&subcategoria=${sub.slug}`}
                                    className="block text-[#715F24] text-xs font-bold tracking-[0.2em] uppercase border-b border-luxury-gray-mid pb-1 mb-2 hover:text-gold transition-colors"
                                  >
                                    {sub.nombre}
                                  </Link>
                                  {subitems.map((item) => (
                                    <Link
                                      key={item}
                                      href={`/productos?categoria=${cat.slug}&subcategoria=${sub.slug}&tipo=${encodeURIComponent(item.toLowerCase())}`}
                                      className="block text-xs text-[#cccccc] hover:text-gold transition-colors py-1 pl-2"
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
                                className="text-[#715F24] text-xs font-bold tracking-[0.2em] uppercase border-b border-luxury-gray-mid pb-1 hover:text-gold transition-colors block"
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

              {/* Acciones */}
              <div className="flex flex-1 justify-end items-center gap-4 xl:gap-6">
                <button
                  onClick={openQuickSearch}
                  className="hidden md:flex items-center gap-2 border border-gold/40 bg-gold/5 hover:bg-gold/10 px-3 py-1.5 transition-colors group"
                  aria-label="Búsqueda rápida"
                >
                  <Search size={13} className="text-gold" />
                  <span className="text-[11px] font-mono text-luxury-gray-light group-hover:text-[#aaa] transition-colors">Búsqueda rápida</span>
                  <kbd className="px-1.5 py-0.5 border border-gold/60 rounded text-gold bg-gold/10 text-[11px] font-mono animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.3)]">
                    ctrl+K
                  </kbd>
                </button>

                <button
                  onClick={openDrawer}
                  aria-label="Ver carrito"
                  className="relative text-white hover:text-gold transition-all flex items-center gap-2 group p-1"
                >
                  <div className="relative">
                    <ShoppingBag size={20} className="group-hover:scale-110 transition-transform" />
                    {count > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-gold text-black text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none border-2 border-black">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] tracking-widest font-medium uppercase hidden xl:inline">Carrito</span>
                </button>

                <button
                  className="lg:hidden text-white hover:text-gold transition-colors shrink-0"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Menú"
                >
                  {menuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-luxury-black border-t border-luxury-gray px-4 py-6">
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
                              className="block text-gold text-[10px] font-bold tracking-[0.2em] uppercase border-b border-luxury-gray-mid pb-1 mb-1 hover:opacity-80 transition-opacity"
                            >
                              {sub.nombre}
                            </Link>
                            {subitems.map((item) => (
                              <Link
                                key={item}
                                href={`/productos?categoria=${cat.slug}&subcategoria=${sub.slug}&tipo=${encodeURIComponent(item.toLowerCase())}`}
                                onClick={() => setMenuOpen(false)}
                                className="block text-xs text-[#cccccc] hover:text-gold py-0.5 pl-2 transition-colors"
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
                          className="block text-xs text-[#cccccc] hover:text-gold py-1 transition-colors"
                        >
                          {sub.nombre}
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => { setMenuOpen(false); openCatalogo(); }}
              className="text-sm tracking-wider text-white hover:text-gold transition-colors text-left border-t border-luxury-gray-mid pt-4"
            >
              CATÁLOGO
            </button>
            <Link
              href="/quienes-somos"
              onClick={() => setMenuOpen(false)}
              className={`text-sm tracking-wider transition-colors ${pathname === "/quienes-somos" ? "text-gold" : "text-white hover:text-gold"}`}
            >
              NOSOTROS
            </Link>
            <Link
              href="/preguntas-frecuentes"
              onClick={() => setMenuOpen(false)}
              className={`text-sm tracking-wider transition-colors ${pathname === "/preguntas-frecuentes" ? "text-gold" : "text-white hover:text-gold"}`}
            >
              FAQ
            </Link>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="text-sm tracking-wider text-gold font-bold transition-colors"
            >
              INGRESAR (EMPRENDEDORES)
            </Link>

            <div className="border-t border-luxury-gray-mid pt-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar..."
                  className="flex-1 bg-luxury-gray border border-luxury-gray-mid text-white px-3 py-2 text-sm focus:outline-none focus:border-gold"
                />
                <button type="submit" className="px-3 py-2 bg-gold text-black">
                  <Search size={16} />
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
