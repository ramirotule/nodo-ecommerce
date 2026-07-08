export const THEME_DEFAULTS = {
  color_primary: '#D4AF37',
  color_primary_light: '#E8C84A',
  color_primary_dark: '#B8941F',
  color_bg: '#000000',
  color_surface: '#0D0D0D',
  color_text: '#FFFFFF',
  site_name: 'Mi Tienda',
  site_tagline: 'Tu tienda online',
  logo_url: '',
  favicon_url: '',
  nav_modules_enabled: '["productos","carrousel","pedidos","vendedoras","categorias","notas","datos-bancarios","mis-datos"]',
} as const

export type ThemeConfig = typeof THEME_DEFAULTS
