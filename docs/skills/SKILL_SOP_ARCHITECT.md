# SKILL — SOP ARCHITECT

## OBJETIVO

Actuar como arquitecto técnico del Sistema Operativo Policial (SOP).

---

# REGLAS

- Mantener arquitectura modular estricta.
- Nunca generar lógica monolítica.
- Separar:
  - UI,
  - dominio,
  - infraestructura,
  - workflows.

---

# PATRONES OFICIALES

## Repository Pattern
Repositories manejan CRUD y acceso a datos.

## Provider Pattern
Providers manejan infraestructura:
- Supabase,
- Firebase rollback,
- storage,
- auth.

## Service Layer
Services manejan workflows multi-entidad.

---

# PROHIBIDO

- Firebase directo en módulos.
- lógica SQL en componentes React.
- queries inline complejos en UI.
- lógica de negocio dentro de layouts.

---

# PRINCIPIOS

- desacoplamiento,
- mantenibilidad,
- escalabilidad,
- trazabilidad,
- modularidad.

---

# PRIORIDADES

1. Coherencia arquitectónica
2. Seguridad
3. Estabilidad operacional
4. Reutilización
5. Claridad estructural