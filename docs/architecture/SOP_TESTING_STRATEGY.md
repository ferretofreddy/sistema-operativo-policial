# SOP_TESTING_STRATEGY.md
## Sistema Operativo Policial — Fuerza Pública de Costa Rica
## Estrategia Oficial de Validación y QA
## Versión 2.0 | Mayo 2026

---

## 1. PROPÓSITO

Este documento define la estrategia oficial de pruebas,
QA y validación del SOP V2.

Es la referencia para:
- Criterios de aceptación de cada etapa
- Estructura del harness SQL
- Responsabilidades de validación por agente del equipo
- Estándar de calidad institucional

---

## 2. PRINCIPIO GENERAL

```
Toda funcionalidad institucional debe validarse:
  técnica (SQL, código)
  visual (UI, responsive, PDF)
  operacional (flujo real institucional)
```

Una etapa no está cerrada hasta que los 3 niveles pasan.

---

## 3. ESTÁNDAR OFICIAL

**Meta mínima: 14/14 PASS**

Este estándar nació del motor temporal operacional (Fase 5B/5C):
- 14 casos de prueba cubriendo turnos diurnos, nocturnos, cruces de
  medianoche, solapamientos, fronteras y casos límite
- Resultado: 14/14 PASS antes de cerrar la fase

A partir de V2, **14/14 PASS es el criterio institucional de estabilidad**
para todo harness SQL del SOP.

---

## 4. TIPOS DE PRUEBA

### 4.1 SQL Harness

Valida integridad a nivel de base de datos:

| Qué valida | Ejemplos |
|------------|---------|
| Constraints y triggers | Horarios operacionales, estados de hoja |
| RLS por rol | Cada rol ve solo lo que debe ver |
| Workflows SQL | Asignación/liberación de recursos |
| Snapshots | JSONB preserva el estado correcto |
| Integridad referencial | FKs, soft deletes, consistencia |
| Performance | EXPLAIN ANALYZE de políticas críticas |

**Estructura de harness:**
```sql
-- Patrón estándar SOP
DO $$
DECLARE
  total_cases INT := 0;
  passed_cases INT := 0;
  failed_cases INT := 0;
  test_result BOOLEAN;
  test_name TEXT;
BEGIN
  -- CASO H01: Admin ve todas las delegaciones
  test_name := 'H01 - Admin SELECT delegaciones global';
  -- ... lógica del test
  total_cases := total_cases + 1;
  IF test_result THEN passed_cases := passed_cases + 1;
  ELSE failed_cases := failed_cases + 1;
    RAISE NOTICE 'FAIL: %', test_name;
  END IF;

  -- ... más casos

  RAISE NOTICE 'RESULTADO: % / % PASS | % FAIL',
    passed_cases, total_cases, failed_cases;
END $$;
```

---

### 4.2 QA Visual (CC)

Valida la experiencia de usuario:

| Qué valida | Criterios |
|------------|-----------|
| Dashboards | TarjetaPerfil con datos reales, sin "—" |
| Responsive | Mobile (<768px), tablet (769-1100px), desktop (>1100px) |
| PDF institucional | Todas las secciones, rangos, recursos, actividades |
| Navegación | Sin loops, sin pantallas en blanco, sin 403 |
| Consola F12 | Sin errores de aplicación (WebSocket Vite es normal en dev) |
| Datos reales | Región, delegación, escuadra, rango correctos |

**Formato estándar de reporte CC:**
```
VERIFICACIÓN VISUAL — [ETAPA]
Fecha: ___

[ROL] - [nombre usuario] | [email]
  Dashboard carga:     ✅/❌
  TarjetaPerfil:       ✅/❌
  Datos territoriales: ✅/❌  valores: ___
  Consola F12:         ✅ limpia / ❌ errores: ___
  [prueba específica]: ✅/❌

VEREDICTO: ✅ APROBADO / ❌ REQUIERE CORRECCIÓN
```

---

### 4.3 QA Operacional (Freddy)

Valida coherencia institucional real:

| Qué valida | Preguntas clave |
|------------|----------------|
| Flujo policial | ¿El flujo refleja la operación real de la FP? |
| Terminología | ¿Los nombres, roles y estados son correctos institucionalmente? |
| Restricciones | ¿Los permisos reflejan la jerarquía real? |
| Documentos | ¿El PDF/Excel tiene el formato oficial? |
| Auditoría | ¿Los logs permiten reconstruir lo que ocurrió? |

---

### 4.4 Auditoría Arquitectónica (GPT)

Valida coherencia de diseño:

| Qué valida |
|------------|
| Coherencia con SOP_ORGANIZATIONAL_MODEL.md |
| Ausencia de anti-patterns documentados |
| Escalabilidad hacia V3 |
| Consistencia entre módulos |
| Riesgos técnicos no identificados |

---

### 4.5 Regression Testing

Antes de cerrar cualquier etapa, verificar que los módulos
existentes siguen funcionando:

**Checklist de regresión mínimo:**
```
✅ Login con los 5 roles — sin errores
✅ Dashboard de cada rol — TarjetaPerfil con datos reales
✅ Supervisor crea hoja de servicio — sin error
✅ Supervisor genera PDF — descarga correcta
✅ Planificación carga sin errores
✅ Recursos y asignaciones operativos
✅ Consola F12 limpia en todos los roles
```

---

## 5. VALIDACIONES OBLIGATORIAS POR ETAPA

Toda etapa de V2 debe validar los 5 roles de prueba:

| Email | Rol | Contraseña |
|-------|-----|------------|
| freddy.ferreto@msp.go.cr | admin | Test1234! |
| jefatura@test.cr | jefatura | Test1234! |
| unidad@test.cr | unidad_operativa | Test1234! |
| supervisor@test.cr | supervisor | Test1234! |
| agente@test.cr | agente | Test1234! |

