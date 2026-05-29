# SOP Temporal Engine - planning_activities

## Propósito

Definir la validación horaria oficial en PostgreSQL para `public.planning_activities`, con soporte operativo para:

- turnos normales (`05:00-17:00`),
- turnos nocturnos (`17:00-05:00`),
- turno extendido (`00:00-23:59`),
- control de solapamientos por `planning_day_id`.

## Alcance

Implementado en migración:

- `database/migrations/004_fix_operational_time_validation.sql`

Incluye:

1. Reemplazo del CHECK legacy lineal (`hora_fin > hora_inicio`).
2. CHECK mínimo de integridad:
   - `hora_inicio IS NOT NULL`
   - `hora_fin IS NOT NULL`
   - `hora_inicio <> hora_fin`
3. Función `public.validate_planning_activity_horario()`.
4. Trigger `trg_validate_planning_activity_horario` (`BEFORE INSERT OR UPDATE`).

## Modelo de validación

### 1) Turno del día como fuente de verdad

Se obtiene desde `planning_days.turno` usando `NEW.planning_day_id`.

### 2) Normalización temporal para nocturnos

Para `17:00-05:00`, los horarios se evalúan en eje continuo:

- base `17:00` (1020 min),
- valores menores a `17:00` se mueven a `+1440`,
- permite rangos como `23:00 -> 01:00` sin romper integridad.

### 3) Reglas de aceptación

- rechazo si `hora_inicio = hora_fin`,
- rechazo si `hora_fin <= hora_inicio` luego de normalización,
- rechazo si actividad cae fuera del turno del día,
- rechazo si solapa con otra actividad del mismo `planning_day_id`.

### 4) Solapamiento

Se usan intervalos semiabiertos `[inicio, fin)` para permitir fronteras contiguas sin falso solape.

## Beneficios

- Alinea backend con frontend corregido (`timeUtils`).
- Evita inconsistencias por inserciones directas fuera del cliente.
- Mantiene integridad operacional en DB (fuente final de verdad).

## No cubierto en esta fase

- rediseño del catálogo de turnos,
- normalización temporal avanzada con columnas derivadas,
- estrategia temporal integral de snapshots.

Eso queda para Fase 6 (según roadmap SOP).
