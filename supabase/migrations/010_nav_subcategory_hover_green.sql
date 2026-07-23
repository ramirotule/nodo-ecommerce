-- Color hover de subcategorías en el menú de navegación
INSERT INTO configuracion (clave, valor, descripcion)
VALUES
  ('color_nav_subcategory', '#18A45C', 'Color hover subcategorías del menú (modo oscuro)'),
  ('light_color_nav_subcategory', '#18A45C', 'Color hover subcategorías del menú (modo claro)')
ON CONFLICT (clave) DO UPDATE
SET valor = EXCLUDED.valor,
    descripcion = EXCLUDED.descripcion,
    updated_at = NOW();
