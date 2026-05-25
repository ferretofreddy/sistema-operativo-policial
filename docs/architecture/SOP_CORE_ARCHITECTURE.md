# SOP_CORE_ARCHITECTURE.md

```md
---
name: sop-core-architecture
description: >
  Arquitectura central del Sistema Operativo Policial (SOP).
  Cargar SIEMPRE cuando el usuario mencione:
  arquitectura, repositories, providers, Supabase,
  PostgreSQL, RLS, migración Firebase, workflows,
  snapshots, layouts, hooks, repositories, services,
  exportadores o estructura del sistema.
---

# SOP — Core Architecture

## Proyecto

Sistema Operativo Policial (SOP)
Plataforma institucional operacional para Fuerza Pública de Costa Rica.

---

# Stack Oficial

| Capa | Tecnología |
|------|-------------|
| Frontend | React + Vite |
| Backend | Supabase |
| DB | PostgreSQL |
| Auth | Supabase Auth |
| Seguridad | RLS + SECURITY DEFINER |
| PDF | jsPDF |
| Excel | SheetJS |
| Legacy | Firebase (en eliminación) |

---

# Arquitectura Oficial

React
 ↓
Repositories
 ↓
Providers
 ↓
Supabase/PostgreSQL

---

# Reglas Arquitectónicas

## React

❌ Nunca importar Firebase directo en componentes  
❌ Nunca importar Supabase directo en componentes  
✅ Siempre usar repositories

---

## Repository

Responsable de:
- CRUD
- persistencia
- queries
- joins simples

NO debe contener:
- workflows complejos
- lógica multi-entidad
- automatización operacional

---

## Services

Responsables de:
- workflows
- coordinación multi-entidad
- consistencia operacional
- automatización
- snapshots
- exportación

---

## Providers

Responsables de:
- conexión backend
- persistencia abstracta
- queries genéricas

Providers actuales:
- SupabaseProvider
- FirebaseProvider (rollback)

---

# Convenciones Obligatorias

✅ Estilos inline  
❌ Nunca Tailwind

✅ userData.id  
❌ Nunca userData.uid

✅ delegation_id / squad_id  
❌ Nunca delegacion_id / escuadra_id

✅ Soft delete  
❌ Nunca DELETE físico

---

# RLS

La seguridad principal SIEMPRE vive en PostgreSQL.

NO en React.

---

# SECURITY DEFINER

Usar únicamente para:
- operaciones cross-scope
- workflows privilegiados
- administración institucional

NO usar como reemplazo de RLS.

---

# Snapshots

Documentos oficiales NO deben depender de relaciones vivas.

Especialmente:
- hojas de servicio
- órdenes
- actividades
- acciones operativas

---

# Exportadores

Separar:
- lógica PDF
- lógica Excel
- frontend visual

Estructura futura:

core/
  exporters/
  workflows/
  services/

---

# Objetivo del Proyecto

Construir:
- plataforma operacional institucional
- backend territorial
- trazabilidad operativa
- documentos oficiales
- workflows policiales reales
- arquitectura desacoplada
```
