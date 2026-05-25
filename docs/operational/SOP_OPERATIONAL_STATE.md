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
| Fase 5B — Planificación | ✅ Completa |
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
