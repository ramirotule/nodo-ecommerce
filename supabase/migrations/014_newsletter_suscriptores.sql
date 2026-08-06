-- Suscriptores al newsletter (lista de precios diaria por WhatsApp)

CREATE TABLE newsletter_suscriptores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono TEXT NOT NULL,
  telefono_normalizado TEXT NOT NULL,
  email TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT newsletter_suscriptores_telefono_normalizado_key UNIQUE (telefono_normalizado)
);

CREATE INDEX idx_newsletter_suscriptores_activo
  ON newsletter_suscriptores (activo)
  WHERE activo = TRUE;

CREATE TRIGGER trg_newsletter_suscriptores_updated_at
  BEFORE UPDATE ON newsletter_suscriptores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE newsletter_suscriptores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_newsletter_suscriptores"
  ON newsletter_suscriptores FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'));

-- Textos del modal orientados a lista de precios diaria
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('newsletter_title', 'Lista de precios diaria', 'Título del modal de newsletter'),
  ('newsletter_body', 'Dejanos tu celular y recibí por WhatsApp la lista de precios actualizada todos los días.', 'Descripción del modal de newsletter'),
  ('newsletter_footer', 'Podés darte de baja en cualquier momento.', 'Pie del modal de newsletter')
ON CONFLICT (clave) DO UPDATE SET
  valor = EXCLUDED.valor,
  descripcion = EXCLUDED.descripcion;
