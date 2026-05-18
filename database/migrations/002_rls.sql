-- =============================================================================
-- 002_rls.sql
-- Row Level Security (RLS) para Sistema Operativo Policial
--
-- FILOSOFÍA:
--   - Seguridad a nivel de base de datos — no solo frontend
--   - Cada rol solo ve y modifica lo que le corresponde territorialmente
--   - RLS reemplaza los if/switch de rol del frontend actual
--   - auth.uid() = UUID del usuario autenticado en Supabase Auth
--
-- ROLES DEL SISTEMA:
--   admin           → acceso total
--   unidad_operativa → región + delegación completa
--   jefatura        → región + delegación completa (solo lectura operativo)
--   supervisor      → delegación + escuadra propia
--   agente          → solo su propia escuadra (lectura)
-- =============================================================================

-- =============================================================================
-- FUNCIÓN HELPER: rol del usuario actual
-- Evita subqueries repetidos en cada policy
-- =============================================================================

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT rol FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_delegation_id()
RETURNS UUID AS $$
  SELECT delegation_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_squad_id()
RETURNS UUID AS $$
  SELECT squad_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_record()
RETURNS users AS $$
  SELECT * FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =============================================================================

ALTER TABLE regions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources            ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_actions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning             ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_days        ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_activities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_sheets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_resources      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_officers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CATÁLOGOS: lectura pública para usuarios autenticados
-- ranks, conditions, resource_types — sin restricción territorial
-- =============================================================================

CREATE POLICY "catalogs_select_authenticated"
  ON ranks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "catalogs_select_authenticated"
  ON conditions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "catalogs_select_authenticated"
  ON resource_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admin puede modificar catálogos
CREATE POLICY "catalogs_admin_write"
  ON ranks FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "catalogs_admin_write"
  ON conditions FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "catalogs_admin_write"
  ON resource_types FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- =============================================================================
-- TERRITORIAL: regiones
-- =============================================================================

-- Todos ven regiones (necesario para selectores territoriales)
CREATE POLICY "regions_select_authenticated"
  ON regions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admin puede crear/modificar regiones
CREATE POLICY "regions_admin_write"
  ON regions FOR INSERT UPDATE DELETE
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- =============================================================================
-- TERRITORIAL: delegaciones
-- =============================================================================

CREATE POLICY "delegations_select_authenticated"
  ON delegations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "delegations_admin_write"
  ON delegations FOR INSERT UPDATE DELETE
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- =============================================================================
-- TERRITORIAL: escuadras
-- Regla: ve las escuadras de tu delegación (o todas si eres admin)
-- =============================================================================

CREATE POLICY "squads_select"
  ON squads FOR SELECT
  USING (
    current_user_role() = 'admin'
    OR delegation_id = current_user_delegation_id()
  );

CREATE POLICY "squads_write_admin_or_uo"
  ON squads FOR INSERT UPDATE DELETE
  USING (
    current_user_role() IN ('admin', 'unidad_operativa')
    AND (
      current_user_role() = 'admin'
      OR delegation_id = current_user_delegation_id()
    )
  )
  WITH CHECK (
    current_user_role() IN ('admin', 'unidad_operativa')
  );

-- =============================================================================
-- USUARIOS
-- Regla:
--   admin → ve todos
--   unidad_operativa/jefatura → ve su delegación
--   supervisor → ve su escuadra + su propio registro
--   agente → solo su propio registro
-- =============================================================================

CREATE POLICY "users_select"
  ON users FOR SELECT
  USING (
    current_user_role() = 'admin'
    OR (
      current_user_role() IN ('unidad_operativa', 'jefatura')
      AND delegation_id = current_user_delegation_id()
    )
    OR (
      current_user_role() = 'supervisor'
      AND (
        squad_id = current_user_squad_id()
        OR auth_id = auth.uid()
      )
    )
    OR auth_id = auth.uid()
  );

-- Admin crea usuarios; propia cuenta puede actualizar ciertos campos
CREATE POLICY "users_insert_admin"
  ON users FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "users_update"
  ON users FOR UPDATE
  USING (
    current_user_role() = 'admin'
    OR auth_id = auth.uid()
  )
  WITH CHECK (
    current_user_role() = 'admin'
    OR auth_id = auth.uid()
  );

