# SOP_PROJECT_OVERVIEW.md
## Sistema Operativo Policial — Fuerza Pública de Costa Rica
## Versión 2 | Mayo 2026

---

## Identificación

| Campo | Valor |
|-------|-------|
| **Proyecto** | Sistema Operativo Policial (SOP) |
| **Institución** | Fuerza Pública de Costa Rica |
| **Repositorio** | https://github.com/ferretofreddy/sistema-operativo-policial |
| **Local** | `C:\Users\ferre\Desktop\sistema-operativo\frontend` |
| **Versión activa** | V2.1A |
| **Flujo de trabajo** | Claude (claude.ai) genera → VS (Claude Code) aplica → CC valida → GPT audita |

---

## Objetivo

Centralizar la operación policial de la Fuerza Pública de Costa Rica:
planificación, documentación oficial, supervisión operacional,
trazabilidad institucional y coordinación territorial multinivel.

**Ciclo operativo:**
```
ORECPO → Planificación → Hoja de Servicio → Resultados → Análisis
```

---

## Stack Tecnológico

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Frontend | React + Vite | ✅ Activo |
| Backend | Supabase (PostgreSQL 17) | ✅ Activo |
| Auth | Supabase Auth + JWT + RLS | ✅ Activo |
| PDF | jsPDF + jspdf-autotable | ✅ Activo |
| Excel | SheetJS (xlsx) | ✅ Activo |
| Legacy Firebase | — | ✅ Eliminado completamente (V1) |

---

## Modelo Organizacional

El SOP opera sobre una jerarquía institucional multinivel:

```
Dirección Regional          → Fuera del SOP v2 (gerencial)
  └── Subdirección Regional → Fuera del SOP v2
        └── Delegación Cantonal     → NÚCLEO SOP v2
              ├── Delegación Distrital → NÚCLEO SOP v2
              ├── Unidad Especial (GAO, UIP) → NÚCLEO SOP v2
              └── Escuadras → NÚCLEO SOP v2
```

**Tipos de unidad (`delegation_type`):**
- `cantonal` — delegación cantonal estándar
- `distrital` — subordinada a una cantonal (60-80% del país)
- `special_unit` — GAO, UIP, Fuerza de Tarea
- `regional_unit` — reservado para V3

---

## Versiones del Proyecto

| Versión | Descripción | Estado |
|---------|-------------|--------|
| **V1** | Migración Firebase → Supabase | ✅ Cerrada |
| **V2** | Plataforma Institucional Operacional | 🔄 **Activa** |
| **V3** | Plataforma Nacional (scope regional) | ⏳ Futuro |

---

## Estado V2 — Fases y Etapas

### V2.1 — Consolidación Institucional Base

| Etapa | Descripción | Estado |
|-------|-------------|--------|
| V2.1A | Modelo organizacional + extensión `delegations` | 🔄 **Activa** |
| V2.1B | RLS_ACCESS_MATRIX v2 + políticas ajustadas | ⏳ |
| V2.1C | RLS Test Harness multinivel | ⏳ |
| V2.1D | Audit logs | ⏳ |

### V2.2 — Operación Completa

| Etapa | Descripción | Estado |
|-------|-------------|--------|
| V2.2A | Módulo agente | ⏳ |
| V2.2B | Flujo estados hojas (pendiente→en_tramite→finalizada→cerrada) | ⏳ |
| V2.2C | Dashboards adaptativos por `delegation_type` | ⏳ |

### V2.3 — Analytics e Institucional

| Etapa | Descripción | Estado |
|-------|-------------|--------|
| V2.3A | Estadísticas operacionales | ⏳ |
| V2.3B | Reportes institucionales | ⏳ |
| V2.3C | Preparación arquitectónica V3 | ⏳ |

---

## Módulos del Sistema

### Administración ✅
Usuarios, Regiones, Delegaciones (cantonal + distrital), Escuadras,
Recursos, Rangos, Condiciones, Tipos de recurso

### Operación ✅
Órdenes de Ejecución (ORECPO), Planificación Operativa,
Hojas de Servicio con PDF institucional

### Supervisión 🔄
Módulo del agente (V2.2A), Resultados operativos, Flujo de cierre de hojas

### Analytics ⏳
Dashboards estadísticos, Reportes institucionales (V2.3)

---

## Filosofía del Proyecto

> Priorizar **integridad institucional, trazabilidad y auditabilidad**
> sobre velocidad o shortcuts técnicos.

**Principios V2:**
- PostgreSQL-first — la seguridad vive en la base de datos
- Modelo unificado — misma arquitectura para todos los tipos de unidad
- Escalabilidad sin ruptura — cada decisión evoluciona sin romper lo existente
- Snapshot-driven — documentos oficiales independientes de relaciones vivas
- No sobreingeniería — implementar por capas, documentar el futuro

---

## Usuarios de Prueba

**Delegación:** Puerto Jiménez (D97) | **Contraseña:** `Test1234!`

| Email | Rol | Nombre | Rango |
|-------|-----|--------|-------|
| freddy.ferreto@msp.go.cr | admin | Freddy Ferreto | — |
| jefatura@test.cr | jefatura | Ana Vargas Solano | INT |
| unidad@test.cr | unidad_operativa | Carlos Mora Jiménez | SGTO |
| supervisor@test.cr | supervisor | Mario Quesada Arias | INSP |
| agente@test.cr | agente | Laura Rojas Méndez | AGTE |

---

## Equipo

| Agente | Rol |
|--------|-----|
| **Freddy** | Product Owner + Experto institucional FP |
| **GPT** | Arquitecto estratégico + Auditoría |
| **Claude** | Arquitecto técnico + Ejecución SQL + Coordinación |
| **VS** | Implementación frontend (Claude Code) |
| **CC** | QA visual + Validación funcional (Claude Chrome) |

---

## Documentos Clave

| Documento | Descripción |
|-----------|-------------|
| `SOP_ORGANIZATIONAL_MODEL.md` | Modelo organizacional institucional oficial |
| `SOP_RLS_ACCESS_MATRIX.md` | Matriz de acceso por rol |
| `SOP_RLS_STRATEGY_V2.md` | Estrategia de seguridad RLS |
| `SOP_SCOPE_AND_VISIBILITY_RULES.md` | Reglas de scope y visibilidad por rol |
| `SOP_TESTING_STRATEGY.md` | Estrategia de validación y QA |
| `SOP_DATABASE_RULES.md` | Reglas y estructura de base de datos |
| `SOP_OPERATIONAL_STATE.md` | Estado operativo actual |
| `SOP_KNOWN_ISSUES.md` | Issues conocidos y soluciones |
| `SOP_V2_APERTURA_OFICIAL.md` | Declaración y mapa de V2 |

---

*Última actualización: Mayo 2026 — V2.1A activa*
