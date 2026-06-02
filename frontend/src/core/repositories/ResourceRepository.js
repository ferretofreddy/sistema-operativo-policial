// src/core/repositories/ResourceRepository.js
// Tabla SQL: resources | resource_assignments
// ACTUALIZADO — Mayo 2026
// Agregado: getOficialesDelRecurso via resource_assignments

import { BaseRepository } from "./BaseRepository";
import { getProvider }    from "../providers/providerRegistry";
import { supabase }       from "../providers/supabase/SupabaseProvider";

const COLLECTION = "resources";

class ResourceRepositoryClass extends BaseRepository {

  async getAll(filters = {}, options = {}) {
    return getProvider().fetchCollection(COLLECTION, this._cleanFilters(filters), {
      orderByField:    options.orderByField    ?? "nombre_recurso",
      orderByDir:      options.orderByDir      ?? "asc",
      includeInactive: options.includeInactive ?? false,
    });
  }

  async getById(id) {
    return getProvider().fetchById(COLLECTION, id);
  }

  async create(id, data) {
    return getProvider().insert(COLLECTION, data);
  }

  async update(id, data) {
    return getProvider().patch(COLLECTION, id, data);
  }

  async softDelete(id) {
    return getProvider().patch(COLLECTION, id, { estado: "inactivo" });
  }

  // ──────────────────────────────────────
  // DOMINIO TERRITORIAL
  // ──────────────────────────────────────

  async getByDelegation(delegationId) {
    return this.getAll({ delegation_id: delegationId });
  }

  async getBySquad(squadId) {
    return this.getAll({ squad_id: squadId });
  }

  async getActivosByDelegation(delegationId) {
    return this.getAll({ delegation_id: delegationId, estado: "activo" });
  }

  async getDisponiblesByDelegation(delegationId) {
    return this.getAll({ delegation_id: delegationId, estado: "activo" });
  }

  async crear(data) {
    return getProvider().insert(COLLECTION, {
      ...data,
      estado: data.estado ?? "activo",
    });
  }

  async actualizarEstado(id, estado) {
    return getProvider().patch(COLLECTION, id, { estado });
  }

  async desactivar(id) {
    return this.softDelete(id);
  }

  // ──────────────────────────────────────
  // OFICIALES — tabla resource_assignments
  // ──────────────────────────────────────

  async getOficialesDelRecurso(resourceId) {
    const { data, error } = await supabase
      .from("resource_assignments")
      .select(`
        user_id,
        users (
          id,
          nombre,
          apellido1,
          apellido2,
          rango,
          rol,
          estado_usuario
        )
      `)
      .eq("resource_id", resourceId)
      .is("liberado_en", null);

    if (error) throw new Error(error.message);

    return (data ?? [])
      .map(row => row.users)
      .filter(Boolean)
      .filter(u => u.estado_usuario === "activo");
  }
}

export const ResourceRepository = new ResourceRepositoryClass();
