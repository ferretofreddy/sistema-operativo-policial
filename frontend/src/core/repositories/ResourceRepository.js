// src/core/repositories/ResourceRepository.js
// Tabla SQL: resources | Firestore: recursos_operativos

import { BaseRepository } from "./BaseRepository";
import { getProvider }    from "../providers/providerRegistry";

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

  // =========================================
  // DOMINIO TERRITORIAL
  // =========================================

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

  /** Crear recurso operativo. */
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
}

export const ResourceRepository = new ResourceRepositoryClass();