**URL de prueba:** `http://192.168.1.178:5173`

---

## 6. TESTING RLS — ESCENARIOS OBLIGATORIOS

Para el RLS Test Harness de V2.1C, mínimo estos escenarios:

### Escenarios positivos (debe funcionar)
```
H01 Admin lee service_sheets de cualquier delegación
H02 Supervisor lee hojas de su escuadra
H03 Jefatura cantonal lee hojas de su delegación
H04 Jefatura cantonal lee hojas de su distrital subordinada
H05 Agente lee hoja donde aparece en personal_snapshot
H06 Unidad operativa crea orden en su delegación
H07 Supervisor lee órdenes activas de su delegación
H08 Admin actualiza cualquier hoja en estado pendiente
```

### Escenarios negativos (NO debe funcionar)
```
H09  Supervisor NO lee hojas de otra escuadra
H10  Agente NO lee hoja donde NO aparece en personal_snapshot
H11  Jefatura distrital NO lee hojas de la cantonal
H12  Jefatura distrital NO lee hojas de otra distrital hermana
H13  Supervisor NO ve órdenes en estado vencida o planificada
H14  Nadie (incluyendo admin) modifica hoja en estado cerrada
H15  Agente NO crea hoja de servicio
H16  Acceso cross-delegation denegado para todos los roles
```

**Meta:** 16/16 PASS mínimo para V2.1C.

---

## 7. TESTING DE DOCUMENTOS OFICIALES

### PDF Institucional
```
✅ Encabezado con logo y datos institucionales
✅ Supervisor con rango correcto (INSP, SGTO, etc.)
✅ Jefatura con rango correcto
✅ Personal con recurso correcto (cada oficial su recurso)
✅ Actividades con sector y horario correctos
✅ Sector físico y zona general diferenciados
✅ Formato sin alteraciones (columnas, márgenes, tipografía)
```

### Excel de Planificación
```
✅ Estructura institucional correcta
✅ Horarios operacionales (incluyendo turnos nocturnos)
✅ Compatible con impresión
```

---

## 8. TESTING DE SNAPSHOTS

```
✅ personal_snapshot contiene user_id, nombre, apellido, rango, resource_id
✅ supervisor_snapshot contiene datos correctos del supervisor
✅ jefatura_snapshot contiene datos correctos de la jefatura
✅ recursos_snapshot contiene todos los recursos asignados
✅ Un cambio posterior en users NO altera el snapshot existente
✅ Un cambio de delegación NO altera hojas históricas
```

---

## 9. TESTING MULTINIVEL (V2.1C)

Escenarios específicos para el modelo jerárquico:

```
M01 Cantonal ve hojas de todas sus distritales
M02 Distrital NO ve hojas de la cantonal
M03 Distrital NO ve hojas de otra distrital hermana
M04 Supervisor cantonal NO ve planificación de escuadra de distrital
M05 Jefatura distrital ve solo su scope, no el de la cantonal
M06 Admin ve todo sin restricción de tipo de delegación
M07 get_delegation_scope() retorna cantonal + todas sus distritales
M08 get_delegation_scope() de distrital retorna solo ella misma
```

---

## 10. CRITERIO DE CIERRE DE ETAPA

Una etapa se declara **CERRADA** cuando:

- [ ] SQL Harness: ≥ 14/14 PASS (o 16/16 para V2.1C)
- [ ] QA Visual CC: todos los roles aprobados
- [ ] Regresión: checklist mínimo aprobado
- [ ] QA Operacional Freddy: flujo institucional correcto
- [ ] GPT: visto bueno arquitectónico
- [ ] Auditoría de cierre generada por Claude
- [ ] Commit en repositorio con mensaje versionado

**Formato de commit:**
```
feat(V2.1A): implementar modelo organizacional + extensión delegations
feat(V2.1B): actualizar RLS access matrix con scopes jerárquicos
feat(V2.1C): agregar RLS test harness multinivel 16/16 PASS
```

---

## 11. RESPONSABILIDADES

| Agente | Responsabilidad principal |
|--------|--------------------------|
| **Claude** | Diseño SQL, harness, coordinación técnica, auditorías |
| **VS** | Implementación frontend, detección de bugs en build |
| **CC** | QA visual multirol, validación funcional, reportes |
| **GPT** | Auditoría arquitectónica, visto bueno de etapa |
| **Freddy** | Validación operacional institucional, decisiones de dominio |

---

## 12. ANTI-PATTERNS DE TESTING

```
❌ Cerrar una etapa sin QA multirol
❌ Modificar PDF sin validación de formato
❌ Aplicar migración SQL sin harness previo
❌ Asumir estabilidad sin prueba de regresión
❌ Validar solo el caso positivo (happy path)
❌ Ignorar warnings de consola (pueden ser errores futuros)
❌ Aprobar sin visto bueno de GPT en etapas mayores
```

---

## 13. HISTORIAL DE HARNESS

| Harness | Etapa | Casos | Resultado |
|---------|-------|-------|-----------|
| Motor temporal planning | Fase 5B (V1) | 14 | ✅ 14/14 PASS |
| Motor temporal sheets | Fase 5C (V1) | 14 | ✅ 14/14 PASS |
| RLS service_sheets | Fase 6A.2 (V1) | 15 pruebas funcionales | ✅ 15/15 PASS |
| RLS multinivel | V2.1C | 16 (planificado) | ⏳ Pendiente |

---

*Documento estratégico — Sistema Operativo Policial V2*
*Fuerza Pública de Costa Rica | Mayo 2026*
