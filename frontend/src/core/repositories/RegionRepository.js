// src/core/repositories/RegionRepository.js
// Tabla SQL: regions | Firestore: regiones

import { BaseRepository } from "./BaseRepository";
import { getProvider }    from "../providers/providerRegistry";

const COLLECTION = "regions";

class RegionRepositoryClass extends BaseRepository {

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

  /** Regiones activas — para selectores territoriales. */
  async getActivas() {
    return this.getAll({ estado: "activo" });
  }

  /** Crear región. */
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

export const RegionRepository = new RegionRepositoryClass();
