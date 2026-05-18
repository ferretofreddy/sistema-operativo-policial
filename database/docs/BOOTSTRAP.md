# Bootstrap — Sistema Operativo Policial
## Firebase → Supabase + PostgreSQL

Guía de ejecución ordenada. Cada fase valida la anterior antes de continuar.

---

## FASE 1 — Proyecto Supabase

### 1.1 Crear proyecto
1. Ir a [supabase.com](https://supabase.com) → New project
2. Nombre: `sistema-operativo-policial`
3. Región: `South America (São Paulo)` — más cercana a Costa Rica
4. Contraseña de base de datos: generar una fuerte y guardarla en gestor de contraseñas

### 1.2 Guardar credenciales
En **Project Settings → API**:
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```
Crear archivo `frontend/.env.local` (ya en `.gitignore`):
```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### 1.3 Habilitar extensiones
En **Database → Extensions**:
- `pgcrypto` → habilitar ✓
- `postgis` → habilitar ✓ (si disponible en el plan)
- `unaccent` → habilitar ✓

### 1.4 Conectar GitHub (opcional pero recomendado)
En **Project Settings → Integrations → GitHub**:
- Conectar repositorio
- Esto activa schema branching y preview databases

---

## FASE 2 — Migraciones de base de datos

Ejecutar en **SQL Editor** de Supabase en este orden exacto.

### 2.1 Schema principal
```
database/migrations/001_schema.sql
```
Verificar que no hay errores. Debe crear ~18 tablas.

```sql
-- Verificación post-ejecución
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
Resultado esperado: `audit_logs, conditions, delegations, order_actions, orders, planning, planning_activities, planning_days, ranks, resource_assignments, resource_types, resources, service_sheets, sheet_activities, sheet_officers, sheet_resources, squads, users`

### 2.2 RLS y vistas
```
database/migrations/002_rls.sql
```
Verificar que RLS está activo:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
Todas deben mostrar `rowsecurity = true`.

### 2.3 PostGIS (opcional)
Solo si la extensión PostGIS se habilitó en 1.3:
```
database/migrations/003_postgis.sql
```

---

## FASE 3 — Seeds mínimos

### 3.1 Catálogos
```
database/seeds/001_catalogs.sql
```
Verificar:
```sql
SELECT count(*) FROM ranks;       -- debe ser 15
SELECT count(*) FROM conditions;  -- debe ser 10
SELECT count(*) FROM resource_types; -- debe ser 9
```

### 3.2 Territorio base
```
database/seeds/002_territorio_base.sql
```
Verificar:
```sql
SELECT r.nombre AS region, d.nombre AS delegacion, s.nombre AS escuadra
FROM squads s
JOIN delegations d ON d.id = s.delegation_id
JOIN regions r     ON r.id = d.region_id;
```
Debe retornar 1 fila: `Región Central | Delegación Central | Escuadra Alpha`

---

## FASE 4 — Usuario admin real

### 4.1 Crear usuario en Supabase Auth

**Opción A — Dashboard (más simple):**
1. Ir a **Authentication → Users → Invite user**
2. Email: `admin@sistema.go.cr`
3. Copiar el UUID generado de la tabla

**Opción B — Supabase CLI:**
```bash
# Instalar CLI si no está instalado
npm install -g supabase

# Autenticar
supabase login

# Crear usuario
supabase auth admin create-user \
  --email admin@sistema.go.cr \
  --password <contraseña-segura> \
  --email-confirm \
  --project-ref <project-ref>
```

### 4.2 Obtener UUID del admin
```sql
SELECT id, email, created_at
FROM auth.users
WHERE email = 'admin@sistema.go.cr';
```
Copiar el `id` (UUID).

### 4.3 Insertar perfil institucional
Abrir `database/seeds/003_admin_user.sql`, reemplazar `<AUTH_UUID_AQUI>` con el UUID real y ejecutar.

Verificar:
```sql
SELECT u.email, u.rol, r.nombre AS rango, d.nombre AS delegacion
FROM users u
JOIN ranks r       ON r.id = u.rank_id
JOIN delegations d ON d.id = u.delegation_id
WHERE u.email = 'admin@sistema.go.cr';
```

---

## FASE 5 — Activar Supabase en el frontend

### 5.1 Instalar dependencia
```bash
cd frontend
npm install @supabase/supabase-js
```

### 5.2 Activar SupabaseProvider
En `frontend/src/core/providers/providerRegistry.js`:
```js
// ANTES:
import { FirebaseProvider }  from "./firebase/FirebaseProvider";
// ...
_providerInstance = new FirebaseProvider();

// DESPUÉS:
// import { FirebaseProvider }  from "./firebase/FirebaseProvider";
import { SupabaseProvider } from "./supabase/SupabaseProvider";
// ...
_providerInstance = new SupabaseProvider();
```

### 5.3 Activar Supabase Auth
En `frontend/src/core/adapters/authAdapter.js`:
```js
// ANTES:
const ACTIVE_PROVIDER = "firebase";

// DESPUÉS:
const ACTIVE_PROVIDER = "supabase";
```

### 5.4 Verificar que .env.local existe
```bash
cat frontend/.env.local
# Debe mostrar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
```

---

## FASE 6 — Validación completa

Ejecutar en orden. Si algún punto falla, detener y diagnosticar antes de continuar.

### 6.1 Login
- [ ] Ir a la app en el navegador
- [ ] Login con `admin@sistema.go.cr`
- [ ] Debe redirigir a `/admin` sin errores en consola
- [ ] `AuthContext.userData` debe tener `rol: "admin"`

### 6.2 Datos territoriales
- [ ] El dashboard admin debe cargar sin errores
- [ ] Los selectores de región deben mostrar "Región Central"
- [ ] Los selectores de delegación deben mostrar "Delegación Central"

### 6.3 RLS básico
En **SQL Editor** con sesión del admin:
```sql
-- Simular sesión admin
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "<AUTH_UUID_ADMIN>"}';

