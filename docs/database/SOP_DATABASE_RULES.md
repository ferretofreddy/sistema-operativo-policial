# SOP_DATABASE_RULES.md

````md
---
name: sop-database-rules
description: >
  Arquitectura SQL, relaciones PostgreSQL, snapshots, RLS,
  RPCs y reglas institucionales del backend Supabase/PostgreSQL
  del Sistema Operativo Policial (SOP).
  Cargar SIEMPRE cuando se trabaje:
  SQL, Supabase, RLS, snapshots, service_sheets,
  planning, orders, resource_assignments,
  PostgreSQL o integridad operacional.
---

# SOP — Database Rules

## Backend Oficial

Proyecto Supabase:
- sistema-operativo-policial
- Región: us-east-1
- PostgreSQL 17

Base de datos:
PostgreSQL relacional institucional.

---

# Principio Arquitectónico Principal

El sistema ya NO usa:
- documentos denormalizados,
- arrays Firestore,
- relaciones implícitas.

Ahora utiliza:
- relaciones SQL reales,
- foreign keys,
- junction tables,
- snapshots JSONB,
- RLS territorial.

---

# Territorialidad Oficial

Jerarquía:

regions
 ↓
delegations
 ↓
squads
 ↓
users/resources

---

# Regla Crítica

users NO tiene region_id.

La región se obtiene mediante:

users
 → delegations
 → regions

Nunca asumir region_id directo en users.

---

# Tablas Principales

## regions

Representa regiones policiales.

Campos importantes:
- id
- nombre
- estado

---

## delegations

Delegaciones territoriales.

FK:
- region_id → regions.id

---

## squads

Escuadras operativas.

FK:
- delegation_id → delegations.id
- supervisor_id → users.id

---

## users

Personal institucional.

Campos importantes:
- id
- auth_id
- nombre
- apellido1
- apellido2
- rol
- rank_id
- delegation_id
- squad_id
- estado_usuario

---

# Regla Crítica Users

❌ users.uid NO existe  
✅ usar users.id o users.auth_id

---

## resources

Recursos operativos.

Ejemplo:
- vehículos
- motocicletas
- unidades

---

## resource_assignments

Historial operacional de asignaciones.

Campos críticos:
- resource_id
- user_id
- asignado_en
- liberado_en

---

# Regla Operacional Crítica

```sql
liberado_en IS NULL
````

significa:
asignación ACTIVA.

NO eliminar registros históricos.

---

# Orders

orders:
contenedor operacional institucional.

Coordina:

* planificación,
* actividades,
* recursos,
* operaciones.

---

# Planning

planning:
estructura temporal operacional.

planning_days:
segmentación diaria.

planning_activities:
actividades operativas concretas.

---

# Regla Sectorial

sector:
ubicación exacta física.

sector_dinamico:
zona operacional general.

NO confundir.

---

# service_sheets

Documento operacional oficial.

NO es CRUD simple.

Representa:

* snapshot institucional,
* documento auditable,
* evidencia operacional.

---

# Snapshots JSONB

## supervisor_snapshot

```json
{
  "user_id": "uuid",
  "nombre": "",
  "apellido1": "",
  "apellido2": "",
  "rango": ""
}
```

---

## personal_snapshot

```json
[
  {
    "user_id": "uuid",
    "nombre": "",
    "apellido1": "",
    "apellido2": "",
    "rango": "",
    "resource_id": "uuid"
  }
]
```

---

## recursos_snapshot

```json
[
  {
    "resource_id": "uuid",
    "nombre_recurso": "",
    "tipo": "",
    "unidad": "",
    "indicativo": ""
  }
]
```

---

# Regla Crítica Snapshot

Los documentos oficiales NO deben depender de:

* joins vivos,
* datos actuales,
* relaciones mutables.

Siempre preservar:
estado exacto del momento operativo.

---

# Problema Actual Importante

sheet_activities todavía depende parcialmente de:

* orders
* order_actions

Pendiente:
agregar snapshots completos de:

* consecutivo orden
* acción
* detalle
* descripción

---

# RLS

La seguridad principal vive en PostgreSQL.

NO en React.

---

# current_user_role()

Fuente oficial del rol JWT.

NO confiar en frontend.

---

# current_user_delegation_id()

Fuente oficial de delegation scope.

---

# current_user_squad_id()

Fuente oficial de squad scope.

---

# SECURITY DEFINER

Usar únicamente para:

* operaciones cross-scope,
* workflows institucionales,
* administración global.

NO usar como reemplazo de RLS.

---

# RPCs Oficiales

## get_jefaturas_delegacion()

Obtiene jefaturas sin bloqueo RLS escuadra.

---

## asignar_oficial_a_recurso()

Workflow institucional oficial.

NO insertar manualmente assignments.

---

## remover_oficial_de_recurso()

Libera asignación específica.

---

## liberar_recurso()

Libera recurso completo y personal asociado.

---

# Problema Crítico Actual

service_sheets tiene:

```sql
ALTER TABLE service_sheets DISABLE ROW LEVEL SECURITY;
```

Motivo:
recursión infinita en políticas agente.

Estado:
TEMPORAL.

Pendiente:
reescribir políticas correctamente.

---

# Regla RLS Importante

Supervisor:

* ve delegación completa,
* administra únicamente su escuadra.

---

# Jefaturas

NO tienen squad_id.

Se obtienen mediante:
RPC SECURITY DEFINER.

---

# Anti-Patterns SQL Prohibidos

❌ Relaciones vivas en documentos oficiales
❌ service_role frontend
❌ JOINs problemáticos desde UI
❌ DELETE físico entidades operativas
❌ RLS desactivada permanente
❌ lógica institucional en componentes React

---

# Estrategia Snapshot Recomendada

Hojas:
snapshot COMPLETO.

Planificación:
modelo híbrido.

Órdenes:
pendiente definir.

---

# Futuro Arquitectónico

Pendientes:

* audit_logs
* PostGIS
* estadísticas
* dashboards
* resultados operativos
* automatización institucional
* workflows multi-entidad

```
```
