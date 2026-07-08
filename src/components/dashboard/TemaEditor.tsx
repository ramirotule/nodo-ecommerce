'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Save, RotateCcw, X, Palette, Globe, Layout } from 'lucide-react'
import { ThemeConfig, THEME_DEFAULTS } from '@/lib/theme/defaults'
import { saveThemeConfig, uploadBrandingAsset } from '@/app/dashboard/tema/actions'

interface TemaEditorProps {
  initialConfig: ThemeConfig
}

// Map from ThemeConfig flat key to CSS variable name
const COLOR_VAR_MAP: Record<string, string> = {
  color_primary: '--color-gold',
  color_primary_light: '--color-gold-light',
  color_primary_dark: '--color-gold-dark',
  color_bg: '--color-luxury-black',
  color_surface: '--color-luxury-gray',
  color_text: '--color-text',
}

const COLOR_FIELDS: Array<{ key: keyof ThemeConfig; label: string; cssVar: string }> = [
  { key: 'color_primary', label: 'Color principal (dorado)', cssVar: '--color-gold' },
  { key: 'color_primary_light', label: 'Color principal claro', cssVar: '--color-gold-light' },
  { key: 'color_primary_dark', label: 'Color principal oscuro', cssVar: '--color-gold-dark' },
  { key: 'color_bg', label: 'Color de fondo', cssVar: '--color-luxury-black' },
  { key: 'color_surface', label: 'Color de superficie', cssVar: '--color-luxury-gray' },
  { key: 'color_text', label: 'Color de texto', cssVar: '--color-text' },
]

const NAV_MODULES: Array<{ slug: string; label: string }> = [
  { slug: 'productos', label: 'Productos' },
  { slug: 'carrousel', label: 'Carrusel de imágenes' },
  { slug: 'pedidos', label: 'Pedidos' },
  { slug: 'categorias', label: 'Categorías' },
  { slug: 'datos-bancarios', label: 'Datos Bancarios' },
  { slug: 'mis-datos', label: 'Mis Datos' },
  { slug: 'tema', label: 'Editor de Tema' },
]

const inputClass =
  'w-full bg-[#111111] border border-luxury-gray-mid text-white px-3 py-2 text-sm focus:outline-none focus:border-gold transition-colors placeholder-[#444444]'
const labelClass = 'block text-luxury-gray-light text-xs uppercase tracking-wider mb-1.5'

