// src/core/providers/supabase/SupabaseProvider.js
//
// Implementación de BaseProvider usando Supabase JS SDK.
//
// Para activar: cambiar providerRegistry.js de FirebaseProvider a SupabaseProvider.
// Ningún repository, adapter ni componente cambia.
//
// INSTALAR:
//   npm install @supabase/supabase-js
//
// VARIABLES DE ENTORNO (.env):
//   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<anon-key>

import { createClient } from "@supabase/supabase-js";
import { BaseProvider }  from "../BaseProvider";

// =========================================
// CLIENTE SUPABASE (singleton)
// =========================================

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "[SupabaseProvider] Faltan variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
});

// =========================================
// MAPEO: nombres Firestore → nombres SQL
// Las colecciones Firestore tenían nombres distintos a las tablas SQL.
// Este mapa traduce sin tocar repositories ni componentes.
// =========================================

const COLLECTION_MAP = {
  // Firestore → PostgreSQL
  usuarios:            "users",
  regiones:            "regions",
  delegaciones:        "delegations",
  escuadras:           "squads",
  recursos_operativos: "resources",
  tipos_recurso:       "resource_types",
  rangos_usuario:      "ranks",
  condiciones_usuario: "conditions",
  ordenes:             "orders",
  planificaciones:     "planning",
  hojas_servicio:      "service_sheets",

  // PostgreSQL (ya con nombre correcto — pasa sin cambio)
  users:               "users",
  regions:             "regions",
  delegations:         "delegations",
  squads:              "squads",
  resources:           "resources",
  resource_types:      "resource_types",
  ranks:               "ranks",
  conditions:          "conditions",
  orders:              "orders",
  planning:            "planning",
  service_sheets:      "service_sheets",
  resource_assignments: "resource_assignments",
  order_actions:       "order_actions",
  planning_days:       "planning_days",
  planning_activities: "planning_activities",
  sheet_resources:     "sheet_resources",
  sheet_officers:      "sheet_officers",
  sheet_activities:    "sheet_activities",
  audit_logs:          "audit_logs",
};

// =========================================
// NOTA: NO hay FIELD_MAP en este provider.
//
// Los repositories envían datos con nombres PostgreSQL correctos.
// El mapeo Firestore → SQL ocurre en repositories y migración de datos.
//
// REFERENCIA de campos renombrados (para repositories):
//   uid               → auth_id      (solo en insertWithId)
//   rango_id          → rank_id
//   condicion_id      → condition_id
//   delegacion_id     → delegation_id
//   escuadra_id       → squad_id
//   tipo_recurso_id   → resource_type_id
//
// CRÍTICO: region_id NO mapea a delegation_id.
//   region_id se obtiene vía JOIN: users → delegations → regions
//   No almacenar region_id denormalizado en users de PostgreSQL.
// =========================================

// =========================================
// ESTADO POR DEFECTO: equivalente Supabase de DEFAULT_ACTIVE_STATES
// =========================================

const DEFAULT_ACTIVE_STATES = {
  users:               { field: "estado_usuario", value: "activo" },
  squads:              { field: "estado",         value: "activo" },
  resources:           { field: "estado",         value: "activo" },
  regions:             { field: "estado",         value: "activo" },
  delegations:         { field: "estado",         value: "activo" },
  resource_types:      { field: "estado",         value: "activo" },
  ranks:               { field: "estado",         value: "activo" },
  conditions:          { field: "estado",         value: "activo" },
  // Firestore aliases
  usuarios:            { field: "estado_usuario", value: "activo" },
  escuadras:           { field: "estado",         value: "activo" },
  recursos_operativos: { field: "estado",         value: "activo" },
  regiones:            { field: "estado",         value: "activo" },
  delegaciones:        { field: "estado",         value: "activo" },
  tipos_recurso:       { field: "estado",         value: "activo" },
  rangos_usuario:      { field: "estado",         value: "activo" },
  condiciones_usuario: { field: "estado",         value: "activo" },
};

// =========================================
// HELPER: resolver nombre de tabla SQL
// =========================================

function resolveTable(collectionName) {
  return COLLECTION_MAP[collectionName] ?? collectionName;
}

// =========================================
// IMPLEMENTACIÓN
// =========================================

export class SupabaseProvider extends BaseProvider {
  // =========================================
  // FETCH COLECCIÓN
  // =========================================

  async fetchCollection(collectionName, filters = {}, options = {}) {
    const {
      orderByField    = "creado",
      orderByDir      = "asc",
      limitToFirst    = null,
      includeInactive = false,
    } = options;

    const table = resolveTable(collectionName);

    try {
      let query = supabase.from(table).select("*");

      // Filtro de estado activo por defecto
      const estadoConfig = DEFAULT_ACTIVE_STATES[collectionName];
      if (!includeInactive && estadoConfig && !filters[estadoConfig.field]) {
        query = query.eq(estadoConfig.field, estadoConfig.value);
      }

      // Filtros dinámicos — limpiar vacíos
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(
          ([, v]) => v !== undefined && v !== null && v !== "",
        ),
      );

      Object.entries(cleanFilters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      // Orden
      query = query.order(orderByField, { ascending: orderByDir === "asc" });

      // Límite
      if (limitToFirst) query = query.limit(limitToFirst);

      const { data, error } = await query;

      if (error) throw this._mapError(error, table, "fetchCollection");

      return data ?? [];
    } catch (error) {
      console.error(`[SupabaseProvider] fetchCollection(${table}):`, error.message);
      throw error;
    }
  }

