import type { Metadata } from 'next'
import { getLegalConfig } from '@/lib/site-config/getLegalConfig'
import LegalPageLayout from '@/components/legal/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Política de Cambios y Devoluciones',
  description: 'Política de cambios, devoluciones y reintegros.',
}

export default async function DevolucionesPage() {
  const legal = await getLegalConfig()

  return (
    <LegalPageLayout
      title="Política de Cambios y Devoluciones"
      subtitle="Información sobre cambios, devoluciones y reintegros conforme la Ley de Defensa del Consumidor."
    >
      {legal.devoluciones ? (
        <div
          className="rich-content text-white leading-relaxed"
          dangerouslySetInnerHTML={{ __html: legal.devoluciones }}
        />
      ) : (
        <p className="text-center text-[#555555]">Contenido próximamente.</p>
      )}
    </LegalPageLayout>
  )
}
