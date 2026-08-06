'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

interface Props {
  contactEmail: string
  razonSocial: string
}

export default function ArrepentimientoForm({ contactEmail, razonSocial }: Props) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [pedido, setPedido] = useState('')
  const [motivo, setMotivo] = useState('')

  const inputClass =
    'w-full bg-luxury-black border border-luxury-gray-mid text-white px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors placeholder-[#444444]'
  const labelClass = 'block text-luxury-gray-light text-xs uppercase tracking-wider mb-1.5'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contactEmail) return

    const subject = encodeURIComponent('Solicitud de Arrepentimiento — Ley 24.240')
    const body = encodeURIComponent(
      `Solicitud de arrepentimiento / revocación de compra\n\n` +
        `Nombre: ${nombre}\n` +
        `Email: ${email}\n` +
        `N° de pedido: ${pedido || 'No indicado'}\n\n` +
        `Motivo:\n${motivo}\n\n` +
        `---\n` +
        `Enviado desde el Botón de Arrepentimiento de ${razonSocial || 'el sitio web'}.`
    )
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`
  }

  if (!contactEmail) {
    return (
      <p className="text-amber-400 text-sm border border-amber-400/30 bg-amber-400/5 px-4 py-3">
        Configurá un email de contacto en el panel de administración para habilitar el formulario de arrepentimiento.
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 border border-luxury-gray bg-luxury-black p-6 space-y-4"
    >
      <h2 className="text-white text-sm font-bold tracking-wider uppercase mb-2">
        Formulario de arrepentimiento
      </h2>
      <p className="text-[#555555] text-xs mb-4">
        Completá tus datos. Se abrirá tu cliente de correo para enviar la solicitud a{' '}
        <span className="text-luxury-gray-light">{contactEmail}</span>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="arrep-nombre">
            Nombre completo *
          </label>
          <input
            id="arrep-nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="arrep-email">
            Email *
          </label>
          <input
            id="arrep-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="arrep-pedido">
          N° de pedido (opcional)
        </label>
        <input
          id="arrep-pedido"
          value={pedido}
          onChange={(e) => setPedido(e.target.value)}
          className={inputClass}
          placeholder="Ej: 1234"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="arrep-motivo">
          Motivo de la solicitud *
        </label>
        <textarea
          id="arrep-motivo"
          required
          rows={4}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className={`${inputClass} resize-y min-h-[100px]`}
          placeholder="Describí brevemente el motivo de tu solicitud de arrepentimiento o devolución."
        />
      </div>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gold text-black font-bold px-6 py-3 text-sm tracking-wider uppercase hover:bg-gold-light transition-colors"
      >
        <Send size={16} />
        Enviar solicitud
      </button>
    </form>
  )
}
