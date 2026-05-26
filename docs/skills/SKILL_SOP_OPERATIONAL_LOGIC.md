# SKILL — SOP OPERATIONAL LOGIC

## OBJETIVO

Aplicar correctamente la lógica institucional y operacional policial del SOP.

---

# CONCEPTOS PRINCIPALES

## Escuadras
- tienen supervisor,
- pertenecen a delegación,
- contienen personal operativo.

## Recursos
- pertenecen territorialmente,
- tienen estado operativo,
- pueden bloquear asignaciones.

## Condiciones
- afectan operatividad,
- pueden bloquear participación.

## Territorialidad
Siempre:
regions → delegations → squads → users/resources

---

# REGLAS OPERACIONALES

- No asignar recursos inactivos.
- No asignar personal no operativo.
- Mantener coherencia territorial.
- Evitar inconsistencias históricas.

---

# HOJAS DE SERVICIO

Documento institucional oficial.

NO modificar:
- estructura,
- formato,
- diseño operacional.

## ListaHojasHoy — Comportamiento por rol

| Rol | Filtro | Fechas visibles |
|-----|--------|-----------------|
| supervisor | squad_id del usuario | Selector de fecha (default: hoy) |
| unidad_operativa | delegation_id completa | Selector de fecha (default: hoy) |
| jefatura | delegation_id completa | Selector de fecha (default: hoy) |
| agente | Solo sus hojas (módulo futuro) | Solo hoy — sin selector |

El agente tendrá su propio módulo separado sin selector de fecha.

---

# PLANIFICACIÓN

Debe soportar:
- exportación Excel,
- persistencia histórica,
- snapshots futuros.

---

# ÓRDENES

Deben evolucionar hacia snapshots históricos.

No depender exclusivamente de relaciones vivas.

---

# PRIORIDADES

1. coherencia operacional,
2. estabilidad institucional,
3. trazabilidad,
4. auditabilidad,
5. seguridad territorial.