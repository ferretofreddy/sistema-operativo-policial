# SOP_KNOWN_ISSUES.md

```md
---
name: sop-known-issues
description: >
  Problemas conocidos, bugs históricos, soluciones aplicadas
  y decisiones técnicas importantes del SOP.
  Cargar cuando se trabaje:
  login, RLS, routing, snapshots,
  PDF, joins, users, App.jsx,
  ProtectedRoute o errores históricos.
---

# SOP — Known Issues

## 1. Loop infinito ProtectedRoute

Problema:
userData.uid no existe en PostgreSQL.

Solución:
usar:
- userData.id
- userData.auth_id

---

## 2. Wildcard Redirect Loop

Problema:
<Route path="*" element={<Navigate />} />

interceptaba subrutas admin.

Solución:
RolRedirect + startsWith().

---

## 3. JOIN resource_assignments → users

Problema:
RLS rompe joins complejos.

Solución:
2 queries separadas:
1. assignments
2. UserRepository.getById()

---

## 4. Jefaturas invisibles

Problema:
RLS escuadra filtraba jefaturas.

Solución:
RPC:
get_jefaturas_delegacion()

---

## 5. sector vs sector_dinamico

Problema:
confusión operacional.

Correcto:
- sector = lugar exacto
- sector_dinamico = zona general

---

## 6. PDF recurso incorrecto

Problema:
todos los oficiales mostraban mismo recurso.

Solución:
match por:
resource_id.

---

## 7. turno_operativo incorrecto

Problema:
se guardaba desde planning_day.

Solución:
guardar desde:
horarioInicio-horarioFin
del formulario real.

---

## 8. RLS recursiva service_sheets

Problema:
subqueries recursivas agente.

Estado actual:
RLS temporalmente desactivada.

Pendiente:
reescritura segura.

---

## 9. Firebase UID mismatch

Problema:
uid Firebase ≠ UUID PostgreSQL.

Solución:
auth_id + id.

---

## 10. FIELD_MAP incorrecto

Problema:
region_id → delegation_id

Eliminado completamente.

Nunca inferir relaciones territoriales incorrectas.

---

# Regla Histórica Importante

NO usar:
- nombres Firebase,
- estructura Firestore,
- uid,
- relaciones implícitas.

El proyecto ahora es:
PostgreSQL institucional real.
```
