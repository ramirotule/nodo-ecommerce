import { createClient } from '@/lib/supabase/server'
import { PRODUCTS_TABLE } from '@/lib/supabase/tables'
import ImagenesManager from '@/components/dashboard/ImagenesManager'

export default async function ImagenesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from(PRODUCTS_TABLE)
    .select('id, nombre, marca, slug, imagen_url, imagenes_adicionales, activo')
    .order('nombre', { ascending: true })

  return <ImagenesManager productos={data ?? []} />
}