-- Soft delete solo admin
CREATE POLICY "users_delete_admin"
  ON users FOR DELETE
  USING (current_user_role() = 'admin');

-- =============================================================================
-- RECURSOS
-- =============================================================================

CREATE POLICY "resources_select"
  ON resources FOR SELECT
  USING (
    current_user_role() = 'admin'
    OR delegation_id = current_user_delegation_id()
  );

CREATE POLICY "resources_write"
  ON resources FOR INSERT UPDATE DELETE
  USING (
    current_user_role() IN ('admin', 'unidad_operativa')
    AND (
      current_user_role() = 'admin'
      OR delegation_id = current_user_delegation_id()
    )
  )
  WITH CHECK (
    current_user_role() IN ('admin', 'unidad_operativa', 'supervisor')
  );

CREATE POLICY "resource_assignments_select"
  ON resource_assignments FOR SELECT
  USING (
    current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_id
        AND r.delegation_id = current_user_delegation_id()
    )
  );

CREATE POLICY "resource_assignments_write"
  ON resource_assignments FOR INSERT UPDATE DELETE
  USING (current_user_role() IN ('admin','unidad_operativa','supervisor'));

-- =============================================================================
-- ÓRDENES
-- =============================================================================

CREATE POLICY "orders_select"
  ON orders FOR SELECT
  USING (
    current_user_role() = 'admin'
    OR delegation_id = current_user_delegation_id()
  );

CREATE POLICY "orders_write"
  ON orders FOR INSERT UPDATE DELETE
  USING (
    current_user_role() IN ('admin','unidad_operativa')
    AND (
      current_user_role() = 'admin'
      OR delegation_id = current_user_delegation_id()
    )
  )
  WITH CHECK (
    current_user_role() IN ('admin','unidad_operativa')
  );

CREATE POLICY "order_actions_select"
  ON order_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (
          current_user_role() = 'admin'
          OR o.delegation_id = current_user_delegation_id()
        )
    )
  );

CREATE POLICY "order_actions_write"
  ON order_actions FOR INSERT UPDATE DELETE
  USING (current_user_role() IN ('admin','unidad_operativa'));

-- =============================================================================
-- PLANIFICACIÓN
-- =============================================================================

CREATE POLICY "planning_select"
  ON planning FOR SELECT
  USING (
    current_user_role() = 'admin'
    OR delegation_id = current_user_delegation_id()
  );

CREATE POLICY "planning_write"
  ON planning FOR INSERT UPDATE DELETE
  USING (
    current_user_role() IN ('admin','unidad_operativa')
    AND (
      current_user_role() = 'admin'
      OR delegation_id = current_user_delegation_id()
    )
  )
  WITH CHECK (
    current_user_role() IN ('admin','unidad_operativa')
  );

-- planning_days y planning_activities heredan acceso vía JOIN con planning
CREATE POLICY "planning_days_select"
  ON planning_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM planning p
      WHERE p.id = planning_id
        AND (
          current_user_role() = 'admin'
          OR p.delegation_id = current_user_delegation_id()
        )
    )
  );

CREATE POLICY "planning_days_write"
  ON planning_days FOR INSERT UPDATE DELETE
  USING (current_user_role() IN ('admin','unidad_operativa'));

CREATE POLICY "planning_activities_select"
  ON planning_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM planning_days pd
      JOIN planning p ON p.id = pd.planning_id
      WHERE pd.id = planning_day_id
        AND (
          current_user_role() = 'admin'
          OR p.delegation_id = current_user_delegation_id()
        )
    )
  );

CREATE POLICY "planning_activities_write"
  ON planning_activities FOR INSERT UPDATE DELETE
  USING (current_user_role() IN ('admin','unidad_operativa'));

-- =============================================================================
-- HOJAS DE SERVICIO
-- Regla:
--   admin/unidad_operativa/jefatura → toda la delegación
--   supervisor → solo su escuadra
--   agente → solo sus hojas (como oficial)
-- =============================================================================

CREATE POLICY "service_sheets_select"
  ON service_sheets FOR SELECT
  USING (
    current_user_role() = 'admin'
    OR (
      current_user_role() IN ('unidad_operativa','jefatura')
      AND delegation_id = current_user_delegation_id()
    )
    OR (
      current_user_role() = 'supervisor'
      AND squad_id = current_user_squad_id()
    )
    OR (
      current_user_role() = 'agente'
      AND EXISTS (
        SELECT 1 FROM sheet_officers so
        WHERE so.service_sheet_id = id
          AND so.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      )
    )
  );

