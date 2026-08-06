import { cacheTag, cacheLife } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

export interface LegalConfig {
  razon_social: string
  cuit: string
  data_fiscal_url: string
  terminos: string
  devoluciones: string
  arrepentimiento: string
}

const KEYS = [
  'legal_razon_social',
  'legal_cuit',
  'legal_data_fiscal_url',
  'legal_terminos',
  'legal_devoluciones',
  'legal_arrepentimiento',
] as const

const DEFAULT_TERMINOS = `<p>Al utilizar este sitio web y realizar compras, aceptás estos Términos y Condiciones conforme la Ley de Defensa del Consumidor N° 24.240 y normativa complementaria.</p>
<h3>1. Identificación del vendedor</h3>
<p>El titular de este sitio es el responsable de las operaciones comerciales aquí ofrecidas. Los datos identificatorios (razón social y CUIT) se encuentran publicados al pie de página.</p>
<h3>2. Productos y precios</h3>
<p>Los precios publicados están expresados en pesos argentinos e incluyen IVA salvo indicación contraria. Nos reservamos el derecho de modificar precios, disponibilidad y descripciones sin previo aviso.</p>
<h3>3. Proceso de compra</h3>
<p>La compra se perfecciona cuando recibimos tu pedido y te enviamos la confirmación por los medios de contacto indicados. Nos reservamos el derecho de cancelar pedidos por errores de stock, precio o datos incorrectos.</p>
<h3>4. Medios de pago</h3>
<p>Los medios de pago habilitados se informan durante el checkout. El pago debe acreditarse para que el pedido sea procesado.</p>
<h3>5. Entrega</h3>
<p>Los plazos y costos de envío se informan antes de confirmar la compra. Los plazos son estimados y pueden variar por causas ajenas a nuestra voluntad.</p>
<h3>6. Derecho de arrepentimiento</h3>
<p>Podés ejercer el derecho de arrepentimiento dentro de los 10 días corridos desde la recepción del producto o la celebración del contrato, según corresponda, mediante el <a href="/boton-de-arrepentimiento">Botón de Arrepentimiento</a>.</p>
<h3>7. Protección de datos</h3>
<p>Los datos personales se utilizan únicamente para procesar pedidos y comunicaciones relacionadas con tu compra, conforme la normativa vigente.</p>
<h3>8. Jurisdicción</h3>
<p>Para cualquier controversia, serán competentes los tribunales ordinarios con asiento en la República Argentina, sin perjuicio de tus derechos como consumidor.</p>`

const DEFAULT_DEVOLUCIONES = `<p>Esta política complementa tus derechos como consumidor bajo la Ley N° 24.240.</p>
<h3>Cambios</h3>
<p>Los cambios por talle, modelo o preferencia personal pueden gestionarse dentro de los 10 días corridos desde la recepción, siempre que el producto se encuentre sin uso, con etiquetas y en su empaque original.</p>
<h3>Devoluciones</h3>
<p>Podés solicitar la devolución del producto dentro del plazo legal de arrepentimiento (10 días corridos) o cuando el producto presente fallas o no corresponda con lo ofrecido.</p>
<h3>Condiciones</h3>
<ul>
<li>El producto debe estar sin uso y en perfecto estado.</li>
<li>Debe conservar etiquetas, empaque original y accesorios.</li>
<li>Los costos de envío por devolución sin causa imputable al vendedor pueden ser a cargo del comprador.</li>
</ul>
<h3>Reintegros</h3>
<p>Una vez recibido y verificado el producto, el reintegro se realizará por el mismo medio de pago utilizado, dentro de los plazos legales aplicables.</p>
<h3>Cómo iniciar un trámite</h3>
<p>Contactanos por el <a href="/boton-de-arrepentimiento">Botón de Arrepentimiento</a> o por los canales de atención publicados en el sitio, indicando número de pedido y motivo.</p>`

const DEFAULT_ARREPENTIMIENTO = `<p>De acuerdo con el artículo 34 de la Ley de Defensa del Consumidor N° 24.240 y la Resolución 424/2020 de la Secretaría de Comercio Interior, tenés derecho a revocar la aceptación de la compra dentro de los <strong>10 días corridos</strong> contados desde:</p>
<ul>
<li>La entrega del producto, o</li>
<li>La celebración del contrato, si se trata de servicios o productos digitales.</li>
</ul>
<p>Para ejercer este derecho, completá el formulario de esta página o escribinos por los medios de contacto indicados. Indicá tu nombre, email, número de pedido (si lo tenés) y el motivo de la solicitud.</p>
<p>El producto debe devolverse sin uso, en su empaque original y con todos sus accesorios. Una vez recibido, procederemos al reintegro conforme la normativa vigente.</p>`

const DEFAULTS: LegalConfig = {
  razon_social: '',
  cuit: '',
  data_fiscal_url: '',
  terminos: DEFAULT_TERMINOS,
  devoluciones: DEFAULT_DEVOLUCIONES,
  arrepentimiento: DEFAULT_ARREPENTIMIENTO,
}

const KEY_MAP: Record<(typeof KEYS)[number], keyof LegalConfig> = {
  legal_razon_social: 'razon_social',
  legal_cuit: 'cuit',
  legal_data_fiscal_url: 'data_fiscal_url',
  legal_terminos: 'terminos',
  legal_devoluciones: 'devoluciones',
  legal_arrepentimiento: 'arrepentimiento',
}

export async function getLegalConfig(): Promise<LegalConfig> {
  'use cache'
  cacheTag('legal-config')
  cacheLife('hours')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase
      .from('configuracion')
      .select('clave, valor')
      .in('clave', KEYS)

    if (error || !data) return DEFAULTS

    const result = { ...DEFAULTS }
    for (const row of data) {
      const mapped = KEY_MAP[row.clave as (typeof KEYS)[number]]
      if (mapped && row.valor) {
        result[mapped] = row.valor
      }
    }
    return result
  } catch {
    return DEFAULTS
  }
}
