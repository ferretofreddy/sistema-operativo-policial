# SOP V2 — APERTURA OFICIAL
## Sistema Operativo Policial — Fuerza Pública de Costa Rica
## Plataforma Institucional Operacional
## Mayo 2026

---

## DECLARACIÓN OFICIAL

A partir de esta sesión el Sistema Operativo Policial entra
oficialmente en su **Versión 2**.

| Campo | Valor |
|-------|-------|
| **Versión anterior** | V1 — Migración Firebase → Supabase |
| **Versión actual** | V2 — Plataforma Institucional Operacional |
| **Versión activa** | V2.1A |
| **Fecha de apertura** | Mayo 2026 |
| **Aprobado por** | Freddy · GPT · Claude |

---

## QUÉ CAMBIÓ

### V1 era:
> Migración técnica de Firebase a Supabase con arquitectura desacoplada.

### V2 es:
> Plataforma institucional operacional de la Fuerza Pública de Costa Rica,
> con modelo organizacional multinivel, seguridad PostgreSQL-first,
> trazabilidad institucional completa y arquitectura escalable nacional.

El cambio no es técnico — es de paradigma.
El SOP ya no "migra". El SOP ya **consolida y escala**.

---

## BASE SÓLIDA HEREDADA DE V1

Todo lo construido en V1 es válido y permanece intacto:

| Módulo | Estado |
|--------|--------|
| Arquitectura desacoplada (Repository + Provider) | ✅ |
| PostgreSQL-first consolidado | ✅ |
| Firebase 100% eliminado (código + dependencias) | ✅ |
| RLS territorial base | ✅ |
| Snapshots institucionales | ✅ |
| Motor temporal operacional (14/14 PASS) | ✅ |
| PDF institucional oficial | ✅ |
| Hojas de servicio con flujo de estados | ✅ |
| Dashboards estandarizados (5 roles) | ✅ |
| TarjetaPerfil con datos reales | ✅ |
| Responsive (Mobile + Desktop) | ✅ |
| Usuarios de prueba validados | ✅ |

---

## ESQUEMA DE VERSIONADO OFICIAL

```
V{mayor}.{fase}{etapa}

Ejemplos:
  V2.1A  → Versión 2, Fase 1, Etapa A
  V2.1B  → Versión 2, Fase 1, Etapa B
  V2.2A  → Versión 2, Fase 2, Etapa A
```

| Componente | Significado |
|------------|-------------|
| `2` | Versión mayor — cambio de paradigma |
| `1`, `2`... | Fase — agrupa objetivos grandes |
| `A`, `B`... | Etapa — unidad de trabajo auditable |

---

## MAPA COMPLETO DE V2

### V2.1 — Consolidación Institucional Base

| Etapa | Objetivo | Estado |
|-------|----------|--------|
| **V2.1A** | Modelo organizacional + extensión `delegations` | 🔄 **ACTIVA** |
| **V2.1B** | RLS_ACCESS_MATRIX v2 + políticas ajustadas | ⏳ |
| **V2.1C** | RLS Test Harness (cantonal + distrital + special_unit) | ⏳ |
| **V2.1D** | Audit logs (tabla + triggers) | ⏳ |

### V2.2 — Operación Completa

| Etapa | Objetivo | Estado |
|-------|----------|--------|
| **V2.2A** | Módulo agente | ⏳ |
| **V2.2B** | Flujo de estados hojas (pendiente→en_tramite→finalizada→cerrada) | ⏳ |
| **V2.2C** | Dashboards adaptativos por `delegation_type` | ⏳ |

### V2.3 — Analytics e Institucional

| Etapa | Objetivo | Estado |
|-------|----------|--------|
| **V2.3A** | Estadísticas operacionales | ⏳ |
| **V2.3B** | Reportes institucionales | ⏳ |
| **V2.3C** | Preparación arquitectónica V3 | ⏳ |

### V3 — Plataforma Nacional *(futuro)*

```
Subdirecciones regionales como entidades operativas
Órdenes de servicio regionales
Scope multidelegación
Coordinación táctica nacional
Dashboards regionales y nacionales
```

