# core/adapters/

## Qué son los adapters

Los adapters resuelven el problema de **vendor lock-in en el frontend**.

Un adapter es una capa que transforma la interfaz de un proveedor externo
(Firebase, Supabase, una API REST) en una interfaz estable que el resto del
proyecto puede usar sin saber qué hay detrás.

## Cuándo necesitas un adapter vs un repository

| Situación | Usa |
|---|---|
| Operación de datos (leer, crear, actualizar, eliminar) | `Repository` |
| Conversión de formato (Timestamp → Date, ISO → string) | `Adapter` |
| Operación de auth (login, logout, sesión) | `AuthAdapter` |
| Operación de archivos (subir, descargar, generar) | `StorageAdapter` |
| Lógica de territorio (scope, filtros, permisos UI) | `TerritoryAdapter` |

## Adapters actuales

### `dateAdapter.js`
Convierte entre Firebase Timestamp, ISO strings y Date nativa.
**Regla:** el frontend nunca recibe un `Timestamp` directamente.
Siempre pasa por `toDate()` o `formatDate()`.

### `authAdapter.js` — `AuthService`
Centraliza login, logout, onSessionChange, createUser, sendPasswordReset.
**Regla:** ningún componente importa `firebase/auth` directamente.
Cuando migremos a Supabase Auth, solo cambia la implementación interna.

### `storageAdapter.js`
Centraliza descarga de archivos (PDF, Excel) y en el futuro upload a Storage.
**Regla:** los componentes llaman `downloadBlob()` o `getServiceSheetFilename()`,
nunca `saveAs()` de file-saver directamente.

### `territoryAdapter.js`
Convierte `userData` en scopes territoriales, filtros de query y config de UI.
**Regla:** ningún componente calcula `esAdmin`, `esUnidadOperativa` o
`filters` directamente. Todo pasa por `getTerritoryScope()`.

## Adapters futuros

### `firebase/` (submódulo)
Adapters específicos de Firebase que no son CRUD:
- `realtimeAdapter.js` — onSnapshot listeners
- `storageAdapter.js` — Firebase Storage (si se agrega)

### `supabase/` (submódulo)
Implementaciones Supabase de los mismos adapters:
- `realtimeAdapter.js` — Supabase Realtime (Postgres WAL)
- `storageAdapter.js` — Supabase Storage buckets
- `authAdapter.js` — Supabase Auth con JWT

## Regla de oro

```
Componente React
       ↓
   Service (orquestación)
       ↓
   Repository (CRUD)       Adapter (formato/auth/files)
       ↓                        ↓
   Provider (Firebase hoy, Supabase mañana)
```

Los adapters son **horizontales** — sirven a services, repositories y
componentes según la necesidad. No son parte de la cadena vertical de datos.
