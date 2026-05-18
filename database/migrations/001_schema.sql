-- =============================================================================
-- 001_schema.sql
-- Schema PostgreSQL completo para Sistema Operativo Policial
-- Migración desde Firestore → PostgreSQL + PostGIS
--
-- CONVENCIONES:
--   - IDs: UUID generados por gen_random_uuid()
--   - Timestamps: timestamptz (con timezone) — nunca timestamp sin tz
--   - Nombres de tablas: snake_case, plural
--   - Foreign keys: <tabla_singular>_id
--   - Soft delete: columna 'estado' ('activo'/'inactivo'), nunca DELETE físico
--   - Auditoría: trigger automático en todas las tablas críticas
-- =============================================================================

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "postgis";      -- geometría espacial
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- búsqueda sin acentos

-- =============================================================================
-- DOMINIO: CATÁLOGOS
-- Estas tablas son read-heavy, write-rarely. Candidatas a caché.
-- En Firestore eran: rangos_usuario, condiciones_usuario, tipos_recurso
-- =============================================================================

CREATE TABLE IF NOT EXISTS ranks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              TEXT NOT NULL,
  siglas              TEXT NOT NULL,
  orden_jerarquico    INT  NOT NULL,
  descripcion         TEXT,
  estado              TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado              TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ranks_nombre_uk  UNIQUE (nombre),
  CONSTRAINT ranks_siglas_uk  UNIQUE (siglas),
  CONSTRAINT ranks_orden_uk   UNIQUE (orden_jerarquico)
);

CREATE TABLE IF NOT EXISTS conditions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                  TEXT NOT NULL,
  descripcion             TEXT,
  bloquea_operaciones     BOOLEAN NOT NULL DEFAULT false,
  estado                  TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT conditions_nombre_uk UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS resource_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  siglas      TEXT NOT NULL,
  descripcion TEXT,
  estado      TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT resource_types_nombre_uk UNIQUE (nombre),
  CONSTRAINT resource_types_siglas_uk UNIQUE (siglas)
);

-- =============================================================================
-- DOMINIO: TERRITORIAL
-- En Firestore: regiones, delegaciones, escuadras
-- CAMBIO CRÍTICO: nombres denormalizados eliminados.
--   Firestore guardaba region_nombre en cada documento.
--   PostgreSQL usa JOINs — solo se guarda region_id.
-- =============================================================================

CREATE TABLE IF NOT EXISTS regions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  codigo      TEXT NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  -- PostGIS FUTURO: área geográfica de la región
  -- geom     GEOMETRY(MULTIPOLYGON, 4326),
  creado      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT regions_nombre_uk UNIQUE (nombre),
  CONSTRAINT regions_codigo_uk UNIQUE (codigo)
);

CREATE TABLE IF NOT EXISTS delegations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id   UUID NOT NULL REFERENCES regions(id),
  nombre      TEXT NOT NULL,
  codigo      TEXT NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  -- PostGIS FUTURO: área geográfica de la delegación
  -- geom     GEOMETRY(MULTIPOLYGON, 4326),
  creado      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT delegations_nombre_region_uk UNIQUE (nombre, region_id),
  CONSTRAINT delegations_codigo_uk        UNIQUE (codigo)
);

CREATE TABLE IF NOT EXISTS squads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id   UUID NOT NULL REFERENCES delegations(id),
  -- supervisor_id referencia circular con users — se agrega después
  -- con ALTER TABLE para evitar dependencia circular en creación
  supervisor_id   UUID,
  nombre          TEXT NOT NULL,
  codigo          TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT squads_codigo_uk           UNIQUE (codigo),
  CONSTRAINT squads_nombre_delegacion_uk UNIQUE (nombre, delegation_id)
);

