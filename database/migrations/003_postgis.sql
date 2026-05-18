-- =============================================================================
-- 003_postgis.sql
-- Estrategia GIS con PostGIS para Sistema Operativo Policial
--
-- FILOSOFÍA:
--   Esta migración es INCREMENTAL — no bloquea el resto del desarrollo.
--   Se activa cuando PostGIS esté configurado en el servidor.
--   Mientras tanto, las columnas geom simplemente no se usan.
--
-- CASOS DE USO:
--   1. Visualizar patrullas y recursos en mapa en tiempo real
--   2. Incidentes dentro de un radio específico
--   3. Cobertura territorial por escuadra
--   4. Zonas calientes (heatmaps) de incidentes
--   5. Rutas de patrullaje
--   6. Integración con QGIS para análisis institucional
-- =============================================================================

-- =============================================================================
-- PASO 1: Agregar columnas espaciales a tablas territoriales
-- SRID 4326 = WGS84 (GPS estándar — compatible con Leaflet, Mapbox, QGIS)
-- =============================================================================

-- Polígonos de regiones (ej: Región Pacífico Sur)
ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS geom GEOMETRY(MULTIPOLYGON, 4326);

-- Polígonos de delegaciones (ej: Delegación de Puntarenas)
ALTER TABLE delegations
  ADD COLUMN IF NOT EXISTS geom GEOMETRY(MULTIPOLYGON, 4326);

-- Puntos de ubicación de escuadras (sede física)
ALTER TABLE squads
  ADD COLUMN IF NOT EXISTS ubicacion_sede GEOMETRY(POINT, 4326);

-- Polígonos de sectores de patrullaje por escuadra
ALTER TABLE squads
  ADD COLUMN IF NOT EXISTS sector_patrullaje GEOMETRY(MULTIPOLYGON, 4326);

-- =============================================================================
-- PASO 2: Tablas GIS específicas (nuevas — no existían en Firestore)
-- =============================================================================

-- Ubicación en tiempo real de recursos (patrullas, motos, etc.)
-- Esta tabla será la base para el módulo de mapa operativo en tiempo real
CREATE TABLE IF NOT EXISTS resource_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id     UUID NOT NULL REFERENCES resources(id),
  user_id         UUID REFERENCES users(id),        -- conductor/responsable
  location        GEOMETRY(POINT, 4326) NOT NULL,
  velocidad_kmh   NUMERIC(5,1),
  rumbo_grados    NUMERIC(5,1),
  precision_metros NUMERIC(7,1),
  grabado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sectores de patrullaje definidos por unidad_operativa
CREATE TABLE IF NOT EXISTS patrol_sectors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id   UUID NOT NULL REFERENCES delegations(id),
  squad_id        UUID REFERENCES squads(id),
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  geom            GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT true,
  creado          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incidentes georreferenciados (módulo futuro)
CREATE TABLE IF NOT EXISTS incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id   UUID NOT NULL REFERENCES delegations(id),
  squad_id        UUID REFERENCES squads(id),
  reportado_por   UUID REFERENCES users(id),
  tipo            TEXT NOT NULL,
  descripcion     TEXT,
  location        GEOMETRY(POINT, 4326) NOT NULL,
  direccion       TEXT,
  estado          TEXT NOT NULL DEFAULT 'activo'
                  CHECK (estado IN ('activo','en_proceso','cerrado')),
  ocurrido_en     TIMESTAMPTZ NOT NULL,
  creado          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rutas de patrullaje planificadas
CREATE TABLE IF NOT EXISTS patrol_routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_day_id UUID REFERENCES planning_days(id),
  squad_id        UUID NOT NULL REFERENCES squads(id),
  nombre          TEXT NOT NULL,
  route           GEOMETRY(LINESTRING, 4326) NOT NULL,
  distancia_km    NUMERIC(7,2),
  creado          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- PASO 3: Índices espaciales GIST
-- Críticos para rendimiento — consultas ST_Within, ST_DWithin, etc.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_regions_geom
  ON regions USING gist(geom);

CREATE INDEX IF NOT EXISTS idx_delegations_geom
  ON delegations USING gist(geom);

CREATE INDEX IF NOT EXISTS idx_squads_sede
  ON squads USING gist(ubicacion_sede);

CREATE INDEX IF NOT EXISTS idx_squads_sector
  ON squads USING gist(sector_patrullaje);

CREATE INDEX IF NOT EXISTS idx_resource_locations_location
  ON resource_locations USING gist(location);

CREATE INDEX IF NOT EXISTS idx_resource_locations_time
  ON resource_locations(resource_id, grabado_en DESC);

CREATE INDEX IF NOT EXISTS idx_patrol_sectors_geom
  ON patrol_sectors USING gist(geom);

CREATE INDEX IF NOT EXISTS idx_incidents_location
  ON incidents USING gist(location);

CREATE INDEX IF NOT EXISTS idx_incidents_delegation
  ON incidents(delegation_id, ocurrido_en DESC);

