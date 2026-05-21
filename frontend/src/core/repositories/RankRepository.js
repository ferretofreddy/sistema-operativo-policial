// src/core/repositories/RankRepository.js
// Tabla SQL: ranks | Firestore: rangos_usuario

import { BaseRepository } from "./BaseRepository";
import { getProvider }    from "../providers/providerRegistry";

const COLLECTION = "ranks";

class RankRepositoryClass extends BaseRepository {

  async getAll(filters = {}, options = {}) {
    return getProvider().fetchCollection(COLLECTION, this._cleanFilters(filters), {
      orderByField:    options.orderByField    ?? "orden_jerarquico",
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

  /** Todos los rangos activos ordenados jerárquicamente. */
  async getActivos() {
    return this.getAll({ estado: "activo" });
  }

  /** Todos los rangos incluyendo inactivos (panel admin). */
  async getTodos() {
    return this.getAll({}, { includeInactive: true });
  }

  /** Crear rango nuevo. */
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
}

export const RankRepository = new RankRepositoryClass();