-- =============================================================================
-- DOMINIO: USUARIOS
-- En Firestore: usuarios
-- CAMBIO CRÍTICO: rol separado de auth.
--   Firestore: rol = campo en documento
--   PostgreSQL: rol = campo en users + RLS basada en él
--   auth_id = UID de Supabase Auth (referencia a auth.users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- auth_id vincula con Supabase Auth (auth.users.id)
  -- En migración: auth_id = Firebase UID temporalmente
  auth_id         UUID UNIQUE,
  delegation_id   UUID REFERENCES delegations(id),
  squad_id        UUID REFERENCES squads(id),
  rank_id         UUID REFERENCES ranks(id),
  condition_id    UUID REFERENCES conditions(id),

  -- Identidad
  email           TEXT NOT NULL,
  cedula          TEXT NOT NULL,

  -- Personales
  nombre          TEXT NOT NULL DEFAULT '',
  apellido1       TEXT NOT NULL DEFAULT '',
  apellido2       TEXT NOT NULL DEFAULT '',
  telefono        TEXT,
  domicilio       TEXT,
  fecha_nacimiento DATE,
  fecha_alta       DATE,

  -- Sistema
  rol             TEXT NOT NULL DEFAULT 'agente'
                  CHECK (rol IN ('admin','unidad_operativa','jefatura','supervisor','agente')),
  estado_usuario  TEXT NOT NULL DEFAULT 'activo'
                  CHECK (estado_usuario IN ('activo','inactivo')),
  ultimo_login    TIMESTAMPTZ,
  creado          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT users_email_uk  UNIQUE (email),
  CONSTRAINT users_cedula_uk UNIQUE (cedula)
);

-- Ahora que users existe, agregar FK de squads.supervisor_id
ALTER TABLE squads
  ADD CONSTRAINT squads_supervisor_fk
  FOREIGN KEY (supervisor_id) REFERENCES users(id)
  DEFERRABLE INITIALLY DEFERRED;

-- =============================================================================
-- DOMINIO: RECURSOS OPERATIVOS
-- En Firestore: recursos_operativos
-- CAMBIO CRÍTICO: oficiales[] (array) → tabla resource_assignments
-- =============================================================================

CREATE TABLE IF NOT EXISTS resources (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id       UUID NOT NULL REFERENCES delegations(id),
  squad_id            UUID REFERENCES squads(id),
  resource_type_id    UUID NOT NULL REFERENCES resource_types(id),
  unidad              TEXT NOT NULL,
  indicativo          TEXT NOT NULL,
  nombre_recurso      TEXT NOT NULL,
  estado              TEXT NOT NULL DEFAULT 'activo'
                      CHECK (estado IN ('activo','asignado','mantenimiento','inactivo')),
  creado              TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT resources_unidad_delegacion_uk UNIQUE (unidad, delegation_id),
  CONSTRAINT resources_indicativo_uk        UNIQUE (indicativo)
);

-- Reemplaza: recursos_operativos.oficiales[] (array anidado)
-- Permite historial de asignaciones: asignado_en / liberado_en
CREATE TABLE IF NOT EXISTS resource_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id     UUID NOT NULL REFERENCES resources(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  asignado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  liberado_en     TIMESTAMPTZ,

  -- Solo un usuario activo por recurso (sin liberado_en)
  CONSTRAINT resource_assignments_active_uk
    UNIQUE NULLS NOT DISTINCT (resource_id, user_id, liberado_en)
);

-- =============================================================================
-- DOMINIO: ÓRDENES DE EJECUCIÓN
-- En Firestore: ordenes
-- CAMBIO CRÍTICO: acciones[] (array) → tabla order_actions
-- =============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id   UUID NOT NULL REFERENCES delegations(id),
  creado_por      UUID NOT NULL REFERENCES users(id),
  consecutivo     TEXT NOT NULL,
  nombre          TEXT NOT NULL,
  codigo          TEXT,
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE NOT NULL,
  -- estado calculado dinámicamente en vistas, no almacenado
  -- Ver vista: v_orders_with_estado
  creado          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT orders_consecutivo_delegacion_uk UNIQUE (consecutivo, delegation_id),
  CONSTRAINT orders_fechas_check CHECK (fecha_fin >= fecha_inicio)
);

-- Reemplaza: ordenes.acciones[] (array anidado)
CREATE TABLE IF NOT EXISTS order_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  posicion    INT  NOT NULL DEFAULT 0,
  creado      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT order_actions_nombre_order_uk UNIQUE (nombre, order_id)
);

-- =============================================================================
-- DOMINIO: PLANIFICACIÓN
-- En Firestore: planificaciones (con dias[] anidado y dias[].actividades[])
-- CAMBIO CRÍTICO: estructura plana → 3 tablas relacionadas
--   planning → planning_days → planning_activities
-- =============================================================================

CREATE TABLE IF NOT EXISTS planning (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id   UUID NOT NULL REFERENCES delegations(id),
  squad_id        UUID NOT NULL REFERENCES squads(id),
  supervisor_id   UUID NOT NULL REFERENCES users(id),
  creado_por      UUID NOT NULL REFERENCES users(id),
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'activa'
                  CHECK (estado IN ('activa','finalizada','inactiva')),
  creado          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT planning_escuadra_fecha_uk UNIQUE (squad_id, fecha_inicio),
  CONSTRAINT planning_fechas_check CHECK (fecha_fin >= fecha_inicio)
);

