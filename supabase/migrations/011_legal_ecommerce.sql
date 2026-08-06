-- Requisitos legales e-commerce Argentina (Ley 24.240, Res. 424/2020, AFIP)
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('legal_razon_social', '', 'Razón social del titular del sitio'),
  ('legal_cuit', '', 'CUIT del titular (solo números o con guiones)'),
  ('legal_data_fiscal_url', '', 'URL de Data Fiscal AFIP (validación fiscal)'),
  ('legal_terminos', '', 'Contenido HTML de Términos y Condiciones'),
  ('legal_devoluciones', '', 'Contenido HTML de Política de Cambios y Devoluciones'),
  ('legal_arrepentimiento', '', 'Contenido HTML de la página Botón de Arrepentimiento')
ON CONFLICT (clave) DO NOTHING;
