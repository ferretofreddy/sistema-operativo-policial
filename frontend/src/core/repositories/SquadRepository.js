// src/core/repositories/SquadRepository.js
// Tabla SQL: squads | Firestore: escuadras

import { BaseRepository } from "./BaseRepository";
import { getProvider }    from "../providers/providerRegistry";

const COLLECTION = "squads";

class SquadRepositoryClass extends BaseRepository {

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

  /** Escuadras de una delegación. */
  async getByDelegation(delegationId) {
    return this.getAll({ delegation_id: delegationId, estado: "activo" });
  }

  /** Todas las escuadras activas. */
  async getActivas() {
    return this.getAll({ estado: "activo" });
  }

  /** Crear escuadra. */
  async crear(data) {
    return getProvider().insert(COLLECTION, {
      ...data,
      estado: data.estado ?? "activo",
    });
  }

  /** Asignar supervisor a una escuadra. */
  async asignarSupervisor(squadId, supervisorUserId) {
    return getProvider().patch(COLLECTION, squadId, {
      supervisor_id: supervisorUserId,
    });
  }

  /** Alias semántico. */
  async desactivar(id) {
    return this.softDelete(id);
  }
}

export const SquadRepository = new SquadRepositoryClass();