CREATE INDEX IF NOT EXISTS idx_patrol_routes_geom
  ON patrol_routes USING gist(route);

-- =============================================================================
-- PASO 4: Funciones de consulta espacial
-- Estas reemplazarán filtros JavaScript actuales en el frontend
-- =============================================================================

-- Recursos dentro de un radio (metros) de un punto
CREATE OR REPLACE FUNCTION recursos_en_radio(
  lat FLOAT,
  lng FLOAT,
  radio_metros FLOAT
)
RETURNS TABLE (
  resource_id   UUID,
  nombre_recurso TEXT,
  indicativo    TEXT,
  estado        TEXT,
  distancia_m   FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rl.resource_id,
    r.nombre_recurso,
    r.indicativo,
    r.estado,
    ST_Distance(
      rl.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distancia_m
  FROM resource_locations rl
  JOIN resources r ON r.id = rl.resource_id
  WHERE
    ST_DWithin(
      rl.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radio_metros
    )
    AND rl.grabado_en = (
      SELECT MAX(grabado_en)
      FROM resource_locations rl2
      WHERE rl2.resource_id = rl.resource_id
    )
  ORDER BY distancia_m ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Incidentes en un sector de patrullaje
CREATE OR REPLACE FUNCTION incidentes_en_sector(
  p_sector_id UUID,
  p_desde     TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_hasta     TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  incident_id   UUID,
  tipo          TEXT,
  descripcion   TEXT,
  estado        TEXT,
  ocurrido_en   TIMESTAMPTZ,
  lat           FLOAT,
  lng           FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.tipo,
    i.descripcion,
    i.estado,
    i.ocurrido_en,
    ST_Y(i.location::geometry) AS lat,
    ST_X(i.location::geometry) AS lng
  FROM incidents i
  JOIN patrol_sectors ps ON ST_Within(i.location, ps.geom)
  WHERE
    ps.id = p_sector_id
    AND i.ocurrido_en BETWEEN p_desde AND p_hasta
  ORDER BY i.ocurrido_en DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Densidad de incidentes para heatmap (PostGIS grid)
CREATE OR REPLACE FUNCTION heatmap_incidentes(
  p_delegation_id UUID,
  p_desde         TIMESTAMPTZ DEFAULT now() - INTERVAL '90 days'
)
RETURNS TABLE (
  lat     FLOAT,
  lng     FLOAT,
  peso    BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    round(ST_Y(location::geometry)::numeric, 4)::float AS lat,
    round(ST_X(location::geometry)::numeric, 4)::float AS lng,
    count(*)::bigint AS peso
  FROM incidents
  WHERE
    delegation_id = p_delegation_id
    AND ocurrido_en >= p_desde
    AND estado != 'cerrado'
  GROUP BY
    round(ST_Y(location::geometry)::numeric, 4),
    round(ST_X(location::geometry)::numeric, 4)
  ORDER BY peso DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cobertura territorial: % del sector patrullado por una ruta
CREATE OR REPLACE FUNCTION cobertura_sector(
  p_route_id  UUID,
  p_sector_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  interseccion_area NUMERIC;
  sector_area       NUMERIC;
BEGIN
  SELECT
    ST_Area(ST_Intersection(
      ST_Buffer(pr.route::geography, 50)::geometry,
      ps.geom
    )::geography),
    ST_Area(ps.geom::geography)
  INTO interseccion_area, sector_area
  FROM patrol_routes pr, patrol_sectors ps
  WHERE pr.id = p_route_id
    AND ps.id = p_sector_id;

  IF sector_area = 0 THEN RETURN 0; END IF;
  RETURN round((interseccion_area / sector_area * 100)::numeric, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PASO 5: RLS para tablas GIS
-- =============================================================================

ALTER TABLE resource_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_sectors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_routes      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resource_locations_select"
  ON resource_locations FOR SELECT
  USING (
    current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_id
        AND r.delegation_id = current_user_delegation_id()
    )
  );

CREATE POLICY "patrol_sectors_select"
  ON patrol_sectors FOR SELECT
  USING (
    current_user_role() = 'admin'
    OR delegation_id = current_user_delegation_id()
  );

CREATE POLICY "incidents_select"
  ON incidents FOR SELECT
  USING (
    current_user_role() = 'admin'
    OR delegation_id = current_user_delegation_id()
  );

CREATE POLICY "incidents_write"
  ON incidents FOR INSERT UPDATE
  USING (current_user_role() IN ('admin','unidad_operativa','supervisor'))
  WITH CHECK (current_user_role() IN ('admin','unidad_operativa','supervisor'));

CREATE POLICY "patrol_routes_select"
  ON patrol_routes FOR SELECT
  USING (
    current_user_role() = 'admin'
    OR squad_id = current_user_squad_id()
    OR EXISTS (
      SELECT 1 FROM squads sq
      WHERE sq.id = squad_id
        AND sq.delegation_id = current_user_delegation_id()
    )
  );
