-- =============================================================================
-- seeds/002_territorio_base.sql
-- Territorio mínimo para bootstrap y validación de RLS
--
-- PROPÓSITO:
--   - Validar relaciones regions → delegations → squads → users
--   - Probar RLS territorial completo
--   - No es datos históricos de producción — es estructura base
--
-- EJECUTAR: después de 001_catalogs.sql
-- IDEMPOTENTE: usa INSERT ... ON CONFLICT DO NOTHING
-- =============================================================================

-- =============================================================================
-- REGIÓN BASE
-- Ajustar nombre y código al territorio real del proyecto
-- =============================================================================

INSERT INTO regions (id, nombre, codigo, estado)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Región Central', 'RC', 'activo')
ON CONFLICT (codigo) DO NOTHING;

-- =============================================================================
-- DELEGACIÓN BASE
-- =============================================================================

INSERT INTO delegations (id, region_id, nombre, codigo, estado)
VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Delegación Central',
    'DC',
    'activo'
  )
ON CONFLICT (codigo) DO NOTHING;

-- =============================================================================
-- ESCUADRA BASE
-- supervisor_id se vincula después de crear el usuario admin
-- =============================================================================

INSERT INTO squads (id, delegation_id, nombre, codigo, estado)
VALUES
  (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000010',
    'Escuadra Alpha',
    'ALPHA',
    'activo'
  )
ON CONFLICT (codigo) DO NOTHING;

-- =============================================================================
-- VERIFICACIÓN
-- Ejecutar después del seed para confirmar relaciones
-- =============================================================================

-- SELECT
--   r.nombre AS region,
--   d.nombre AS delegacion,
--   s.nombre AS escuadra
-- FROM squads s
-- JOIN delegations d ON d.id = s.delegation_id
-- JOIN regions r     ON r.id = d.region_id
-- WHERE r.codigo = 'RC';
