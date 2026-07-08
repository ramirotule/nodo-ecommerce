import { Metadata } from "next";
import FlipBookWrapper from "@/components/catalogo/FlipBookWrapper";

export const metadata: Metadata = {
  title: "Catálogo Digital | Mi Tienda",
  description:
    "Explorá nuestro catálogo digital de fragancias de lujo. Perfumes exclusivos.",
  alternates: { canonical: "/catalogo" },
};

// Agregá tus imágenes en /public/catalogo/ y listálas aquí.
// El orden define el orden de las páginas del libro.
const CATALOG_PAGES = [
  { src: "/catalogo/portada.png", alt: "Portada — Mi Tienda" },
  { src: "/catalogo/pagina-02.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-03.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-04.png", alt: "Femeninas Femeninas" },
  { src: "/catalogo/pagina-05.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-06.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-07.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-08.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-09.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-10.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-11.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-12.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-13.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-14.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-15.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-16.png", alt: "Fragancias Femeninas" },
  { src: "/catalogo/pagina-17.png", alt: "Fragancias Masculinas" },
  { src: "/catalogo/pagina-18.png", alt: "Fragancias Masculinas" },
  { src: "/catalogo/pagina-19.png", alt: "Fragancias Masculinas" },
  { src: "/catalogo/pagina-20.png", alt: "Fragancias Masculinas" },
  { src: "/catalogo/pagina-21.png", alt: "Fragancias Masculinas" },
  { src: "/catalogo/pagina-22.png", alt: "Fragancias Masculinas" },
  { src: "/catalogo/pagina-23.png", alt: "Fragancias Masculinas" },
  { src: "/catalogo/pagina-24.png", alt: "Fragancias Masculinas" },
  { src: "/catalogo/pagina-25.png", alt: "Fragancias Masculinas" },
  { src: "/catalogo/pagina-26.png", alt: "Fragancias Masculinas" },
  { src: "/catalogo/pagina-27.png", alt: "Fragancias Masculinas" },
  { src: "/catalogo/pagina-28.png", alt: "Fragancias Masculinas" },
  { src: "/catalogo/pagina-29.png", alt: "Fragancias Árabes" },
  { src: "/catalogo/pagina-30.png", alt: "Fragancias Árabes" },
  { src: "/catalogo/pagina-31.png", alt: "Fragancias Árabes" },
  { src: "/catalogo/pagina-32.png", alt: "Eau de Toilette" },
  { src: "/catalogo/pagina-33.png", alt: "Eau de Toilette" },
  { src: "/catalogo/pagina-34.png", alt: "Eau de Toilette" },
];

export default function CatalogoPage() {
  return (
    <main className="min-h-screen bg-black py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-xs tracking-[0.5em] uppercase mb-4">
            Mi Tienda
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-white mb-4">
            Catálogo Digital
          </h1>
          <p className="text-gray-500 text-sm">
            Pasá las páginas para explorar nuestra colección completa
          </p>
        </div>

        {/* Flip Book */}
        <FlipBookWrapper pages={CATALOG_PAGES} />

        {/* Hint */}
        <p className="text-center text-gray-700 text-xs mt-10 tracking-wider">
          Hacé clic en los bordes de la página o usá las flechas para navegar
        </p>
      </div>
    </main>
  );
}
