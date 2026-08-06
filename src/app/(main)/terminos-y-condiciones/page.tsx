import type { Metadata } from 'next'
import { getLegalConfig } from '@/lib/site-config/getLegalConfig'
import LegalPageLayout from '@/components/legal/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y condiciones de uso y compra en nuestro sitio.',
}

export default async function TerminosPage() {
  const legal = await getLegalConfig()

  return (
    <LegalPageLayout
      title="Términos y Condiciones"
      subtitle="Condiciones generales de uso del sitio y de las compras realizadas."
    >
      {legal.terminos ? (
        <div
          className="rich-content text-white leading-relaxed"
          dangerouslySetInnerHTML={{ __html: legal.terminos }}
        />
      ) : (
        <p className="text-center text-[#555555]">Contenido próximamente.</p>
      )}
    </LegalPageLayout>
  )
}
