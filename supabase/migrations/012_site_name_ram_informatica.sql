-- Actualizar nombre del sitio en footer, metadata y branding
UPDATE configuracion
SET valor = 'RAM Informática', updated_at = NOW()
WHERE clave = 'site_name' AND valor IN ('Mi Tienda', '');

INSERT INTO configuracion (clave, valor, descripcion)
VALUES ('site_name', 'RAM Informática', 'Nombre público del sitio')
ON CONFLICT (clave) DO NOTHING;
