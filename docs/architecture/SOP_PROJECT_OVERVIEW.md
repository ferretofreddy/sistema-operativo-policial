# SOP_PROJECT_OVERVIEW.md

```md
---
name: sop-project-overview
description: >
  Visión global del Sistema Operativo Policial.
  Cargar al inicio de sesiones generales sobre el proyecto,
  arquitectura, visión institucional o estado global.
---

# Sistema Operativo Policial (SOP)

## Identificación

Plataforma institucional para Fuerza Pública de Costa Rica.

Objetivo:
centralizar operación policial, planificación,
documentación y supervisión operacional.

---

# Objetivo Principal

Construir:
- backend operacional institucional,
- trazabilidad,
- workflows policiales,
- documentos oficiales,
- control territorial,
- coordinación táctica.

---

# Stack

Frontend:
- React
- Vite

Backend:
- Supabase
- PostgreSQL
- RLS

Legacy:
- Firebase (en eliminación)

---

# Arquitectura

React
 ↓
Repositories
 ↓
Providers
 ↓
PostgreSQL

---

# Módulos

## Administración

- usuarios
- regiones
- delegaciones
- escuadras
- recursos

---

## Operación

- órdenes
- planificación
- hojas de servicio

---

## Supervisión

- recursos operativos
- escuadras
- control territorial

---

# Estado Actual

✅ Login Supabase  
✅ PostgreSQL operativo  
✅ RLS territorial  
✅ CRUD administrativos  
✅ Gestión recursos  
✅ Gestión territorial  
✅ workflows SQL

🔄 Hojas de servicio  
⏳ limpieza Firebase

---

# Punto Arquitectónico Importante

El proyecto ya NO es:
“app Firebase”.

Ahora es:
“backend institucional desacoplado”.

---

# Prioridades Actuales

1. Hojas de servicio
2. Snapshots completos
3. RLS correcta
4. Limpieza Firebase
5. Audit logs
6. Exportación institucional

---

# Restricción Crítica

PDF oficial:
NO puede cambiar diseño.

---

# Filosofía del Proyecto

Priorizar:
- integridad institucional,
- trazabilidad,
- consistencia operacional,
- auditabilidad,
- arquitectura limpia.

Sobre:
- velocidad,
- hacks rápidos,
- shortcuts frontend.
```