-- Debe retornar 1 usuario (el admin mismo)
SELECT count(*) FROM users;

-- Debe retornar 1 región
SELECT count(*) FROM regions;

-- Debe retornar registros de auditoría (solo admin puede verlos)
SELECT count(*) FROM audit_logs;
```

### 6.4 CRUD mínimo
- [ ] Crear una región desde el panel admin
- [ ] Verificar que aparece en la lista
- [ ] Verificar que `audit_logs` registró el INSERT

### 6.5 Test de permisos territoriales
Crear un usuario supervisor desde el panel admin:
- [ ] Asignar a Delegación Central, Escuadra Alpha
- [ ] Hacer login con ese usuario
- [ ] Verificar que NO puede ver otras delegaciones
- [ ] Verificar que NO puede acceder a `/admin`

---

## NOTAS IMPORTANTES

### Sobre `createUser` en Supabase
Con `anon key`, `supabase.auth.signUp()` crea el usuario pero:
- Envía email de confirmación (configurable en Auth settings)
- El usuario crea su propia sesión al registrarse

Para **crear usuarios como admin sin perder sesión propia**:
1. Deshabilitar confirmación de email en Auth settings (solo para desarrollo)
2. O crear una Edge Function con `service_role key` que use `admin.createUser()`

### Sobre datos históricos de Firebase
No migrar todavía. El sistema funciona con datos nuevos desde PostgreSQL.
Si en el futuro se necesita histórico de Firestore:
- Exportar colecciones con `firebase-admin`
- Transformar con script Node.js usando el `COLLECTION_MAP` de SupabaseProvider
- Insertar vía Supabase client con `service_role key`

### Sobre `services/` legacy
Los archivos en `frontend/src/services/` (firebaseQuery.js, userService.js, etc.)
pueden eliminarse progresivamente a medida que los repositories los reemplazan.
No eliminar hasta confirmar que ningún módulo los importa directamente.

### Si algo falla al cambiar provider
El rollback es inmediato:
1. Volver `ACTIVE_PROVIDER = "firebase"` en authAdapter.js
2. Volver `new FirebaseProvider()` en providerRegistry.js
3. El sistema funciona exactamente como antes
