-- Columna activo en categorías + sincronización con productos asignados.
-- Al asignar al menos un producto, la categoría/subcategoría queda activa.

ALTER TABLE categorias ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION fn_sync_categoria_activo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_categoria_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_categoria_id := OLD.categoria_id;
  ELSE
    v_categoria_id := NEW.categoria_id;
  END IF;

  IF v_categoria_id IS NOT NULL THEN
    UPDATE categorias
    SET activo = EXISTS (
      SELECT 1 FROM productos WHERE categoria_id = v_categoria_id
    )
    WHERE id = v_categoria_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.categoria_id IS DISTINCT FROM NEW.categoria_id AND OLD.categoria_id IS NOT NULL THEN
    UPDATE categorias
    SET activo = EXISTS (
      SELECT 1 FROM productos WHERE categoria_id = OLD.categoria_id
    )
    WHERE id = OLD.categoria_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_categoria_activo ON productos;
CREATE TRIGGER trg_sync_categoria_activo
AFTER INSERT OR UPDATE OR DELETE ON productos
FOR EACH ROW
EXECUTE FUNCTION fn_sync_categoria_activo();

-- Subcategorías: activar/desactivar según cualquier producto asignado (no solo activos)
CREATE OR REPLACE FUNCTION fn_sync_subcategoria_activo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_subcategoria_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_subcategoria_id := OLD.subcategoria_id;
  ELSE
    v_subcategoria_id := NEW.subcategoria_id;
  END IF;

  IF v_subcategoria_id IS NOT NULL THEN
    UPDATE subcategorias
    SET activo = EXISTS (
      SELECT 1 FROM productos WHERE subcategoria_id = v_subcategoria_id
    )
    WHERE id = v_subcategoria_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.subcategoria_id IS DISTINCT FROM NEW.subcategoria_id AND OLD.subcategoria_id IS NOT NULL THEN
    UPDATE subcategorias
    SET activo = EXISTS (
      SELECT 1 FROM productos WHERE subcategoria_id = OLD.subcategoria_id
    )
    WHERE id = OLD.subcategoria_id;
  END IF;

  RETURN NULL;
END;
$$;

UPDATE categorias c
SET activo = EXISTS (
  SELECT 1 FROM productos p WHERE p.categoria_id = c.id
);

UPDATE subcategorias s
SET activo = EXISTS (
  SELECT 1 FROM productos p WHERE p.subcategoria_id = s.id
);
