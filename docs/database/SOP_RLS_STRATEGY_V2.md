# SOP_RLS_STRATEGY_V2.md
## Sistema Operativo Policial — Fuerza Pública de Costa Rica
## Estrategia Oficial de Seguridad Territorial y Jerárquica
## Versión 2.0 | Mayo 2026

---

## 1. PROPÓSITO

Este documento define la estrategia oficial de seguridad territorial
del SOP V2. Es la referencia técnica para diseñar, implementar,
revisar y auditar cualquier política RLS del sistema.

Junto con `SOP_RLS_ACCESS_MATRIX.md`, forman la base de seguridad
institucional del SOP.

---

## 2. PRINCIPIO CENTRAL

```
La seguridad principal del SOP vive en PostgreSQL.
React es solo UI.
```

Nunca confiar en:
- Validaciones solo en componentes React
- Hooks de visibilidad como control de acceso
- Props o estados frontend como barrera de seguridad

---

## 3. EVOLUCIÓN DEL MODELO

### V1 — Modelo plano
```
regions → delegations → squads
Visibilidad por delegation_id directo
```

### V2 — Modelo jerárquico multinivel
```
delegación cantonal
  ├── distritales subordinadas (parent_delegation_id)
  └── unidades especiales (delegation_type)
        └── escuadras
Visibilidad por scope jerárquico via get_delegation_scope()
```

---

## 4. FUNCIONES JWT OFICIALES

Estas funciones son la única fuente de verdad de identidad en RLS:

```sql
current_user_role()            -- rol del usuario autenticado
current_user_delegation_id()   -- delegation_id del usuario
current_user_squad_id()        -- squad_id del usuario (null si no aplica)
```

**Nunca** inferir identidad desde el frontend.
**Nunca** pasar IDs como parámetros para saltarse RLS.

---

## 5. FUNCIÓN DE SCOPE JERÁRQUICO

```sql
get_delegation_scope(p_delegation_id UUID)
-- Retorna: el nodo raíz + todos sus subordinados recursivos
-- Uso: jefatura/unidad_operativa de cantonal ve sus distritales
-- Performance: encapsulada, indexada, SECURITY DEFINER
```

**Regla de uso:**
```sql
-- Correcto — encapsulado
delegation_id IN (SELECT id FROM get_delegation_scope(current_user_delegation_id()))

-- Prohibido — recursión inline en policy
WITH RECURSIVE ... (inline en cada policy)
```

---

## 6. MODELO DE VISIBILIDAD POR ROL

| Rol | Ve | Administra |
|-----|----|------------|
| `admin` | Todo — sin restricción territorial | Todo |
| `jefatura` | Su delegación + sus distritales | Su delegación |
| `unidad_operativa` | Su delegación + sus distritales | Su delegación (operativo) |
| `supervisor` | Solo su escuadra | Solo su escuadra |
| `agente` | Solo sus asignaciones y hojas propias | Solo su operación propia |

**Principio crítico:** Visibilidad NO implica autoridad de modificación.
Un usuario puede ver sin poder editar.

---

## 7. DELEGATION_TYPE EN RLS

```sql
-- La política puede diferenciar comportamiento por tipo:
SELECT delegation_type FROM delegations
WHERE id = current_user_delegation_id()
-- Valores: 'cantonal' | 'distrital' | 'special_unit' | 'regional_unit'
```

Las distritales tienen scope propio (no ven hacia arriba ni hacia los lados).
Solo la cantonal ve hacia abajo (sus distritales).

---

## 8. SECURITY DEFINER — REGLAS ESTRICTAS

### Permitido
```
✅ get_jefaturas_delegacion()        — jefaturas sin squad_id
✅ get_delegation_scope()            — scope jerárquico recursivo
✅ asignar_oficial_a_recurso()       — workflow de asignación
✅ remover_oficial_de_recurso()      — workflow de liberación
✅ liberar_recurso()                 — liberación masiva
✅ Triggers de audit_logs            — escritura privilegiada
✅ Operaciones cross-scope admin     — gestión global controlada
```

### Prohibido
```
❌ Como bypass general de RLS
❌ Para "resolver rápido" una policy mal diseñada
❌ Para saltarse permisos territoriales
❌ En componentes React directamente
```

---

## 9. POLÍTICAS POR OPERACIÓN

### Patrón estándar — tabla con delegation_id

