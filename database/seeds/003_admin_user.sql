-- =============================================================================
-- seeds/003_admin_user.sql
-- Usuario administrador para bootstrap y validación
--
-- FLUJO CORRECTO (NO insertar en auth.users manualmente):
--
--   PASO 1: Crear usuario en Supabase Dashboard o CLI
--     supabase auth admin create-user \
--       --email admin@sistema.go.cr \
--       --password <contraseña-segura> \
--       --email-confirm
--
--   PASO 2: Obtener el UUID generado por Supabase Auth
--     SELECT id FROM auth.users WHERE email = 'admin@sistema.go.cr';
--
--   PASO 3: Reemplazar <AUTH_UUID_AQUI> con ese UUID y ejecutar este script
--
-- POR QUÉ así:
--   - Supabase Auth maneja hashing de contraseña, tokens, sesiones
--   - auth.users.id es la fuente de verdad de identidad
--   - users.auth_id vincula el perfil institucional con la identidad auth
--   - Si insertas en auth.users directamente, bypaseas el sistema de Auth
-- =============================================================================

-- =============================================================================
-- INSERTAR PERFIL INSTITUCIONAL DEL ADMIN
-- Reemplazar <AUTH_UUID_AQUI> con el UUID real de auth.users
-- =============================================================================

INSERT INTO users (
  auth_id,
  email,
  cedula,
  nombre,
  apellido1,
  apellido2,
  rol,
  estado_usuario,
  rank_id,
  condition_id,
  delegation_id,
  squad_id
)
SELECT
  '<AUTH_UUID_AQUI>'::uuid,                          -- UUID de auth.users
  'admin@sistema.go.cr',
  '000000000',
  'ADMINISTRADOR',
  'SISTEMA',
  '',
  'admin',
  'activo',
  r.id,                                              -- Rango: Director General
  c.id,                                              -- Condición: Activo
  '00000000-0000-0000-0000-000000000010'::uuid,      -- Delegación Central
  NULL                                               -- Admin no tiene escuadra
FROM
  ranks      r WHERE r.nombre = 'Director General',
  conditions c WHERE c.nombre = 'Activo'
ON CONFLICT (email) DO UPDATE
  SET
    auth_id    = EXCLUDED.auth_id,
    rol        = 'admin',
    actualizado = now();

-- =============================================================================
-- VERIFICACIÓN COMPLETA POST-SEED
-- Ejecutar después para confirmar que RLS funciona
-- =============================================================================

-- 1. Confirmar usuario creado
-- SELECT
--   u.email,
--   u.rol,
--   u.estado_usuario,
--   r.nombre  AS rango,
--   r.siglas  AS siglas,
--   d.nombre  AS delegacion,
--   re.nombre AS region
-- FROM users u
-- JOIN ranks      r  ON r.id  = u.rank_id
-- JOIN conditions c  ON c.id  = u.condition_id
-- JOIN delegations d ON d.id  = u.delegation_id
-- JOIN regions    re ON re.id = d.region_id
-- WHERE u.email = 'admin@sistema.go.cr';

-- 2. Verificar que auth_id está vinculado
-- SELECT
--   au.email  AS auth_email,
--   u.email   AS profile_email,
--   u.rol,
--   u.auth_id = au.id AS vinculado
-- FROM auth.users au
-- JOIN users u ON u.auth_id = au.id
-- WHERE au.email = 'admin@sistema.go.cr';

-- 3. Test RLS básico (ejecutar con sesión del admin)
-- SET ROLE authenticated;
-- SET request.jwt.claims TO '{"sub": "<AUTH_UUID_AQUI>"}';
-- SELECT count(*) FROM users;      -- debe retornar todos los usuarios
-- SELECT count(*) FROM regions;    -- debe retornar todas las regiones
-- SELECT count(*) FROM audit_logs; -- solo admin puede ver esto

-- =============================================================================
-- SCRIPT HELPER para Supabase CLI
-- Guardar como: database/seeds/create_admin_auth.sh
-- =============================================================================

-- #!/bin/bash
-- # Crear usuario admin en Supabase Auth y guardar UUID
-- # Requiere: supabase CLI autenticado
--
-- EMAIL="admin@sistema.go.cr"
-- PASSWORD="$(openssl rand -base64 24)"  # Generar contraseña segura
--
-- echo "Creando usuario en Supabase Auth..."
-- UUID=$(supabase auth admin create-user \
--   --email "$EMAIL" \
--   --password "$PASSWORD" \
--   --email-confirm \
--   --project-ref <TU_PROJECT_REF> \
--   | grep '"id"' | awk -F'"' '{print $4}')
--
-- echo "UUID generado: $UUID"
-- echo "Contraseña: $PASSWORD"
-- echo ""
-- echo "Ejecutar en SQL Editor:"
-- echo "UPDATE users SET auth_id = '$UUID' WHERE email = '$EMAIL';"