  // =========================================
  // FETCH POR ID
  // =========================================

  async fetchById(collectionName, id) {
    const table = resolveTable(collectionName);

    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        // PGRST116 = no rows found — no es un error real
        if (error.code === "PGRST116") return null;
        throw this._mapError(error, table, "fetchById");
      }

      return data;
    } catch (error) {
      console.error(`[SupabaseProvider] fetchById(${table}, ${id}):`, error.message);
      throw error;
    }
  }

  // =========================================
  // INSERT
  // =========================================

  async insert(collectionName, data) {
    const table = resolveTable(collectionName);

    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert({ ...data, creado: this.now(), actualizado: this.now() })
        .select("id")
        .single();

      if (error) throw this._mapError(error, table, "insert");

      return result.id;
    } catch (error) {
      console.error(`[SupabaseProvider] insert(${table}):`, error.message);
      throw error;
    }
  }

  // =========================================
  // INSERT CON ID ESPECÍFICO (usuarios: auth_id como clave)
  // =========================================

  async insertWithId(collectionName, id, data) {
    const table = resolveTable(collectionName);

    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert({
          ...data,
          // En Supabase/PostgreSQL: id = uuid propio, auth_id = Supabase Auth uid
          // FirebaseProvider usaba el uid como document ID
          // SupabaseProvider usa auth_id como campo separado
          auth_id:    id,
          creado:     this.now(),
          actualizado: this.now(),
        })
        .select("id")
        .single();

      if (error) throw this._mapError(error, table, "insertWithId");

      return result.id;
    } catch (error) {
      console.error(`[SupabaseProvider] insertWithId(${table}):`, error.message);
      throw error;
    }
  }

  // =========================================
  // PATCH (actualización parcial)
  // =========================================

  async patch(collectionName, id, data) {
    const table = resolveTable(collectionName);

    try {
      const { error } = await supabase
        .from(table)
        .update({ ...data, actualizado: this.now() })
        .eq("id", id);

      if (error) throw this._mapError(error, table, "patch");
    } catch (error) {
      console.error(`[SupabaseProvider] patch(${table}, ${id}):`, error.message);
      throw error;
    }
  }

  // =========================================
  // REPLACE (reemplazo completo)
  // =========================================

  async replace(collectionName, id, data) {
    const table = resolveTable(collectionName);

    try {
      const { error } = await supabase
        .from(table)
        .upsert({ id, ...data, actualizado: this.now() });

      if (error) throw this._mapError(error, table, "replace");
    } catch (error) {
      console.error(`[SupabaseProvider] replace(${table}, ${id}):`, error.message);
      throw error;
    }
  }

  // =========================================
  // REMOVE (eliminación física — uso restringido)
  // =========================================

  async remove(collectionName, id) {
    const table = resolveTable(collectionName);

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id);

      if (error) throw this._mapError(error, table, "remove");
    } catch (error) {
      console.error(`[SupabaseProvider] remove(${table}, ${id}):`, error.message);
      throw error;
    }
  }

  // =========================================
  // TIMESTAMP
  // =========================================

  now() {
    // PostgreSQL acepta ISO string directamente
    return new Date().toISOString();
  }

  fromDate(date) {
    if (!date) return null;
    if (date instanceof Date) return date.toISOString();
    return new Date(date).toISOString();
  }

  // =========================================
  // ERROR MAPPING
  // Traduce errores de Supabase a mensajes de dominio
  // =========================================

  _mapError(error, table, operation) {
    const msg = error.message ?? "Error desconocido";
    const code = error.code ?? "";

    // Violación de unicidad
    if (code === "23505") {
      if (msg.includes("email"))   return new Error("El email ya está registrado");
      if (msg.includes("cedula"))  return new Error("La cédula ya está registrada");
      if (msg.includes("codigo"))  return new Error("El código ya existe");
      if (msg.includes("nombre") && msg.includes("delegation"))
        return new Error("Ya existe un registro con ese nombre en esta delegación");
      return new Error("Ya existe un registro con esos datos");
    }

    // Violación de FK
    if (code === "23503") {
      return new Error("Referencia inválida — el registro relacionado no existe");
    }

    // RLS bloqueó la operación
    if (code === "42501" || msg.includes("row-level security")) {
      return new Error("Sin permisos para esta operación");
    }

    // No encontrado (para single())
    if (code === "PGRST116") {
      return new Error(`Registro no encontrado en ${table}`);
    }

    console.error(`[SupabaseProvider] Error en ${operation}(${table}):`, error);
    return new Error(msg);
  }
}
