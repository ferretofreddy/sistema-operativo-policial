-- =============================================================================
-- seeds/001_catalogs.sql
-- Catálogos base del sistema — datos institucionales reales
-- Equivalentes Firestore: rangos_usuario, condiciones_usuario, tipos_recurso
--
-- EJECUTAR: después de 001_schema.sql y 002_rls.sql
-- IDEMPOTENTE: usa INSERT ... ON CONFLICT DO NOTHING
-- =============================================================================

-- =============================================================================
-- RANGOS (orden jerárquico real de Fuerza Pública Costa Rica)
-- =============================================================================

INSERT INTO ranks (nombre, siglas, orden_jerarquico, descripcion, estado)
VALUES
  ('Director General',          'DG',   1,  'Máxima autoridad institucional',          'activo'),
  ('Subdirector General',       'SDG',  2,  NULL,                                       'activo'),
  ('Director',                  'DIR',  3,  NULL,                                       'activo'),
  ('Subdirector',               'SDIR', 4,  NULL,                                       'activo'),
  ('Inspector General',         'IG',   5,  NULL,                                       'activo'),
  ('Subinspector General',      'SIG',  6,  NULL,                                       'activo'),
  ('Inspector',                 'INS',  7,  NULL,                                       'activo'),
  ('Subinspector',              'SINS', 8,  NULL,                                       'activo'),
  ('Oficial Mayor',             'OM',   9,  NULL,                                       'activo'),
  ('Oficial',                   'OF',   10, NULL,                                       'activo'),
  ('Suboficial',                'SOF',  11, NULL,                                       'activo'),
  ('Cabo',                      'CB',   12, NULL,                                       'activo'),
  ('Agente de Primera',         'AP',   13, NULL,                                       'activo'),
  ('Agente',                    'AG',   14, 'Rango de ingreso',                         'activo'),
  ('Agente en Período Prueba',  'APP',  15, 'Período de prueba institucional',          'activo')
ON CONFLICT (nombre) DO NOTHING;

-- =============================================================================
-- CONDICIONES OPERATIVAS
-- =============================================================================

INSERT INTO conditions (nombre, descripcion, bloquea_operaciones, estado)
VALUES
  ('Activo',              'Personal en servicio normal',                          false, 'activo'),
  ('Vacaciones',          'Personal en período de vacaciones',                    true,  'activo'),
  ('Incapacidad',         'Personal con incapacidad médica',                      true,  'activo'),
  ('Licencia Sin Goce',   'Licencia sin goce de salario',                         true,  'activo'),
  ('Licencia Con Goce',   'Licencia con goce de salario',                         true,  'activo'),
  ('Comisión',            'Personal en comisión de servicios',                    false, 'activo'),
  ('Capacitación',        'Personal en proceso de capacitación',                  false, 'activo'),
  ('Suspendido',          'Personal con medida disciplinaria activa',             true,  'activo'),
  ('Destacado',           'Personal destacado en otra unidad',                    false, 'activo'),
  ('Disponible',          'Personal disponible para asignación',                  false, 'activo')
ON CONFLICT (nombre) DO NOTHING;

-- =============================================================================
-- TIPOS DE RECURSO OPERATIVO
-- =============================================================================

INSERT INTO resource_types (nombre, siglas, descripcion, estado)
VALUES
  ('Patrulla',                 'PAT',  'Vehículo patrulla estándar',                    'activo'),
  ('Moto',                     'MOT',  'Motocicleta de patrullaje',                     'activo'),
  ('Cuadraciclo',              'CUA',  'Cuadraciclo todoterreno',                       'activo'),
  ('Patrulla 4x4',             'P4X',  'Vehículo patrulla doble tracción',              'activo'),
  ('Vehículo Especial',        'VES',  'Vehículo de operaciones especiales',            'activo'),
  ('Lancha',                   'LAN',  'Embarcación de patrullaje',                     'activo'),
  ('Bicicleta',                'BIC',  'Bicicleta de patrullaje urbano',                'activo'),
  ('Unidad Canina',            'CAN',  'Unidad con perro de servicio',                  'activo'),
  ('Vehículo Administrativo',  'VAD',  'Vehículo de uso administrativo',               'activo')
ON CONFLICT (nombre) DO NOTHING;
