# SOP_OPERATIONAL_STATE.md

```md
---
name: sop-operational-state
description: >
  Estado operativo y técnico ACTUAL del Sistema Operativo Policial.
  Cargar cuando el usuario pregunte:
  qué está pendiente, estado actual, avances,
  bugs recientes, Fase 5, hojas de servicio,
  órdenes, planificación o problemas activos.
---

# SOP — Operational State

## Estado Global

Migración Firebase → Supabase:
✅ Arquitectura desacoplada
✅ Login Supabase
✅ PostgreSQL operativo
✅ RLS territorial
✅ Gestión usuarios
✅ Gestión recursos
✅ Gestión territorial
✅ CRUD administrativos
✅ Relaciones operativas

---

# Estado por Fases

| Fase | Estado |
|------|--------|
| Fase 1–4B | ✅ Completa |
| Fase 5A — Órdenes | ✅ Completa |
| Fase 5B — Planificación | ✅ Completa, validada y estabilizada |
| Fase 5C — Hojas Servicio | 🔄 En progreso |
| Fase 6 — Limpieza Firebase | ⏳ Pendiente |

---

# Pendientes Críticos

## 1. RLS desactivada en service_sheets

Estado actual:
ALTER TABLE service_sheets DISABLE ROW LEVEL SECURITY;

Motivo:
Recursión infinita en políticas agente.

Pendiente:
reescribir políticas correctamente.

---

## 2. Snapshots incompletos

Actualmente:
- sheet_activities
- order_actions
- planning_activities

todavía dependen parcialmente de relaciones vivas.

Debe definirse:
- snapshot completo
o
- modelo híbrido controlado.

---

## 3. Firebase residual

Todavía existen:
- imports Firebase
- servicios legacy
- rastros Firebase Storage

Pendiente:
Fase 6 cleanup.

---

## 4. Audit Logs

NO implementado todavía.

Debe registrar:
- actor
- acción
- entidad
- valores anteriores
- timestamp
- scope territorial

---

# Estado Operacional Actual

## Dominio Temporal Operacional Estabilizado

Estado:
✅ COMPLETADO Y VALIDADO (Fase 5B cerrada formalmente)

Alcance validado:
- `planning_activities` estabilizado con motor temporal operacional SQL.
- `sheet_activities` alineado bajo el mismo criterio temporal compartido.
- validación frontend + backend consistente para nocturnidad.
- integración estable planificación → hoja → PDF.

Pruebas realizadas:
- harness SQL operacional:
  - `database/tests/planning_activities_temporal_validation.sql`
- cobertura:
  - turnos diurnos, nocturnos y 24h
  - cruces medianoche
  - solapamientos
  - frontera `00:00`
  - igualdad inicio/fin
  - fuera de turno

Resultado final validado:
- `total_cases: 14`
- `passed_cases: 14`
- `failed_cases: 0`

Módulos/artefactos validados:
- migración `004_fix_operational_time_validation.sql`
- migración `005_fix_sheet_activities_operational_time.sql`
- `frontend/src/utils/timeUtils.js`
- `VerPlanificacion.jsx`
- `CrearHojaServicio.jsx`
- `ServiceSheetRepository.js`
- `generarPDFHojaServicio.js`

Referencia institucional:
- `docs/database/SOP_OPERATIONAL_TIME_ENGINE.md`

## GestionEscuadra

Ya maneja:
- exclusividad operacional
- consistencia territorial
- composición táctica

---

## GestionRecurso

Ya maneja:
- asignaciones multi-entidad
- historial operacional
- liberación automática
- coordinación users/resources

---

# Hojas de Servicio

Estado:
🔄 En desarrollo avanzado.

IMPORTANTE:
El PDF institucional NO puede cambiar diseño.

El documento ya debe tratarse como:
documento oficial institucional.

---

# Reglas PDF

NO reconstruir desde estado vivo.

Guardar:
- snapshots
- nombres
- rangos
- recursos
- composición completa

para preservar:
estado exacto del momento operativo.

---

# Próximos Objetivos

## Fase 5C

Completar:
- hojas
- snapshots
- PDF final institucional
- RLS correcta

---

## Fase 6

Eliminar:
- Firebase residual
- services legacy
- imports directos

---

# Estado Arquitectónico Real

El proyecto ya NO es:
“Frontend conectado a Supabase”.

Ahora es:
“Backend institucional operacional con reglas reales”.
```
