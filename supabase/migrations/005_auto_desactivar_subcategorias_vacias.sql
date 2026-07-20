-- Mantiene subcategorias.activo sincronizado con la existencia de productos activos:
-- se apaga sola al quedarse sin productos activos, y se prende sola al recibir uno.

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
      SELECT 1 FROM productos
      WHERE subcategoria_id = v_subcategoria_id AND activo = true
    )
    WHERE id = v_subcategoria_id;
  END IF;

  -- Si el producto cambió de subcategoría, también resincronizar la anterior
  IF TG_OP = 'UPDATE' AND OLD.subcategoria_id IS DISTINCT FROM NEW.subcategoria_id AND OLD.subcategoria_id IS NOT NULL THEN
    UPDATE subcategorias
    SET activo = EXISTS (
      SELECT 1 FROM productos WHERE subcategoria_id = OLD.subcategoria_id AND activo = true
    )
    WHERE id = OLD.subcategoria_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_desactivar_subcategoria_sin_productos ON productos;
DROP TRIGGER IF EXISTS trg_sync_subcategoria_activo ON productos;
CREATE TRIGGER trg_sync_subcategoria_activo
AFTER INSERT OR UPDATE OR DELETE ON productos
FOR EACH ROW
EXECUTE FUNCTION fn_sync_subcategoria_activo();

-- Backfill: sincronizar el estado actual de los datos en ambos sentidos
UPDATE subcategorias s
SET activo = EXISTS (
  SELECT 1 FROM productos p WHERE p.subcategoria_id = s.id AND p.activo = true
);
