# SOP_OPERATIONAL_TIME_ENGINE.md

## 1) Contexto Histórico del Problema

Durante la migración Firebase → Supabase, el dominio temporal operativo heredó validaciones lineales en PostgreSQL para horarios:

- `hora_fin > hora_inicio`

Esa regla funcionaba para turnos diurnos simples, pero rompía operaciones reales del SOP en turnos nocturnos con cruce de medianoche.

Casos operativos válidos que fallaban:

- `21:00 -> 00:00`
- `23:00 -> 02:00`
- `00:30 -> 04:00`

Como resultado, la planificación podía validar parcialmente en frontend, pero el backend rechazaba inserciones con `23514`.

---

## 2) Error 23514 y Constraints Legacy

Los errores observados eran `CHECK CONSTRAINT VIOLATION (23514)` en:

- `planning_activities_horario_check` (antes de Fase 5B)
- `sheet_activities_horario_check` (antes de Fase 5C)

Constraints legacy lineales:

- `CHECK (hora_fin > hora_inicio)`

Este enfoque interpreta los `time` en eje diario lineal, sin modelo operacional de turno.

---

## 3) Causa Raíz Arquitectónica

La causa raíz no era un bug puntual de UI. Era una desalineación de capas:

1. **Dominio operativo real**: turnos nocturnos y cruces medianoche son válidos.
2. **Frontend**: fue adaptado a lógica operacional.
3. **SQL legacy**: mantenía lógica lineal incompatible.

Conclusión:
el sistema tenía dos criterios temporales distintos (cliente vs base de datos), generando inconsistencias.

---

## 4) Validación Lineal vs Validación Operacional

### Validación lineal (legacy)

- Supuesto: `inicio < fin` en mismo día.
- Falla para nocturnos.

### Validación operacional (nuevo estándar SOP)

Depende del turno del día:

- Turno normal: `hora ∈ [inicio, fin]`
- Turno nocturno (fin < inicio): normalización en eje continuo con +1440 cuando cruza medianoche.
- Validación por rango, por turno y por solapamientos.

---

## 5) Turnos Nocturnos y Cruces de Medianoche

Turnos oficiales soportados:

- `05:00-17:00`
- `17:00-05:00`
- `00:00-23:59`

Para `17:00-05:00`, el motor transforma horas en una línea temporal extendida:

- `23:00` permanece en día base.
- `00:30` se normaliza al día siguiente (`+1440`).

Esto permite validar correctamente:

- pertenencia al turno,
- rangos consistentes,
- fronteras,
- solapamientos.

---

## 6) Motor Temporal Frontend

Archivo principal:

- [frontend/src/utils/timeUtils.js](c:/Users/ferre/Desktop/sistema-operativo/frontend/src/utils/timeUtils.js)

Funciones clave:

- `normalizeTimeForTurno`
- `validateRangeInTurno`
- `rangesOverlap`
- `isTimeInTurno`

Objetivo frontend:

- feedback inmediato al usuario,
- bloqueo temprano de errores operativos,
- coherencia visual con la lógica institucional.

El frontend no reemplaza la integridad DB; solo la complementa.

---

## 7) Motor Temporal SQL (Server-Side)

### Planning (Fase 5B)

Migración:

- [database/migrations/004_fix_operational_time_validation.sql](c:/Users/ferre/Desktop/sistema-operativo/database/migrations/004_fix_operational_time_validation.sql)

Implementación:

- CHECK mínimo: no nulos y `hora_inicio <> hora_fin`
- trigger `validate_planning_activity_horario()`
- validación de turno + rango + solapamiento por `planning_day_id`

### Hojas (Fase 5C)

Migración:

- [database/migrations/005_fix_sheet_activities_operational_time.sql](c:/Users/ferre/Desktop/sistema-operativo/database/migrations/005_fix_sheet_activities_operational_time.sql)

Implementación:

- reemplazo de CHECK legacy lineal
- CHECK mínimo equivalente a planning
- trigger `validate_sheet_activity_horario()`
- fuente de turno: `service_sheets.planning_day_id -> planning_days.turno`
- solapamiento por `service_sheet_id`
- helpers SQL compartidos:
  - `sop_time_to_minutes`
  - `sop_operational_window`
  - `sop_normalize_minutes`

---

## 8) Solapamientos Operacionales

Criterio oficial:

- intervalos semiabiertos `[inicio, fin)` para permitir fronteras contiguas sin falso solape.

Se valida server-side en triggers para:

- evitar doble asignación horaria en mismo día/hoja,
- preservar consistencia operativa institucional.

---

## 9) Integración Planificación → Hoja → PDF

Flujo estabilizado:

1. Planificación crea actividades temporales válidas.
2. Hoja de servicio consume actividades seleccionadas.
3. `sheet_activities` persiste horarios con el mismo criterio temporal.
4. PDF exporta horarios ya consistentes.

Resultado:
el documento oficial refleja el estado operativo real, incluyendo nocturnidad.

---

## 10) Harness SQL y Validación 14/14 PASS

Archivo:

- [database/tests/planning_activities_temporal_validation.sql](c:/Users/ferre/Desktop/sistema-operativo/database/tests/planning_activities_temporal_validation.sql)

Cobertura:

- turnos diurnos/nocturnos/24h
- cruces medianoche
- frontera `00:00`
- igualdad inicio/fin
- fuera de turno
- solapamientos y adyacencias

Estado final:

- `total_cases = 14`
- `passed_cases = 14`
- `failed_cases = 0`

---

## 11) Riesgos Mitigados

Se mitigaron:

- rechazos falsos de actividades nocturnas válidas,
- divergencia frontend/backend,
- inconsistencias entre planificación y hoja,
- pérdida de trazabilidad operacional en documento final.

---

## 12) Impacto en Snapshots Futuros

Impacto positivo directo:

- snapshots de hoja pueden capturar actividades nocturnas válidas sin truncamiento por SQL legacy.

Pendiente Fase 6:

- consolidar estrategia de snapshots históricos completos por dominio operativo.

---

## 13) Impacto en Exportaciones Oficiales

PDF y exportaciones dependen de datos persistidos.
Al estabilizar inserción de nocturnidad:

- se evita omisión de actividades legítimas,
- se preserva consistencia documental institucional.

---

## 14) Recomendaciones Fase 6

1. Consolidar motor temporal SQL común para dominios operativos (`planning`, `sheet`, futuros módulos).
2. Estandarizar catálogo de turnos estructurado (inicio/fin/cruce) en vez de depender de string.
3. Agregar suite SQL de regresión temporal para CI/CD.
4. Definir contratos de error (códigos/mensajes) entre triggers y frontend.
5. Auditar tablas futuras que incluyan `hora_inicio/hora_fin` antes de liberar nuevos módulos.

---

## 15) Consolidación Temporal Institucional Futura

Estado actual:

- SOP ya opera con un criterio temporal operacional consistente entre planificación y hojas.

Evolución objetivo:

- institucionalizar un único “Temporal Domain Engine” reusable,
- con pruebas automáticas, trazabilidad y documentación viva para auditoría.

---

## Conclusión Institucional

El SOP utiliza ahora un **único criterio temporal operacional compartido** entre:

- planificación (`planning_activities`),
- hojas de servicio (`sheet_activities`),
- validaciones frontend,
- persistencia SQL server-side,
- y exportación documental.

La estabilización de Fase 5B/5C elimina el conflicto histórico de nocturnidad y establece base sólida para Fase 6.
