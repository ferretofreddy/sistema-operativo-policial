// src/core/adapters/territoryAdapter.js
//
// Adaptador territorial — centraliza lógica de scopes territoriales.
//
// PROBLEMA que resuelve:
// La lógica de "qué ve cada rol" está duplicada en:
//   - useRoles.js (filters, territory)
//   - GestionEscuadra, GestionRecurso, GestionUsuarios (filtros derivados)
//   - CrearEscuadra, CrearRecurso (init desde userData)
//   - Firestore queries (where region_id, delegacion_id...)
//
// Este adapter es el puente entre userData y los filtros de queries.
// Luego se convierte directamente en RLS scopes de Supabase/PostgreSQL.
//
// REGLA: ningún componente calcula su propio scope territorial.
// Todos usan TerritoryScope de este archivo.

// =========================================
// TIPOS
// =========================================

/**
 * @typedef {object} TerritoryScope
 * @property {boolean} all - Admin: ve todo
 * @property {boolean} none - Sin territorio (agente sin asignar)
 * @property {string} [region_id]
 * @property {string} [region_nombre]
 * @property {string} [delegacion_id]
 * @property {string} [delegacion_nombre]
 * @property {string} [escuadra_id]
 * @property {string} [escuadra_nombre]
 */

/**
 * @typedef {object} QueryFilters
 * Filtros listos para pasar a getProvider().fetchCollection()
 */

// =========================================
// SCOPE DESDE USERDATA
// =========================================

/**
 * Calcular el scope territorial de un usuario.
 * Centraliza la lógica que hoy está en useRoles.js territory.
 * @param {object} userData
 * @returns {TerritoryScope}
 */
export function getTerritoryScope(userData) {
  const rol = userData?.rol;

  if (!rol || !userData) {
    return { none: true };
  }

  if (rol === "admin") {
    return { all: true };
  }

  if (rol === "jefatura") {
    return {
      region_id: userData.region_id,
      region_nombre: userData.region_nombre,
      delegacion_id: userData.delegacion_id,
      delegacion_nombre: userData.delegacion_nombre,
    };
  }

  if (rol === "unidad_operativa") {
    return {
      region_id: userData.region_id,
      region_nombre: userData.region_nombre,
      delegacion_id: userData.delegacion_id,
      delegacion_nombre: userData.delegacion_nombre,
    };
  }

  if (rol === "supervisor") {
    return {
      region_id: userData.region_id,
      region_nombre: userData.region_nombre,
      delegacion_id: userData.delegacion_id,
      delegacion_nombre: userData.delegacion_nombre,
      escuadra_id: userData.escuadra_id,
      escuadra_nombre: userData.escuadra_nombre,
    };
  }

  if (rol === "agente") {
    return {
      region_id: userData.region_id,
      region_nombre: userData.region_nombre,
      delegacion_id: userData.delegacion_id,
      delegacion_nombre: userData.delegacion_nombre,
      escuadra_id: userData.escuadra_id,
      escuadra_nombre: userData.escuadra_nombre,
    };
  }

  return { none: true };
}

// =========================================
// FILTROS DE QUERY DESDE SCOPE
// =========================================

/**
 * Convertir un TerritoryScope a filtros de query.
 * Estos filtros van directo a repository.getAll(filters).
 * Luego en Supabase se convierten en RLS policies automáticamente.
 * @param {TerritoryScope} scope
 * @returns {QueryFilters}
 */
export function scopeToFilters(scope) {
  if (scope.all) return {};
  if (scope.none) return { uid: "no-access" }; // Query que retorna vacío

  const filters = {};

  if (scope.region_id) filters.region_id = scope.region_id;
  if (scope.delegacion_id) filters.delegacion_id = scope.delegacion_id;
  if (scope.escuadra_id) filters.escuadra_id = scope.escuadra_id;

  return filters;
}

/**
 * Shortcut: userData → filtros listos para query.
 * @param {object} userData
 * @returns {QueryFilters}
 */
export function getUserQueryFilters(userData) {
  return scopeToFilters(getTerritoryScope(userData));
}

// =========================================
// VALIDACIONES TERRITORIALES
// =========================================

/**
 * Verificar si un usuario puede acceder a una entidad territorial.
 * Usado en DetalleOrden, VerPlanificacion para validar acceso.
 * @param {TerritoryScope} scope
 * @param {{ region_id?: string, delegacion_id?: string }} entity
 * @returns {boolean}
 */
export function canAccessEntity(scope, entity) {
  if (scope.all) return true;
  if (scope.none) return false;

  const regionOk = !entity.region_id || entity.region_id === scope.region_id;
  const delegacionOk =
    !entity.delegacion_id ||
    entity.delegacion_id === scope.delegacion_id;

  return regionOk && delegacionOk;
}

// =========================================
// RESETS TERRITORIALES
// =========================================

/**
 * Cuando cambia region_id en un formulario, resetear campos dependientes.
 * Evita el patrón repetido en CrearEscuadra, CrearRecurso, GestionUsuarios...
 * @param {object} formData
 * @param {string} changedField
 * @returns {object} formData actualizado con campos reseteados
 */
export function resetDependentFields(formData, changedField) {
  const resets = {
    region_id: {
      delegacion_id: "",
      delegacion_nombre: "",
      escuadra_id: "",
      escuadra_nombre: "",
    },
    delegacion_id: {
      escuadra_id: "",
      escuadra_nombre: "",
    },
  };

  const fieldsToReset = resets[changedField];
  if (!fieldsToReset) return formData;

  return { ...formData, ...fieldsToReset };
}

/**
 * Inicializar valores territoriales de un formulario desde userData.
 * Para roles con territorio fijo (supervisor, unidad_operativa).
 * @param {object} userData
 * @returns {object} Campos territoriales para setFormData()
 */
export function getTerritoryDefaults(userData) {
  const scope = getTerritoryScope(userData);

  if (scope.all || scope.none) return {};

  return {
    region_id: scope.region_id ?? "",
    delegacion_id: scope.delegacion_id ?? "",
    escuadra_id: scope.escuadra_id ?? "",
  };
}

// =========================================
// PERMISOS DE UI
// =========================================

/**
 * Determinar qué campos territoriales debe mostrar el formulario.
 * Evita el patrón hidden={!esAdmin} repetido en layouts.
 * @param {object} userData
 * @returns {{ showRegion: boolean, showDelegacion: boolean, showEscuadra: boolean, lockTerritory: boolean }}
 */
export function getTerritoryUIConfig(userData) {
  const rol = userData?.rol;

  return {
    // Mostrar selectores de región/delegación solo si puede cambiarlos
    showRegion: rol === "admin",
    showDelegacion: rol === "admin",

    // Mostrar escuadra para roles que necesitan asignarla
    showEscuadra: ["admin", "supervisor", "agente"].includes(rol),

    // Territorio bloqueado (solo lectura) para roles no-admin
    lockTerritory: rol !== "admin",
  };
}