---

## V2.1A — ETAPA ACTIVA

### Objetivo
Implementar el modelo organizacional aprobado en `SOP_ORGANIZATIONAL_MODEL.md`:
- Extensión de `delegations` con `parent_delegation_id` y `delegation_type`
- Función SQL `get_delegation_scope()` para visibilidad jerárquica
- Datos de prueba: crear delegación distrital subordinada a Puerto Jiménez

### Entregables
- [ ] Migración SQL aplicada en Supabase
- [ ] `DelegationRepository` actualizado con soporte `delegation_type`
- [ ] `usePerfilUsuario` actualizado con `delegation_type`
- [ ] Delegación distrital de prueba creada
- [ ] Validación: cantonal ve sus distritales, distrital ve solo lo suyo
- [ ] Auditoría de cierre V2.1A

### Documentos de referencia
- `SOP_ORGANIZATIONAL_MODEL.md` — modelo aprobado
- `SOP_RLS_ACCESS_MATRIX.md` v1.0 — base para v2 en V2.1B

### Responsables

| Tarea | Responsable |
|-------|-------------|
| SQL migración | Claude vía MCP |
| Actualizar repositories | VS |
| Datos de prueba | Claude vía MCP |
| Validación visual | CC |
| Auditoría cierre | Claude |
| Validación arquitectónica | GPT |

---

## PRINCIPIOS DE V2

**1. PostgreSQL-first**
La seguridad y la lógica institucional viven en la base de datos. React es solo UI.

**2. Escalabilidad sin ruptura**
Cada decisión técnica debe poder evolucionar sin romper lo existente.
`parent_delegation_id` es el ejemplo canónico.

**3. Modelo unificado**
Cantonales, distritales, GAO, UIP — misma arquitectura base.
`delegation_type` diferencia el comportamiento, no la estructura.

**4. Sustitución en aplicación, no en RLS**
RLS define quién puede ver qué.
La lógica de sustitución jerárquica vive en la aplicación.

**5. Snapshot-driven**
Los documentos oficiales no dependen de relaciones vivas.

**6. Trazabilidad institucional**
Cada operación crítica debe dejar registro auditable.
Audit logs son obligatorios en V2.1D.

**7. No sobreingeniería**
El SOP v1 fue tentado a modelar todo el país desde el inicio.
V2 implementa por capas. Lo que no es necesario hoy se documenta y se reserva para V3.

---

## EQUIPO V2

| Agente | Rol | Fortaleza demostrada |
|--------|-----|----------------------|
| **Freddy** | Product Owner + Experto institucional | Conocimiento operacional real de la FP |
| **GPT** | Arquitecto estratégico | Análisis de riesgos, visión institucional, visto bueno |
| **Claude** | Arquitecto técnico + Ejecutor SQL | Diseño de modelo, código, coordinación |
| **VS** | Implementador frontend | Aplicación precisa, detección de bugs ocultos |
| **CC** | QA visual + Validación funcional | Pruebas multirol, reportes estructurados |

---

## DOCUMENTOS OFICIALES V2

| Documento | Descripción | Estado |
|-----------|-------------|--------|
| `SOP_ORGANIZATIONAL_MODEL.md` | Modelo organizacional institucional | ✅ Aprobado |
| `SOP_RLS_ACCESS_MATRIX.md` | Matriz de acceso por rol (v1.0 base) | ✅ v1.0 — actualizar en V2.1B |
| `SOP_PROJECT_OVERVIEW.md` | Visión general del proyecto | ✅ Actualizado |
| `SOP_DATABASE_RULES.md` | Reglas de base de datos | 🔄 Actualizar |
| `SOP_OPERATIONAL_STATE.md` | Estado operativo actual | ✅ Actualizado |
| `SOP_KNOWN_ISSUES.md` | Issues conocidos | ✅ Actualizado |

---

*Documento de apertura — Sistema Operativo Policial V2*
*Fuerza Pública de Costa Rica*
*Equipo SOP: Freddy · GPT · Claude · VS · CC*
*Mayo 2026*
