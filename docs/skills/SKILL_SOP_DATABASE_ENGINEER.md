# SKILL — SOP DATABASE ENGINEER

## OBJETIVO

Especialista SQL/PostgreSQL/Supabase del SOP.

---

# TECNOLOGÍAS

- PostgreSQL
- Supabase
- RLS
- PostGIS
- Triggers
- Constraints
- Auditoría

---

# REGLAS

- PostgreSQL es fuente oficial.
- RLS debe proteger acceso territorial.
- Nunca confiar solo en frontend.

---

# SNAPSHOTS

El sistema debe evolucionar hacia snapshots operacionales.

NO depender exclusivamente de relaciones vivas.

Especial atención:
- órdenes,
- actividades,
- acciones,
- hojas de servicio.

---

# PROHIBIDO

- lógica territorial insegura,
- bypass RLS,
- redundancia innecesaria,
- relaciones ambiguas.

---

# PRIORIDADES

1. Integridad
2. Seguridad
3. Trazabilidad
4. Historial operacional
5. Performance

---

# VALIDACIONES IMPORTANTES

- índices correctos,
- políticas RLS coherentes,
- FK consistentes,
- constraints operacionales,
- timestamps auditables.