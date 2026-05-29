# SISTEMA OPERATIVO POLICIAL (SOP)
## Índice Maestro de Conocimiento IA

Versión: Mayo 2026  
Estado: Migración Firebase → Supabase en progreso

---

# OBJETIVO DEL ÍNDICE

Este archivo funciona como:
- punto de entrada documental,
- mapa arquitectónico,
- guía de carga de contexto,
- índice maestro de conocimiento IA,
- referencia central para ChatGPT, Claude, Codex y futuros agentes.

NO contiene documentación detallada.
Redirige a los documentos especializados.

---

# STACK TECNOLÓGICO

## Frontend
- React
- Vite
- React Router
- Context API
- Arquitectura modular

## Backend
- Supabase
- PostgreSQL
- PostGIS
- Row Level Security (RLS)
- Edge Functions (pendiente)

## Infraestructura
- GitHub
- Gitpod
- Claude Code
- Codex
- ChatGPT Projects

---

# ARQUITECTURA GENERAL

Patrones principales:

- Repository Pattern
- Provider Pattern
- Service Layer
- Arquitectura desacoplada
- Separación dominio / infraestructura
- Modularidad estricta
- Seguridad institucional mediante RLS

---

# DOCUMENTOS PRINCIPALES

## 1. SOP_PROJECT_OVERVIEW.md
Resumen ejecutivo del proyecto:
- objetivo institucional,
- stack,
- módulos,
- alcance,
- estado general.
Ubicación: `docs/architecture/SOP_PROJECT_OVERVIEW.md`

---

## 2. SOP_CORE_ARCHITECTURE.md
Arquitectura técnica:
- repositories,
- providers,
- adapters,
- services,
- layouts,
- módulos,
- estructura del frontend,
- patrones oficiales.
Ubicación: `docs/architecture/SOP_CORE_ARCHITECTURE.md`

---

## 3. SOP_DATABASE_RULES.md
Base de datos:
- PostgreSQL,
- RLS,
- relaciones,
- snapshots,
- auditoría,
- triggers,
- constraints,
- PostGIS,
- índices,
- políticas.
Ubicación: `docs/database/SOP_DATABASE_RULES.md`

---

## 4. SOP_DOMAIN_RULES.md
Reglas operativas institucionales:
- escuadras,
- recursos,
- planificación,
- órdenes,
- hojas de servicio,
- lógica territorial,
- restricciones operativas.
Ubicación: `docs/operational/SOP_DOMAIN_RULES.md`

---

## 5. SOP_OPERATIONAL_STATE.md
Estado actual del proyecto:
- migraciones realizadas,
- módulos terminados,
- pendientes,
- roadmap,
- riesgos técnicos.
Ubicación: `docs/operational/SOP_OPERATIONAL_STATE.md`

---

## 6. SOP_KNOWN_ISSUES.md
Errores conocidos:
- bugs corregidos,
- fixes aplicados,
- loops,
- problemas de navegación,
- Firebase residual,
- decisiones importantes.
Ubicación: `docs/issues/SOP_KNOWN_ISSUES.md`

---

# ORDEN DE CARGA RECOMENDADO PARA IA

## Nivel 1 — Contexto general
1. SOP_PROJECT_OVERVIEW.md
2. SOP_OPERATIONAL_STATE.md

## Nivel 2 — Arquitectura
3. SOP_CORE_ARCHITECTURE.md

## Nivel 3 — Base de datos
4. SOP_DATABASE_RULES.md

## Nivel 4 — Reglas operativas
5. SOP_DOMAIN_RULES.md

## Nivel 5 — Issues históricos
6. SOP_KNOWN_ISSUES.md

---

# REGLAS MAESTRAS DEL PROYECTO

## Arquitectura
- Nunca romper modularidad.
- Nunca crear lógica monolítica.
- Nunca mezclar dominio con infraestructura.
- Mantener repositories desacoplados.

## Firebase
- No crear nuevos imports Firebase.
- No usar services/firebase.js en módulos nuevos.
- FirebaseProvider existe únicamente como rollback temporal.

## Base de datos
- PostgreSQL es la fuente oficial.
- RLS debe proteger datos territoriales.
- Relaciones territoriales deben respetarse siempre.

## UI / UX
- Mantener layouts institucionales.
- No romper navegación existente.
- No alterar diseño oficial de documentos.

## PDFs y Excel
- El formato oficial institucional NO puede modificarse.
- Exportaciones deben mantener compatibilidad operacional.

---

# ROADMAP ACTUAL

## Fase 1
Core + login Supabase
✅ COMPLETADA

## Fase 2
CRUD catálogos administrativos
✅ COMPLETADA

## Fase 3
Módulos territoriales
🔄 EN PROGRESO

## Fase 4
Usuarios + recursos + Edge Functions
⏳ PENDIENTE

## Fase 5
Operaciones policiales:
- órdenes,
- planificación,
- hojas de servicio,
- PDF,
- Excel
⏳ PENDIENTE

## Fase 6
Eliminación Firebase residual
⏳ PENDIENTE

---

# TEMAS CRÍTICOS PENDIENTES

## Snapshots operacionales
Actualmente:
- órdenes,
- actividades,
- acciones,
- hojas,
dependen de relaciones vivas.

Debe definirse:
- estrategia snapshot,
- versionado,
- persistencia histórica.

---

## RLS pendientes
Tablas operativas aún requieren endurecimiento de políticas.

Especial atención:
- hojas de servicio,
- recursos,
- órdenes,
- planificación.

---

## Storage
Pendiente auditoría completa:
- Firebase Storage residual,
- migración a Supabase Storage,
- estructura de buckets,
- permisos.

---

# HERRAMIENTAS IA DEL EQUIPO

## ChatGPT
- análisis,
- arquitectura,
- auditoría,
- documentación,
- coherencia técnica.

## Claude
- generación,
- razonamiento,
- refactors,
- diseño técnico.

## Claude Code / Codex
- ejecución,
- aplicación directa,
- búsquedas masivas,
- refactors automáticos.

---

# FILOSOFÍA DEL PROYECTO

El SOP no es una app CRUD genérica.

Es:
- plataforma operacional policial,
- sistema institucional,
- herramienta territorial,
- sistema de coordinación operativa,
- plataforma documental oficial.

Las decisiones técnicas deben priorizar:
1. estabilidad,
2. trazabilidad,
3. seguridad,
4. coherencia institucional,
5. mantenibilidad a largo plazo.
