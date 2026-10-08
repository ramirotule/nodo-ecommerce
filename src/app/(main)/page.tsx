import Image from "next/image";
import { Construction } from "lucide-react";

export default function HomePage() {
  return (
    <main className="fixed inset-0 z-[9999] flex min-h-screen w-full items-center justify-center bg-white px-4">
      <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-4 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500 bg-blue-50 px-4 py-2 text-slate-900 shadow-sm">
            <Construction className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <span className="text-sm font-semibold tracking-wide uppercase">En construcción</span>
          </div>
        </div>
        <Image
          src="/images/mantenimiento-fondo.jpg"
          alt="Logo RAM Informatica"
          width={820}
          height={280}
          priority
          className="h-auto w-full max-w-[620px]"
        />
        <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
          Estamos actualizando la pagina para una mejor experiencia.
        </h1>
        <p className="mt-3 text-base text-slate-700 sm:text-lg">Disculpe las molestias.</p>
      </section>
    </main>
  );
}