CREATE POLICY "service_sheets_write"
  ON service_sheets FOR INSERT UPDATE DELETE
  USING (
    current_user_role() IN ('admin','unidad_operativa','supervisor')
    AND (
      current_user_role() = 'admin'
      OR delegation_id = current_user_delegation_id()
    )
  )
  WITH CHECK (
    current_user_role() IN ('admin','unidad_operativa','supervisor')
  );

-- Tables junction de service_sheets — heredan acceso
CREATE POLICY "sheet_junction_select"
  ON sheet_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_sheets ss
      WHERE ss.id = service_sheet_id
    )
  );

CREATE POLICY "sheet_junction_write"
  ON sheet_resources FOR INSERT UPDATE DELETE
  USING (current_user_role() IN ('admin','unidad_operativa','supervisor'));

CREATE POLICY "sheet_officers_select"
  ON sheet_officers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_sheets ss
      WHERE ss.id = service_sheet_id
    )
  );

CREATE POLICY "sheet_officers_write"
  ON sheet_officers FOR INSERT UPDATE DELETE
  USING (current_user_role() IN ('admin','unidad_operativa','supervisor'));

CREATE POLICY "sheet_activities_select"
  ON sheet_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_sheets ss
      WHERE ss.id = service_sheet_id
    )
  );

CREATE POLICY "sheet_activities_write"
  ON sheet_activities FOR INSERT UPDATE DELETE
  USING (current_user_role() IN ('admin','unidad_operativa','supervisor'));

-- =============================================================================
-- AUDITORÍA: solo lectura para admin
-- =============================================================================

CREATE POLICY "audit_logs_admin_read"
  ON audit_logs FOR SELECT
  USING (current_user_role() = 'admin');

-- =============================================================================
-- VISTAS: estado calculado (no almacenado)
-- =============================================================================

-- Vista de órdenes con estado calculado dinámicamente
CREATE OR REPLACE VIEW v_orders_with_estado AS
SELECT
  o.*,
  CASE
    WHEN CURRENT_DATE < o.fecha_inicio THEN 'programada'
    WHEN CURRENT_DATE > o.fecha_fin    THEN 'finalizada'
    ELSE                                    'activa'
  END AS estado_calculado,
  r.nombre AS region_nombre,
  d.nombre AS delegation_nombre,
  d.codigo AS delegation_codigo
FROM orders o
JOIN delegations d ON d.id = o.delegation_id
JOIN regions r     ON r.id = d.region_id;

-- Vista de planificaciones activas
CREATE OR REPLACE VIEW v_planning_activas AS
SELECT
  p.*,
  s.nombre  AS squad_nombre,
  s.codigo  AS squad_codigo,
  d.nombre  AS delegation_nombre,
  r.nombre  AS region_nombre,
  u.nombre  AS supervisor_nombre,
  u.apellido1 AS supervisor_apellido1
FROM planning p
JOIN squads      s ON s.id = p.squad_id
JOIN delegations d ON d.id = p.delegation_id
JOIN regions     r ON r.id = d.region_id
JOIN users       u ON u.id = p.supervisor_id
WHERE p.estado = 'activa'
  AND p.fecha_fin >= CURRENT_DATE;

-- Vista de hojas de servicio enriquecidas
CREATE OR REPLACE VIEW v_service_sheets_full AS
SELECT
  ss.*,
  sq.nombre  AS squad_nombre,
  sq.codigo  AS squad_codigo,
  d.nombre   AS delegation_nombre,
  r.nombre   AS region_nombre,
  sup.nombre || ' ' || sup.apellido1 AS supervisor_nombre_completo,
  jef.nombre || ' ' || jef.apellido1 AS jefatura_nombre_completo
FROM service_sheets ss
JOIN squads      sq  ON sq.id  = ss.squad_id
JOIN delegations d   ON d.id   = ss.delegation_id
JOIN regions     r   ON r.id   = d.region_id
JOIN users       sup ON sup.id = ss.supervisor_id
LEFT JOIN users  jef ON jef.id = ss.jefatura_id;
