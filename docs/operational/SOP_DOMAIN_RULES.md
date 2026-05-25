# SOP_DOMAIN_RULES.md

```md
---
name: sop-domain-rules
description: >
  Reglas operacionales e institucionales del dominio SOP.
  Cargar SIEMPRE cuando se trabaje:
  hojas de servicio, recursos, planificación,
  órdenes, asignaciones, escuadras,
  workflows operativos o snapshots.
---

# SOP — Domain Rules

## Territorialidad

users
 → delegations
 → regions

La región NO se guarda directamente en users.

---

# Regla Operacional Crítica

Un usuario NO puede:
- pertenecer a múltiples escuadras activas
- estar asignado simultáneamente a recursos incompatibles

---

# Recursos

resource_assignments:
- liberado_en = NULL → activo
- liberado_en != NULL → histórico

NO eliminar historial.

---

# Supervisores

Supervisor:
- ve delegación completa
- administra únicamente su escuadra

---

# Jefaturas

NO tienen squad_id.

Se obtienen mediante:
RPC:
get_jefaturas_delegacion()

---

# Hojas de Servicio

Son:
DOCUMENTOS OFICIALES.

Eso implica:
- formato fijo
- preservación visual
- integridad histórica
- snapshots obligatorios

---

# Snapshots Oficiales

Guardar:
- rango textual
- nombre textual
- recursos textuales
- composición exacta
- estado operacional

NO depender de relaciones vivas.

---

# Planificación

La planificación:
- coordina actividades
- recursos
- personal
- órdenes
- sectores

NO es CRUD simple.

---

# Órdenes Operativas

Las órdenes son:
contenedores operacionales institucionales.

Coordinan:
- personal
- recursos
- actividades
- territorio

---

# Services Recomendados

## OperationalAssignmentService

- asignaciones
- liberaciones
- consistencia operacional

---

## ServiceSheetService

- snapshots
- PDF oficial
- composición documental

---

## PlanningService

- actividades
- validación temporal
- exportación Excel

---

# Auditabilidad

Toda operación crítica futura debe registrar:
- actor
- entidad
- cambio
- timestamp
- scope territorial

---

# Anti-Patterns Prohibidos

❌ JOINs RLS problemáticos desde frontend  
❌ user.uid  
❌ service_role frontend  
❌ SECURITY DEFINER excesivo  
❌ relaciones vivas para documentos oficiales  
❌ lógica operacional dentro de componentes React
```
