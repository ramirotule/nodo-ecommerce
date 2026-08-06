-- Paleta dark charcoal unificada (fondo + superficies)
UPDATE configuracion
SET valor = '#151413', updated_at = NOW()
WHERE clave = 'color_bg';

UPDATE configuracion
SET valor = '#1f1e1b', updated_at = NOW()
WHERE clave = 'color_surface';