-- Reemplaza: planificaciones.dias[] (array de objetos)
CREATE TABLE IF NOT EXISTS planning_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID NOT NULL REFERENCES planning(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL,
  turno       TEXT NOT NULL CHECK (turno IN ('dia','noche')),
  dia_numero  INT  NOT NULL,

  CONSTRAINT planning_days_plan_fecha_uk UNIQUE (planning_id, fecha)
);

-- Reemplaza: planificaciones.dias[].actividades[] (array anidado en array)
CREATE TABLE IF NOT EXISTS planning_activities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_day_id     UUID NOT NULL REFERENCES planning_days(id) ON DELETE CASCADE,
  order_id            UUID NOT NULL REFERENCES orders(id),
  order_action_id     UUID NOT NULL REFERENCES order_actions(id),
  hora_inicio         TIME NOT NULL,
  hora_fin            TIME NOT NULL,
  sector              TEXT NOT NULL,
  detalle             TEXT NOT NULL,
  posicion            INT  NOT NULL DEFAULT 0,

  CONSTRAINT planning_activities_horario_check CHECK (hora_fin > hora_inicio)
);

-- =============================================================================
-- DOMINIO: HOJAS DE SERVICIO
-- En Firestore: hojas_servicio (con actividades[], recursos[], recursos[].oficiales[])
-- CAMBIO CRÍTICO: 4 arrays anidados → 3 tablas junction
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_sheets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id         UUID REFERENCES planning(id),
  planning_day_id     UUID REFERENCES planning_days(id),
  squad_id            UUID NOT NULL REFERENCES squads(id),
  delegation_id       UUID NOT NULL REFERENCES delegations(id),
  supervisor_id       UUID NOT NULL REFERENCES users(id),
  jefatura_id         UUID REFERENCES users(id),
  numero_hoja         TEXT NOT NULL,
  fecha               DATE NOT NULL,
  turno_operativo     TEXT NOT NULL,
  mision              TEXT NOT NULL,
  noticia_criminis    TEXT,
  observaciones       TEXT,
  estado              TEXT NOT NULL DEFAULT 'borrador'
                      CHECK (estado IN ('borrador','activo','finalizado','inactivo')),
  estado_operativo    TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (estado_operativo IN ('pendiente','en_curso','finalizado')),
  creado              TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT service_sheets_horario_numero_uk UNIQUE (numero_hoja, squad_id, fecha)
);

-- Reemplaza: hojas_servicio.recursos[] (array de objetos)
CREATE TABLE IF NOT EXISTS sheet_resources (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_sheet_id    UUID NOT NULL REFERENCES service_sheets(id) ON DELETE CASCADE,
  resource_id         UUID NOT NULL REFERENCES resources(id),
  hora_inicio         TIME,
  hora_fin            TIME,
  es_principal        BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT sheet_resources_hoja_recurso_uk UNIQUE (service_sheet_id, resource_id)
);

-- Reemplaza: hojas_servicio.recursos[].oficiales[] + entregado_a
CREATE TABLE IF NOT EXISTS sheet_officers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_sheet_id    UUID NOT NULL REFERENCES service_sheets(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id),
  resource_id         UUID REFERENCES resources(id),
  es_encargado        BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT sheet_officers_hoja_user_uk UNIQUE (service_sheet_id, user_id)
);

-- Reemplaza: hojas_servicio.actividades[] (array de objetos)
CREATE TABLE IF NOT EXISTS sheet_activities (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_sheet_id        UUID NOT NULL REFERENCES service_sheets(id) ON DELETE CASCADE,
  planning_activity_id    UUID REFERENCES planning_activities(id),
  order_id                UUID NOT NULL REFERENCES orders(id),
  order_action_id         UUID NOT NULL REFERENCES order_actions(id),
  hora_inicio             TIME NOT NULL,
  hora_fin                TIME NOT NULL,
  sector                  TEXT NOT NULL,
  posicion                INT  NOT NULL DEFAULT 0,

  CONSTRAINT sheet_activities_horario_check CHECK (hora_fin > hora_inicio)
);

