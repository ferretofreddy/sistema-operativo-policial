// src/core/repositories/DelegationRepository.js
// Tabla SQL: delegations | Firestore: delegaciones

import { BaseRepository } from "./BaseRepository";
import { getProvider }    from "../providers/providerRegistry";

const COLLECTION = "delegations";

class DelegationRepositoryClass extends BaseRepository {

  async getAll(filters = {}, options = {}) {
    return getProvider().fetchCollection(COLLECTION, this._cleanFilters(filters), {
      orderByField:    options.orderByField    ?? "nombre",
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

  // =========================================
  // DOMINIO
  // =========================================

  /** Delegaciones de una región — flujo natural del selector territorial. */
  async getByRegion(regionId) {
    return this.getAll({ region_id: regionId, estado: "activo" });
  }

  /** Todas las delegaciones activas. */
  async getActivas() {
    return this.getAll({ estado: "activo" });
  }

  /** Crear delegación. */
  async crear(data) {
    return getProvider().insert(COLLECTION, {
      ...data,
      estado: data.estado ?? "activo",
    });
  }

  /** Alias semántico. */
  async desactivar(id) {
    return this.softDelete(id);
  }

  // =========================================
  // V2.1A — MODELO JERÁRQUICO
  // =========================================

  async getByType(delegationType) {
    return getProvider().fetchCollection('delegations', {
      delegation_type: delegationType,
    });
  }

  async getDistritalesByParent(parentDelegationId) {
    return getProvider().fetchCollection('delegations', {
      parent_delegation_id: parentDelegationId,
      delegation_type: 'distrital',
    });
  }

  async getScope(delegationId) {
    const { supabase } = await import('../providers/supabase/SupabaseProvider');
    const { data, error } = await supabase
      .rpc('get_delegation_scope', { p_delegation_id: delegationId });
    if (error) throw error;
    return data ?? [];
  }
}

export const DelegationRepository = new DelegationRepositoryClass();
