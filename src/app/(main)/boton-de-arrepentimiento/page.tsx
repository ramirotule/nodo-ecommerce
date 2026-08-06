import type { Metadata } from 'next'
import { getLegalConfig } from '@/lib/site-config/getLegalConfig'
import { getSiteConfig } from '@/lib/site-config/getSiteConfig'
import LegalPageLayout from '@/components/legal/LegalPageLayout'
import ArrepentimientoForm from '@/components/legal/ArrepentimientoForm'

export const metadata: Metadata = {
  title: 'Botón de Arrepentimiento',
  description: 'Ejercé tu derecho de arrepentimiento conforme la Ley 24.240 y Resolución 424/2020.',
}

export default async function ArrepentimientoPage() {
  const [legal, siteConfig] = await Promise.all([getLegalConfig(), getSiteConfig()])

  return (
    <LegalPageLayout
      title="Botón de Arrepentimiento"
      subtitle="Resolución 424/2020 — Secretaría de Comercio Interior. Derecho de revocación de la aceptación dentro de los 10 días corridos."
    >
      {legal.arrepentimiento ? (
        <div
          className="rich-content text-white leading-relaxed"
          dangerouslySetInnerHTML={{ __html: legal.arrepentimiento }}
        />
      ) : (
        <p className="text-center text-[#555555]">Contenido próximamente.</p>
      )}

      <ArrepentimientoForm
        contactEmail={siteConfig.contact_email}
        razonSocial={legal.razon_social}
      />
    </LegalPageLayout>
  )
}
