# SOP_KNOWN_ISSUES.md
## Issues Conocidos, Soluciones Aplicadas y Decisiones Técnicas
## SOP V2 | Mayo 2026

---

## ISSUES CERRADOS — V1

### I01 — Loop infinito ProtectedRoute
**Causa:** `userData.uid` no existe en PostgreSQL.
**Solución:** Usar `userData.id` (UUID interno) o `userData.auth_id`.

### I02 — Wildcard Redirect Loop
**Causa:** `<Route path="*">` interceptaba subrutas admin.
**Solución:** `RolRedirect` + `startsWith()`.

### I03 — JOIN resource_assignments → users rompía RLS
**Causa:** RLS bloqueaba joins complejos.
**Solución:** 2 queries separadas: assignments → `UserRepository.getById()`.

### I04 — Jefaturas invisibles
**Causa:** RLS de escuadra filtraba jefaturas (sin `squad_id`).
**Solución:** RPC `get_jefaturas_delegacion()` con SECURITY DEFINER.

### I05 — sector vs sector_dinamico confundidos
**Correcto:**
- `sector` = lugar físico exacto ("Frente a Banco Nacional")
- `sector_dinamico` = zona general ("PUERTO JIMÉNEZ CENTRO")

### I06 — PDF mostraba mismo recurso para todos los oficiales
**Causa:** Match incorrecto en snapshot.
**Solución:** Match por `resource_id` en `personal_snapshot`.

### I07 — turno_operativo guardaba valor incorrecto
**Causa:** Se tomaba de `planning_day.turno`.
**Solución:** Guardar desde `horarioInicio-horarioFin` del formulario.

### I08 — RLS recursiva en service_sheets (42P17)
**Causa:** Política SELECT del agente referenciaba `service_sheets`
desde `sheet_officers`, creando ciclo.
**Solución (V1 Fase 6A.2):** Reemplazar subquery por
`personal_snapshot @> jsonb_build_array(...)` — sin JOIN, sin recursión.
**Estado:** ✅ CERRADO

### I09 — Firebase UID mismatch
**Causa:** `uid` Firebase ≠ UUID PostgreSQL.
**Solución:** Usar `auth_id` (Supabase Auth UID) + `id` (UUID interno).

### I10 — FIELD_MAP infería region_id incorrecto
**Causa:** Intentaba inferir región directamente desde `users`.
**Solución:** Eliminado. La región se obtiene via `users → delegations → regions`.

### I11 — Panel supervisor mostraba "—" en todos los campos
**Causa:** `userData` solo contiene IDs, no nombres.
Los dashboards usaban campos Firebase legacy inexistentes.
**Solución (V1 Fase 6A.3):** Hook `usePerfilUsuario` resuelve IDs → nombres
via repositories en paralelo. Componente `TarjetaPerfil` compartido.

### I12 — DashboardAgente: `timestamp.toDate()` error
**Causa:** Firebase residual — Supabase entrega ISO strings, no Timestamps.
**Solución (V1 Fase 6B.1):** `formatDateISO()` usa `new Date(isoString)`.

### I13 — Recurso agente no se mostraba
**Causa:** `userData.recurso_nombre` no existe en `users`.
El recurso vive en `resource_assignments`.
**Solución (V1 Fase 6A.3):** Query directa a `resource_assignments`
WHERE `user_id = X` AND `liberado_en IS NULL`.

### I14 — fetchCollection en resource_assignments: columna `creado` no existe
**Causa:** `SupabaseProvider.fetchCollection()` agrega `ORDER BY creado`
por defecto. `resource_assignments` tiene `asignado_en`, no `creado`.
**Solución (V1 Fase 6A.3):** Query directa con
`supabase.from(...).select().eq().is().limit(1)`.
**Lección:** Import dinámico `import()` no detectado por grep estático.
En auditorías futuras incluir búsqueda de `import(`.

---

## ISSUES ABIERTOS — V2

### A01 — orders_select permite supervisor ver órdenes no activas
**Estado:** ⚠️ Pendiente
**Etapa:** V2.1B
**Fix definido:** Agregar `AND estado = 'activa'` para `supervisor`
en la política `orders_select`.

### A02 — planning_select permite supervisor ver otras escuadras
**Estado:** ⚠️ Pendiente
**Etapa:** V2.1B
**Fix definido:** Restringir supervisor a `squad_id = current_user_squad_id()`.
Hereda a `planning_days` y `planning_activities`.

### A03 — Agente no puede ver sus resource_assignments
**Estado:** ⚠️ Pendiente
**Etapa:** V2.1B
**Fix definido:** Agregar política SELECT para agente:
`user_id = (SELECT id FROM users WHERE auth_id = auth.uid())`.

### A04 — Snapshots `sheet_activities` incompletos
**Estado:** ⚠️ Pendiente
**Etapa:** V2.2B
**Descripción:** `sheet_activities` aún depende de relaciones vivas
con `orders` y `order_actions`. Pendiente agregar:
`accion_nombre_snapshot`, `accion_detalle_snapshot`,
`orden_consecutivo_snapshot`.

### A05 — jsPDF advertencia `5 units width could not fit page`
**Estado:** ℹ️ Cosmético
**Etapa:** V2.3
**Descripción:** Advertencia de formato de columna en autoTable.
No afecta funcionalidad. PDF se genera correctamente.

---

## DECISIONES TÉCNICAS PERMANENTES

### D01 — No usar Firebase en módulos nuevos
Firebase eliminado completamente (código + dependencias npm).
No crear ningún import `from 'firebase/*'` en código nuevo.

### D02 — No usar service_role en el frontend
Siempre usar el cliente autenticado con RLS activa.

### D03 — SECURITY DEFINER solo para operaciones cross-scope
No como atajo para evitar diseñar RLS correctamente.

### D04 — Soft delete obligatorio
Nunca `DELETE` físico en entidades operativas.
Usar `estado = 'inactivo'` o `liberado_en = NOW()`.

### D05 — Motor temporal congelado
`timeUtils.js` y las migraciones 004/005 no se reabren
salvo bugs críticos reales. Ya pasó 14/14 PASS.

### D06 — PDF institucional intocable
Diseño, estructura y espaciado del PDF oficial no se modifican.

### D07 — Distritales son núcleo, no excepción
El 60-80% de delegaciones tienen estructura distrital.
`delegation_type = 'distrital'` es parte del modelo base del SOP.

### D08 — Sustitución jerárquica en aplicación, no en RLS
RLS define scope territorial.
La lógica de sustitución (ej: UO asume funciones de supervisor ausente)
vive en la capa de aplicación.

### D09 — Modelo unificado de unidades
Cantonales, distritales, GAO, UIP comparten la misma arquitectura base.
`delegation_type` diferencia comportamiento, no estructura de datos.

### D10 — RLS recursivo: encapsular y monitorear performance
`WITH RECURSIVE` en políticas RLS debe encapsularse en funciones.
Evaluar cache/snapshot de scopes si el sistema crece.
No es problema ahora — documentado para V2.3.

---

*Última actualización: Mayo 2026 — V2.1A activa*
