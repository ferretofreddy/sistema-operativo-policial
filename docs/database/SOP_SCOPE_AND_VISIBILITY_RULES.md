# SOP_SCOPE_AND_VISIBILITY_RULES.md
## Sistema Operativo Policial — Fuerza Pública de Costa Rica
## Reglas Oficiales de Scope, Visibilidad y Coordinación Institucional
## Versión 2.0 | Mayo 2026

---

## 1. PROPÓSITO

Este documento define exactamente quién puede ver qué,
quién puede administrar qué, y cómo se comporta la jerarquía
institucional dentro del SOP V2.

Es la referencia operacional para:
- Diseño de UI (qué mostrar a cada rol)
- Diseño de queries (qué filtrar para cada rol)
- Diseño de RLS (qué proteger en PostgreSQL)
- Auditorías (verificar que el scope es correcto)

---

## 2. PRINCIPIO FUNDAMENTAL

```
VISIBILIDAD ≠ AUTORIDAD
```

Un usuario puede **ver** información sin poder **modificarla**.
Los permisos de lectura y escritura son independientes.

**Ejemplo:** Jefatura ve todas las hojas de su delegación (lectura),
pero solo puede cerrarlas — no puede editarlas una vez en estado
`en_tramite` o posterior.

---

## 3. JERARQUÍA DE SCOPE TERRITORIAL

```
SCOPE GLOBAL
  └── Admin

SCOPE DELEGACIÓN + SUBORDINADOS
  ├── Jefatura cantonal
  ├── Unidad operativa cantonal
  ├── Jefatura distrital (scope: solo su distrital)
  └── Unidad operativa distrital (scope: solo su distrital)

SCOPE ESCUADRA
  └── Supervisor

SCOPE PERSONAL
  └── Agente
```

---

## 4. REGLAS POR ROL — DETALLADAS

---

### ADMIN

**Ve:** Todo el sistema sin restricción territorial.

**Administra:** Todo — estructura, usuarios, recursos, configuración.

**Restricción crítica:**
- NO puede modificar hojas en estado `cerrada`
- NO puede eliminar físicamente entidades operativas (solo soft delete)
- Acciones sobre documentos tramitados quedan en audit_log

---

### JEFATURA (cantonal o distrital)

**Ve:**
- Su delegación completa
- Si es cantonal: sus distritales subordinadas (via `get_delegation_scope`)
- Si es distrital: solo su distrital (sin ver la cantonal ni otras distritales)
- Órdenes de ejecución — todos los estados: activa, planificada, vencida
- Planificaciones de cualquier escuadra de su scope
- Hojas de servicio de su scope — todos los estados

**Administra:**
- Puede crear hojas de servicio (casos de emergencia o ausencia de supervisor)
- Puede cerrar hojas en estado `finalizada`
- NO puede editar hojas en estado `en_tramite`, `finalizada` o `cerrada`
- NO tiene injerencia sobre documentos tramitados o finalizados

**Coordinación:**
- Coordina con distritales subordinadas (si es cantonal)
- Autoriza operaciones que excedan el scope de una distrital
- Recibe y da respuesta a órdenes de la dirección regional (SOP v3)

---

### UNIDAD OPERATIVA (cantonal o distrital)

**Ve:** Mismo scope que jefatura de su nivel.

**Administra:**
- Crea y gestiona órdenes de ejecución de su delegación
- Crea y gestiona planificaciones de cualquier escuadra de su scope
- Puede crear hojas de servicio
- Puede cerrar hojas en estado `finalizada`
- Asume funciones de supervisor cuando no hay supervisor en una escuadra

**Diferencia con jefatura:**
- Rol más táctico/operativo que estratégico
- Gestión directa de planificación y coordinación de escuadras

---

### SUPERVISOR

**Ve:**
- SOLO su escuadra
- Órdenes de ejecución: SOLO estado `activa` de su delegación
  (no necesita gestionar referencias históricas)