```sql
-- SELECT con scope jerárquico
CREATE POLICY tabla_select ON tabla FOR SELECT USING (
  current_user_role() = 'admin'
  OR (
    current_user_role() IN ('jefatura', 'unidad_operativa')
    AND delegation_id IN (
      SELECT id FROM get_delegation_scope(current_user_delegation_id())
    )
  )
  OR (
    current_user_role() = 'supervisor'
    AND squad_id = current_user_squad_id()
  )
);

-- INSERT con restricción territorial
CREATE POLICY tabla_insert ON tabla FOR INSERT WITH CHECK (
  current_user_role() IN ('admin', 'jefatura', 'unidad_operativa', 'supervisor')
  AND (
    current_user_role() = 'admin'
    OR delegation_id = current_user_delegation_id()
  )
);
```

### Patrón especial — agente via JSONB snapshot

```sql
-- Para service_sheets — agente ve sus hojas
OR (
  current_user_role() = 'agente'
  AND personal_snapshot @> jsonb_build_array(
    jsonb_build_object(
      'user_id', (SELECT id::text FROM users WHERE auth_id = auth.uid())
    )
  )
)
```

---

## 10. REGLAS DE PERFORMANCE

### Obligatorio
```
✅ Encapsular lógica recursiva en funciones SQL
✅ Índices en delegation_id, squad_id, parent_delegation_id
✅ Políticas pequeñas y legibles
✅ EXPLAIN ANALYZE antes de implementar política nueva
✅ Validar con harness antes de desplegar
```

### Prohibido
```
❌ WITH RECURSIVE inline en policies (usar get_delegation_scope)
❌ JOINs complejos dentro de policies
❌ Subqueries profundas en USING/WITH CHECK
❌ Policies que dependan de datos mutables sin cache
❌ Políticas monolíticas de más de 20 líneas
```

### Nota para el futuro (V2.3+)
Si el sistema crece a miles de delegaciones, evaluar:
- Materializar `get_delegation_scope` como vista materializada
- Cache de scopes en JWT claims
- Snapshot de jerarquía territorial para dashboards masivos

---

## 11. ESTADOS DE DOCUMENTOS Y RLS

Las hojas de servicio tienen estados que afectan los permisos de escritura:

```
pendiente    → supervisor puede editar y reasignar personal
en_tramite   → supervisor ve, NO puede editar asignaciones
finalizada   → supervisor revisa, puede cerrar o devolver
cerrada      → INMUTABLE para todos, incluyendo admin
```

**Implementación:** El estado `cerrada` se controla via trigger,
no solo via RLS. RLS define quién puede intentar el UPDATE.
El trigger valida el estado antes de permitirlo.

---

## 12. TESTING OBLIGATORIO

Toda política nueva requiere:
- Prueba positiva: el rol correcto puede acceder
- Prueba negativa: el rol incorrecto NO puede acceder
- Prueba jerárquica: cantonal ve distritales, distrital NO ve cantonal
- Prueba cruzada: delegación A NO ve datos de delegación B
- Meta: **14/14 PASS** mínimo (estándar SOP)

Ver `SOP_TESTING_STRATEGY.md` para el harness completo.

---

## 13. ANTI-PATTERNS PROHIBIDOS

```
❌ Seguridad solo en React (hooks, props, layouts)
❌ service_role en frontend
❌ Bypass manual de RLS
❌ Policies monolíticas gigantes (>20 líneas)
❌ Scopes hardcodeados en el código
❌ Lógica jerárquica distribuida en componentes
❌ SECURITY DEFINER como atajo general
❌ Inferir delegation_id desde el frontend
❌ Insertar directamente en resource_assignments (usar RPCs)
```

---

## 14. ROADMAP RLS

| Etapa | Política | Estado |
|-------|----------|--------|
| V1 | `service_sheets` (ss_select/insert/update/delete) | ✅ Activa |
| V1 | Catálogos, usuarios, recursos, planificación, órdenes | ✅ Activa |
| V2.1A | Extensión `delegations` + `get_delegation_scope()` | 🔄 Activa |
| V2.1B | Actualizar `orders_select` (supervisor solo activas) | ⏳ |
| V2.1B | Actualizar `planning_select` (supervisor solo su escuadra) | ⏳ |
| V2.1B | `resource_assignments_select` para agente | ⏳ |
| V2.1C | RLS Test Harness multinivel (14/14 PASS) | ⏳ |
| V2.2 | RLS módulo agente | ⏳ |
| V3 | Scope regional y multidelegación | ⏳ Futuro |

---

*Documento estratégico — Sistema Operativo Policial V2*
*Fuerza Pública de Costa Rica | Mayo 2026*