-- =============================================================================
-- AUDITORÍA
-- No existe en Firestore — nuevo en PostgreSQL
-- Registra automáticamente QUIÉN hizo QUÉ en qué tabla
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  tabla           TEXT NOT NULL,
  operacion       TEXT NOT NULL CHECK (operacion IN ('INSERT','UPDATE','DELETE')),
  registro_id     UUID,
  datos_anteriores JSONB,
  datos_nuevos    JSONB,
  ocurrido_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Función trigger de auditoría (se aplica por tabla en 002_rls.sql)
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    tabla,
    operacion,
    registro_id,
    datos_anteriores,
    datos_nuevos,
    ocurrido_en
  )
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar auditoría a tablas críticas
CREATE OR REPLACE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE OR REPLACE TRIGGER audit_service_sheets
  AFTER INSERT OR UPDATE OR DELETE ON service_sheets
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE OR REPLACE TRIGGER audit_resources
  AFTER INSERT OR UPDATE OR DELETE ON resources
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE OR REPLACE TRIGGER audit_resource_assignments
  AFTER INSERT OR UPDATE OR DELETE ON resource_assignments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Trigger: actualizar 'actualizado' automáticamente
CREATE OR REPLACE FUNCTION set_actualizado()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con columna actualizado
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'regions','delegations','squads','users',
    'resources','orders','planning','service_sheets',
    'ranks','conditions','resource_types'
  ]
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER set_actualizado_%I
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_actualizado()',
      t, t
    );
  END LOOP;
END;
$$;

-- =============================================================================
-- ÍNDICES
-- Basados en los filtros más frecuentes detectados en el código Firestore
-- =============================================================================

-- Territoriales (los filtros más frecuentes en toda la app)
CREATE INDEX IF NOT EXISTS idx_users_delegation    ON users(delegation_id);
CREATE INDEX IF NOT EXISTS idx_users_squad         ON users(squad_id);
CREATE INDEX IF NOT EXISTS idx_users_rol           ON users(rol);
CREATE INDEX IF NOT EXISTS idx_users_estado        ON users(estado_usuario);
CREATE INDEX IF NOT EXISTS idx_resources_delegation ON resources(delegation_id);
CREATE INDEX IF NOT EXISTS idx_resources_squad     ON resources(squad_id);
CREATE INDEX IF NOT EXISTS idx_resources_estado    ON resources(estado);
CREATE INDEX IF NOT EXISTS idx_orders_delegation   ON orders(delegation_id);
CREATE INDEX IF NOT EXISTS idx_orders_fechas       ON orders(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_planning_squad      ON planning(squad_id);
CREATE INDEX IF NOT EXISTS idx_planning_delegation ON planning(delegation_id);
CREATE INDEX IF NOT EXISTS idx_planning_fechas     ON planning(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_service_sheets_squad       ON service_sheets(squad_id);
CREATE INDEX IF NOT EXISTS idx_service_sheets_delegation  ON service_sheets(delegation_id);
CREATE INDEX IF NOT EXISTS idx_service_sheets_fecha       ON service_sheets(fecha);
CREATE INDEX IF NOT EXISTS idx_audit_tabla         ON audit_logs(tabla, ocurrido_en DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user          ON audit_logs(user_id, ocurrido_en DESC);

-- Búsqueda de texto con unaccent + trigrams
-- unaccent disponible pero no instalada — se instala aquí.
-- SET search_path en la función es crítico: resuelve el problema de
-- "function does not exist" durante validación IMMUTABLE en Supabase.
CREATE EXTENSION IF NOT EXISTS unaccent  SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION immutable_unaccent(txt text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', txt);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public;

-- Índice GIN para búsqueda full-text sin acentos
CREATE INDEX IF NOT EXISTS idx_users_nombre_search
  ON users USING gin(
    to_tsvector(
      'spanish',
      immutable_unaccent(nombre || ' ' || apellido1 || ' ' || coalesce(apellido2,''))
    )
  );

-- Índice trigram para búsqueda parcial (LIKE/ILIKE)
CREATE INDEX IF NOT EXISTS idx_users_nombre_trgm
  ON users USING gin(
    (nombre || ' ' || apellido1 || ' ' || coalesce(apellido2,'')) gin_trgm_ops
  );

-- PostGIS FUTURO — índices espaciales
-- CREATE INDEX IF NOT EXISTS idx_regions_geom ON regions USING gist(geom);
-- CREATE INDEX IF NOT EXISTS idx_delegations_geom ON delegations USING gist(geom);