- Planificación: SOLO la de su escuadra (no puede ver otras escuadras)
- Hojas de servicio: SOLO las de su escuadra
  - Vista operativa: `pendiente` e `in_tramite`
  - Para revisión: `finalizada`
  - Histórico: `cerrada` (solo lectura)

**Administra:**
- Gestiona su escuadra tácticamente
- Crea hojas de servicio para su escuadra
- Edita hojas en estado `pendiente` (incluyendo reasignar personal)
- NO puede editar hojas en estado `en_tramite` o posterior
- Revisa hojas `finalizada` y decide: cerrar o devolver al agente
- Marca hojas como `cerrada` — acción irreversible

**Ejecuta las planificaciones mediante hojas de servicio:**
- Designa qué personal y qué recurso realiza cada actividad
- Es quien conoce el recurso humano y móvil disponible en el turno

---

### AGENTE

**Ve:**
- SOLO hojas donde aparece en `personal_snapshot`
- Estado visible: `en_tramite` y `finalizada` (NO ve `pendiente`)
- Sus propias asignaciones de recursos

**Administra:**
- En estado `en_tramite`: puede agregar resultados y novedades
- En estado `finalizada` devuelta: puede corregir datos estadísticos
- NO puede crear hojas de servicio
- NO puede ver hojas de otros agentes

**Flujo de recepción:**
- La hoja `pendiente` se vuelve visible cuando pasa a `en_tramite`
- La transición la activa el agente al ingresar "Ver tareas del día"
- Módulo agente implementado en V2.2A

---

## 5. REGLAS DE VISIBILIDAD POR ENTIDAD

### Órdenes de Ejecución

| Rol | Ve | Puede crear/editar |
|-----|----|--------------------|
| Admin | Todas | Sí |
| Jefatura | Toda su delegación — todos los estados | No |
| Unidad operativa | Toda su delegación — todos los estados | Sí |
| Supervisor | Solo `activa` de su delegación | No |
| Agente | No ve | No |

**Filtros disponibles para jefatura/unidad_operativa:**
- Por estado: activa, planificada, vencida
- Por fecha
- Por número de orden

---

### Planificaciones

| Rol | Ve | Puede crear/editar |
|-----|----|--------------------|
| Admin | Todo | Sí |
| Jefatura | Toda su delegación + scope | Sí |
| Unidad operativa | Toda su delegación + scope | Sí |
| Supervisor | SOLO su escuadra | No |
| Agente | No ve | No |

---

### Hojas de Servicio

| Rol | Ve | Estados visibles | Puede editar |
|-----|----|-----------------|--------------|
| Admin | Todo | Todos | pendiente, en_tramite, finalizada |
| Jefatura | Su scope | Todos | pendiente, puede cerrar finalizada |
| Unidad op. | Su scope | Todos | pendiente, puede cerrar finalizada |
| Supervisor | Su escuadra | pendiente, en_tramite, finalizada | Solo pendiente |
| Agente | Sus hojas | en_tramite, finalizada | Solo en_tramite y finalizada devuelta |

**Regla de oro:** Estado `cerrada` — NADIE puede modificar.

---

### Recursos y Asignaciones

| Rol | Ve recursos | Puede asignar |
|-----|------------|---------------|
| Admin | Todo | Sí |
| Jefatura | Su delegación + scope | No directamente (coordina) |
| Unidad operativa | Su delegación + scope | Sí |
| Supervisor | Su delegación | Sí (su escuadra) |
| Agente | Sus asignaciones propias | No |

---

## 6. REGLAS DE DISTRITALES

```
DISTRITAL ve:    solo lo suyo
CANTONAL ve:     lo suyo + todas sus distritales
DISTRITAL NO ve: la cantonal ni otras distritales hermanas
```

