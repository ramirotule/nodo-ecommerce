-- Tags libres por producto, usables como criterio de búsqueda adicional
-- (además de nombre, marca y descripción).
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_productos_tags ON productos USING GIN (tags);
