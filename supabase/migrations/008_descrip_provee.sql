-- Descripción tal como figura en la lista del proveedor (texto completo del import).
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descrip_provee TEXT;