**Cadena de mando distrital:**
```
Jefatura distrital
  ↓
Unidad operativa distrital (puede no existir → UO cantonal asume)
  ↓
Supervisores distritales
  ↓
Agentes distritales
```

**Regla de subordinación:**
- La distrital requiere coordinación/autorización de la cantonal
  para operaciones que excedan su scope
- La cantonal puede emitir órdenes que apliquen a sus distritales
- La distrital puede emitir órdenes internas propias

---

## 7. REGLA DE SUSTITUCIÓN JERÁRQUICA

Cuando un nivel no existe, el nivel superior asume funciones operativas.
**Esta lógica vive en la aplicación, NO en RLS.**

```
Sin supervisor en escuadra:
  → Unidad operativa asume coordinación de la escuadra

Sin unidad operativa distrital:
  → Unidad operativa cantonal asume coordinación

Sin jefatura distrital:
  → Jefatura cantonal asume visibilidad y control

Sin escuadra activa en distrital:
  → La cantonal asume respuesta operativa del territorio
```

**Importante:** La sustitución no cambia el scope de RLS.
RLS siempre aplica el scope del usuario autenticado.
La lógica de sustitución determina qué usuario se activa
para la tarea, no qué puede ver.

---

## 8. REGLAS DE DOCUMENTOS OFICIALES

### Snapshots
Los documentos oficiales (hojas de servicio, PDF) capturan el estado
exacto del momento operativo. Son inmutables históricamente.

```
Un cambio posterior en:
  - delegación del supervisor
  - escuadra del agente
  - nombre del recurso
  - jerarquía territorial

NO afecta un documento ya creado.
Los snapshots preservan la realidad del momento.
```

### Estado cerrada
```
Una hoja en estado 'cerrada':
  ✅ Es un documento oficial institucional
  ✅ Equivale al documento físico firmado
  ✅ NADIE puede modificarla, incluyendo admin
  ✅ Solo lectura para todos los roles
  ✅ Permanece visible para trazabilidad y auditoría
```

---

## 9. UNIDADES ESPECIALES (GAO, UIP, Fuerza de Tarea)

Comparten la misma arquitectura base que las delegaciones.
Su scope operacional es propio de su unidad.

```
delegation_type = 'special_unit'
parent_delegation_id = NULL (o ID de región en V3)
```

**Operan bajo:**
- Órdenes de servicio de la dirección regional (V3)
- En apoyo a delegaciones cantonales cuando se solicita

**Coordinación de apoyo:**
```
Delegación cantonal solicita apoyo → Dirección regional autoriza
→ GAO/UIP se despliega → Opera bajo ORECPO específica
→ Al finalizar, regresa a su scope base
```

La coordinación de apoyo temporal es lógica de aplicación
en SOP V3. En V2.1 se documenta el modelo pero no se implementa
el flujo de despliegue temporal.

---

## 10. ANTI-PATTERNS DE SCOPE

```
❌ Mostrar datos en UI basándose solo en props del frontend
❌ Asumir que si el usuario puede navegar a una ruta, puede ver los datos
❌ Filtrar datos solo en el componente sin RLS como respaldo
❌ Hardcodear delegation_id en queries del frontend
❌ Usar el scope de otra persona (impersonation)
❌ Ignorar el delegation_type en decisiones de visibilidad
❌ Tratar distritales como casos especiales de UI
```

---

## 11. EVOLUCIÓN DE SCOPE EN V3

Reservado para implementación futura:

```
SCOPE REGIONAL (V3):
  Subdirección regional ve: todas las cantonales de su jurisdicción
  Región ve: todo bajo su dirección
  Integración: órdenes de servicio regionales
  Despliegues: unidades especiales temporales
```

La arquitectura V2 (parent_delegation_id + get_delegation_scope)
está diseñada para extenderse hacia V3 sin ruptura.

---

*Documento operacional — Sistema Operativo Policial V2*
*Fuerza Pública de Costa Rica | Mayo 2026*