export default function TemaEditor({ initialConfig }: TemaEditorProps) {
  // Form state (flat ThemeConfig keys)
  const [colors, setColors] = useState<Record<string, string>>(() => ({
    color_primary: initialConfig.color_primary,
    color_primary_light: initialConfig.color_primary_light,
    color_primary_dark: initialConfig.color_primary_dark,
    color_bg: initialConfig.color_bg,
    color_surface: initialConfig.color_surface,
    color_text: initialConfig.color_text,
  }))

  const [siteName, setSiteName] = useState<string>(initialConfig.site_name)
  const [siteTagline, setSiteTagline] = useState<string>(initialConfig.site_tagline)
  const [logoUrl, setLogoUrl] = useState<string>(initialConfig.logo_url)
  const [faviconUrl, setFaviconUrl] = useState<string>(initialConfig.favicon_url)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [logoError, setLogoError] = useState('')
  const [faviconError, setFaviconError] = useState('')

  // Nav modules enabled — parse from JSON string
  const [navModules, setNavModules] = useState<string[]>(() => {
    try {
      return JSON.parse(initialConfig.nav_modules_enabled) as string[]
    } catch {
      return NAV_MODULES.map((m) => m.slug)
    }
  })

  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)

  // Store original CSS var values on mount for revert
  const originalCssVars = useRef<Record<string, string>>({})

  useEffect(() => {
    COLOR_FIELDS.forEach(({ cssVar }) => {
      originalCssVars.current[cssVar] =
        getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
    })
    // Apply initial config values as live preview on mount
    Object.entries(COLOR_VAR_MAP).forEach(([key, cssVar]) => {
      const value = initialConfig[key as keyof ThemeConfig]
      if (value) {
        document.documentElement.style.setProperty(cssVar, value)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleColorChange(key: string, value: string) {
    setColors((prev) => ({ ...prev, [key]: value }))
    const cssVar = COLOR_VAR_MAP[key]
    if (cssVar) {
      document.documentElement.style.setProperty(cssVar, value)
    }
  }

  function handleResetDefaults() {
    const defaultColors: Record<string, string> = {
      color_primary: THEME_DEFAULTS.color_primary,
      color_primary_light: THEME_DEFAULTS.color_primary_light,
      color_primary_dark: THEME_DEFAULTS.color_primary_dark,
      color_bg: THEME_DEFAULTS.color_bg,
      color_surface: THEME_DEFAULTS.color_surface,
      color_text: THEME_DEFAULTS.color_text,
    }
    setColors(defaultColors)
    Object.entries(COLOR_VAR_MAP).forEach(([key, cssVar]) => {
      const value = defaultColors[key]
      if (value) document.documentElement.style.setProperty(cssVar, value)
    })
    toast('Valores restaurados a los predeterminados. Guardá para aplicar.', { icon: '↩' })
  }

  function handleCancel() {
    // Revert CSS vars to original computed values
    Object.entries(originalCssVars.current).forEach(([cssVar, value]) => {
      if (value) document.documentElement.style.setProperty(cssVar, value)
    })
    setColors({
      color_primary: initialConfig.color_primary,
      color_primary_light: initialConfig.color_primary_light,
      color_primary_dark: initialConfig.color_primary_dark,
      color_bg: initialConfig.color_bg,
      color_surface: initialConfig.color_surface,
      color_text: initialConfig.color_text,
    })
    setSiteName(initialConfig.site_name)
    setSiteTagline(initialConfig.site_tagline)
    setLogoFile(null)
    setFaviconFile(null)
    setLogoError('')
    setFaviconError('')
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoError('El archivo debe ser una imagen válida (PNG, JPG, SVG, WebP).')
      e.target.value = ''
      return
    }
    setLogoError('')
    setLogoFile(file)
  }

  function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFaviconError('El archivo debe ser una imagen válida (PNG, ICO, SVG).')
      e.target.value = ''
      return
    }
    setFaviconError('')
    setFaviconFile(file)
  }

  async function handleUploadLogo() {
    if (!logoFile) return
    setUploadingLogo(true)
    const fd = new FormData()
    fd.append('file', logoFile)
    const result = await uploadBrandingAsset(fd, 'logo_url')
    setUploadingLogo(false)
    if (result.success && result.url) {
      setLogoUrl(result.url)
      setLogoFile(null)
      toast.success('Logo actualizado correctamente.')
    } else {
      toast.error(result.error ?? 'Error al subir el logo.')
    }
  }

  async function handleUploadFavicon() {
    if (!faviconFile) return
    setUploadingFavicon(true)
    const fd = new FormData()
    fd.append('file', faviconFile)
    const result = await uploadBrandingAsset(fd, 'favicon_url')
    setUploadingFavicon(false)
    if (result.success && result.url) {
      setFaviconUrl(result.url)
      setFaviconFile(null)
      toast.success('Favicon actualizado correctamente.')
    } else {
      toast.error(result.error ?? 'Error al subir el favicon.')
    }
  }

  function toggleNavModule(slug: string) {
    setNavModules((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  async function handleSave() {
    setSaving(true)
    const partial: Partial<ThemeConfig> = {
      ...colors,
      site_name: siteName,
      site_tagline: siteTagline,
      nav_modules_enabled: JSON.stringify(navModules),
    } as Partial<ThemeConfig>

    const result = await saveThemeConfig(partial)
    setSaving(false)

    if (result.success) {
      toast.success('Cambios guardados correctamente.')
    } else {
      toast.error(result.error ?? 'Error al guardar los cambios.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-gold text-xs tracking-[0.3em] uppercase mb-1">Dashboard</p>
        <h1 className="text-white text-2xl font-serif">Editor de Tema</h1>
        <p className="text-[#555555] text-sm mt-1">
          Personalizá los colores, la identidad visual y la navegación del sitio.
        </p>
      </div>

      {/* ===== SECCIÓN: COLORES ===== */}
      <section className="bg-luxury-black border border-luxury-gray">
        <div className="px-5 py-4 border-b border-luxury-gray flex items-center gap-2">
          <Palette size={14} className="text-gold" />
          <h2 className="text-gold text-xs tracking-[0.2em] uppercase">Colores de Marca</h2>
        </div>
        <div className="px-5 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COLOR_FIELDS.map(({ key, label }) => {
              const value = colors[key as string] ?? '#000000'
              return (
                <div key={key} className="space-y-2">
                  <label className={labelClass}>{label}</label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded border border-luxury-gray-mid shrink-0"
                      style={{ backgroundColor: value }}
                    />
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => handleColorChange(key as string, e.target.value)}
                      className="w-10 h-8 cursor-pointer bg-transparent border-0 p-0"
                      title={label}
                    />
                    <span className="text-luxury-gray-light text-xs font-mono uppercase">{value}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-luxury-gray">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-2 text-xs text-[#555] hover:text-gold border border-luxury-gray-mid hover:border-gold/40 px-3 py-2 transition-colors"
            >
              <RotateCcw size={13} />
              Restaurar valores predeterminados
            </button>
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN: IDENTIDAD ===== */}
      <section className="bg-luxury-black border border-luxury-gray">
        <div className="px-5 py-4 border-b border-luxury-gray flex items-center gap-2">
          <Globe size={14} className="text-gold" />
          <h2 className="text-gold text-xs tracking-[0.2em] uppercase">Identidad del Sitio</h2>
        </div>
        <div className="px-5 py-5 space-y-5">
          {/* Site name */}
          <div>
            <label className={labelClass}>Nombre del sitio</label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className={inputClass}
              placeholder="Ej: Mi Tienda"
            />
          </div>
          {/* Tagline */}
          <div>
            <label className={labelClass}>Tagline</label>
            <input
              type="text"
              value={siteTagline}
              onChange={(e) => setSiteTagline(e.target.value)}
              className={inputClass}
              placeholder="Ej: Tu tienda online"
            />
          </div>

          {/* Logo upload */}
          <div>
            <label className={labelClass}>Logo del sitio</label>
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo actual"
                className="h-12 mb-3 object-contain border border-luxury-gray-mid p-1 bg-[#111]"
              />
            )}
            <div className="flex items-start gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="flex-1 text-xs text-luxury-gray-light bg-[#111111] border border-luxury-gray-mid px-3 py-2 file:mr-3 file:py-1 file:px-2 file:text-xs file:border-0 file:bg-gold file:text-black file:cursor-pointer hover:file:bg-gold-light cursor-pointer"
              />
              {logoFile && (
                <button
                  type="button"
                  onClick={handleUploadLogo}
                  disabled={uploadingLogo}
                  className="flex items-center gap-1.5 bg-gold text-black font-bold px-3 py-2 text-xs tracking-wider hover:bg-gold-light disabled:opacity-50 transition-colors shrink-0"
                >
                  {uploadingLogo ? 'Subiendo...' : 'Subir'}
                </button>
              )}
            </div>
            {logoError && <p className="text-red-400 text-xs mt-1">{logoError}</p>}
          </div>

          {/* Favicon upload */}
          <div>
            <label className={labelClass}>Favicon</label>
            {faviconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={faviconUrl}
                alt="Favicon actual"
                className="h-8 mb-3 object-contain border border-luxury-gray-mid p-1 bg-[#111]"
              />
            )}
            <div className="flex items-start gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleFaviconChange}
                className="flex-1 text-xs text-luxury-gray-light bg-[#111111] border border-luxury-gray-mid px-3 py-2 file:mr-3 file:py-1 file:px-2 file:text-xs file:border-0 file:bg-gold file:text-black file:cursor-pointer hover:file:bg-gold-light cursor-pointer"
              />
              {faviconFile && (
                <button
                  type="button"
                  onClick={handleUploadFavicon}
                  disabled={uploadingFavicon}
                  className="flex items-center gap-1.5 bg-gold text-black font-bold px-3 py-2 text-xs tracking-wider hover:bg-gold-light disabled:opacity-50 transition-colors shrink-0"
                >
                  {uploadingFavicon ? 'Subiendo...' : 'Subir'}
                </button>
              )}
            </div>
            {faviconError && <p className="text-red-400 text-xs mt-1">{faviconError}</p>}
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN: MÓDULOS DE NAVEGACIÓN ===== */}
      <section className="bg-luxury-black border border-luxury-gray">
        <div className="px-5 py-4 border-b border-luxury-gray flex items-center gap-2">
          <Layout size={14} className="text-gold" />
          <h2 className="text-gold text-xs tracking-[0.2em] uppercase">Módulos del Panel</h2>
        </div>
        <div className="px-5 py-5">
          <p className="text-[#555555] text-xs mb-4">
            Seleccioná qué secciones se muestran en la barra lateral del panel de administración.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {NAV_MODULES.map(({ slug, label }) => {
              const enabled = navModules.includes(slug)
              return (
                <label
                  key={slug}
                  className="flex items-center gap-3 cursor-pointer group select-none"
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleNavModule(slug)}
                    className="w-4 h-4 accent-gold cursor-pointer"
                  />
                  <span className={`text-sm transition-colors ${enabled ? 'text-white' : 'text-[#555]'}`}>
                    {label}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== ACCIONES ===== */}
      <div className="flex items-center gap-3 pb-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gold text-black font-bold px-5 py-2.5 text-sm tracking-wider hover:bg-gold-light disabled:opacity-50 transition-colors"
        >
          <Save size={15} />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="flex items-center gap-2 border border-luxury-gray-mid text-luxury-gray-light hover:text-white hover:border-gold/50 px-5 py-2.5 text-sm transition-colors"
        >
          <X size={15} />
          Descartar
        </button>
      </div>
    </div>
  )
}
