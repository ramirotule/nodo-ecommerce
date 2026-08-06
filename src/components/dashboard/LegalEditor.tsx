'use client'

import { useState } from 'react'
import { Save, Scale } from 'lucide-react'
import toast from 'react-hot-toast'
import { saveSiteConfig } from '@/app/dashboard/configuracion-sitio/actions'
import RichTextEditor from '@/components/ui/RichTextEditor'
import type { LegalConfig } from '@/lib/site-config/getLegalConfig'

interface Props {
  initial: LegalConfig
}

const inputClass =
  'w-full bg-[#111111] border border-luxury-gray-mid text-white px-3 py-2 text-sm focus:outline-none focus:border-gold transition-colors placeholder-[#444444]'
const labelClass = 'block text-luxury-gray-light text-xs uppercase tracking-wider mb-1.5'

export default function LegalEditor({ initial }: Props) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)

  function setField<K extends keyof LegalConfig>(key: K, value: LegalConfig[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    const result = await saveSiteConfig({
      legal_razon_social: form.razon_social,
      legal_cuit: form.cuit,
      legal_data_fiscal_url: form.data_fiscal_url,
      legal_terminos: form.terminos,
      legal_devoluciones: form.devoluciones,
      legal_arrepentimiento: form.arrepentimiento,
    })
    setSaving(false)
    if (result.success) {
      toast.success('Información legal guardada.')
    } else {
      toast.error(result.error ?? 'Error al guardar.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-luxury-black border border-luxury-gray">
        <div className="px-5 py-4 border-b border-luxury-gray flex items-center gap-2">
          <Scale size={14} className="text-gold" />
          <h2 className="text-gold text-xs tracking-[0.2em] uppercase">Datos del titular</h2>
        </div>
        <div className="px-5 py-5 space-y-5">
          <p className="text-[#555555] text-xs">
            Razón social y CUIT se muestran en el footer. Data Fiscal enlaza a la validación AFIP.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Razón social</label>
              <input
                type="text"
                value={form.razon_social}
                onChange={(e) => setField('razon_social', e.target.value)}
                className={inputClass}
                placeholder="Ej: Mi Empresa S.A."
              />
            </div>
            <div>
              <label className={labelClass}>CUIT</label>
              <input
                type="text"
                value={form.cuit}
                onChange={(e) => setField('cuit', e.target.value)}
                className={inputClass}
                placeholder="Ej: 30-12345678-9"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>URL Data Fiscal (AFIP)</label>
            <input
              type="url"
              value={form.data_fiscal_url}
              onChange={(e) => setField('data_fiscal_url', e.target.value)}
              className={inputClass}
              placeholder="https://..."
            />
            <p className="text-[#555555] text-xs mt-1.5">
              Obtené la URL desde el programa Data Fiscal de AFIP. Se muestra como enlace en el footer.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-luxury-black border border-luxury-gray">
        <div className="px-5 py-4 border-b border-luxury-gray">
          <h2 className="text-gold text-xs tracking-[0.2em] uppercase">Términos y Condiciones</h2>
        </div>
        <div className="px-5 py-5">
          <p className="text-[#555555] text-xs mb-4">Página pública: /terminos-y-condiciones</p>
          <RichTextEditor
            value={form.terminos}
            onChange={(v) => setField('terminos', v)}
            minHeight="240px"
          />
        </div>
      </section>

      <section className="bg-luxury-black border border-luxury-gray">
        <div className="px-5 py-4 border-b border-luxury-gray">
          <h2 className="text-gold text-xs tracking-[0.2em] uppercase">Política de Cambios y Devoluciones</h2>
        </div>
        <div className="px-5 py-5">
          <p className="text-[#555555] text-xs mb-4">Página pública: /politica-de-cambios-y-devoluciones</p>
          <RichTextEditor
            value={form.devoluciones}
            onChange={(v) => setField('devoluciones', v)}
            minHeight="240px"
          />
        </div>
      </section>

      <section className="bg-luxury-black border border-luxury-gray">
        <div className="px-5 py-4 border-b border-luxury-gray">
          <h2 className="text-gold text-xs tracking-[0.2em] uppercase">Botón de Arrepentimiento</h2>
        </div>
        <div className="px-5 py-5">
          <p className="text-[#555555] text-xs mb-4">
            Página pública: /boton-de-arrepentimiento — Res. 424/2020. El formulario envía al email de contacto configurado.
          </p>
          <RichTextEditor
            value={form.arrepentimiento}
            onChange={(v) => setField('arrepentimiento', v)}
            minHeight="200px"
          />
        </div>
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-gold text-black font-bold px-6 py-3 text-sm tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50"
      >
        {saving ? (
          <>
            <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Save size={16} />
            Guardar información legal
          </>
        )}
      </button>
    </div>
  )
}
