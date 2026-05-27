# SOP_OPERATIONAL_STATE.md
## Estado Operativo Actual — SOP V2
## Mayo 2026

---

## Estado Global

| Campo | Valor |
|-------|-------|
| **Versión activa** | V2.1A |
| **Paradigma** | Plataforma Institucional Operacional |
| **Firebase** | ✅ Eliminado completamente |
| **PostgreSQL-first** | ✅ Consolidado |

---

## Infraestructura

| Componente | Estado |
|------------|--------|
| Supabase PostgreSQL 17 | ✅ Operativo |
| RLS territorial base | ✅ Activa |
| Snapshots institucionales | ✅ Estables |
| Motor temporal (planning + sheets) | ✅ Estable 14/14 PASS |
| PDF institucional | ✅ Estable |
| Firebase código | ✅ Eliminado |
| Firebase dependencias npm | ✅ Eliminado (69 paquetes) |
| `ACTIVE_PROVIDER` | ✅ `'supabase'` |

---

## V1 — Cerrada ✅

Todo lo construido en V1 es base sólida de V2:

| Módulo | Estado |
|--------|--------|
| Arquitectura desacoplada | ✅ |
| Login + Auth Supabase | ✅ |
| CRUD administrativos | ✅ |
| Gestión territorial | ✅ |
| Gestión usuarios y recursos | ✅ |
| Órdenes de Ejecución (ORECPO) | ✅ |
| Planificación operativa + Excel | ✅ |
| Hojas de Servicio + PDF | ✅ |
| Snapshots completos | ✅ |
| RLS `service_sheets` activa | ✅ |
| Dashboards 5 roles estandarizados | ✅ |
| TarjetaPerfil con datos reales | ✅ |
| Responsive Mobile + Desktop | ✅ |

---

## V2 — Estado por Etapa

### V2.1A — ACTIVA 🔄

**Objetivo:** Implementar modelo organizacional multinivel.

**Pendiente:**
- Migración SQL: `parent_delegation_id` + `delegation_type` en `delegations`
- Función `get_delegation_scope()` en PostgreSQL
- Actualizar `DelegationRepository` con soporte `delegation_type`
- Actualizar `usePerfilUsuario` con `delegation_type`
- Crear delegación distrital de prueba subordinada a Puerto Jiménez
- Validar visibilidad jerárquica cantonal → distrital

**Documentos base:**
- `SOP_ORGANIZATIONAL_MODEL.md` — Aprobado
- `SOP_RLS_ACCESS_MATRIX.md` v1.0 — Base provisional

---

### V2.1B — Pendiente ⏳

Actualizar `SOP_RLS_ACCESS_MATRIX.md` a v2.0:
- Incorporar visibilidad jerárquica cantonal → distritales
- Ajuste `orders_select` para supervisor (solo `activa`)
- Ajuste `planning_select` para supervisor (solo su escuadra)
- Ajuste `planning_days` y `planning_activities` (hereda)

---

### V2.1C — Pendiente ⏳

RLS Test Harness multinivel:
- Cantonal ve sus distritales
- Distrital NO ve la cantonal ni otras distritales
- Supervisor distrital scope correcto
- Admin scope global
- Meta: mínimo 14/14 PASS (estándar motor temporal)

---

### V2.1D — Pendiente ⏳

Audit logs:
- Tabla `audit_logs` (ya existe en Supabase con política básica)
- Triggers para `service_sheets` (cambios de estado)
- Triggers para `resource_assignments` (asignaciones)
- Triggers para `users` (cambios de rol o delegación)

---

## Pendientes Técnicos Registrados

| ID | Descripción | Prioridad | Etapa |
|----|-------------|-----------|-------|
| T1 | Extensión `delegations` (`parent_delegation_id`, `delegation_type`) | ALTA | V2.1A |
| T2 | Función `get_delegation_scope()` | ALTA | V2.1A |
| T3 | RLS_ACCESS_MATRIX v2.0 | ALTA | V2.1B |
| T4 | Ajuste `orders_select` supervisor | ALTA | V2.1B |
| T5 | Ajuste `planning_select` supervisor | ALTA | V2.1B |
| T6 | RLS Test Harness multinivel | ALTA | V2.1C |
| T7 | Audit logs completos | MEDIA | V2.1D |
| T8 | Módulo agente | MEDIA | V2.2A |
| T9 | Flujo estados hojas (en_tramite, finalizada, cerrada) | MEDIA | V2.2B |
| T10 | Snapshots `sheet_activities` (accion, consecutivo) | MEDIA | V2.2B |
| T11 | Dashboards adaptativos por `delegation_type` | BAJA | V2.2C |
| T12 | jsPDF advertencia `5 units width` | BAJA | V2.3 |

---

## Reglas Permanentes

```
✅ Estilos inline — nunca Tailwind
✅ userData.id — nunca userData.uid
✅ delegation_id / squad_id — nomenclatura inglesa
✅ Soft delete — nunca DELETE físico
✅ Imports desde core/ — nunca Firebase ni Supabase directo en componentes
✅ Snapshots en documentos oficiales — nunca relaciones vivas
✅ PDF institucional — diseño intocable
✅ Motor temporal — congelado, no reabrir
✅ FirebaseProvider.js — eliminado definitivamente
```

---

## Proyecto Supabase

| Campo | Valor |
|-------|-------|
| Nombre | sistema-operativo-policial |
| Project ID | `dxqfloudusvxrufxgclv` |
| Región | us-east-1 |
| PostgreSQL | 17.6 |

---

*Última actualización: Mayo 2026 — V2.1A activa*
