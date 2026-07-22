-- Soporta la reconciliación de la lista de precios del proveedor:
-- original_name = cómo llama el proveedor a este producto (clave de match del import diario);
-- pendiente_completar = producto autocreado por el import que aún necesita categoría/imágenes/etc.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS original_name TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS pendiente_completar BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_productos_original_name ON productos (lower(original_name));
