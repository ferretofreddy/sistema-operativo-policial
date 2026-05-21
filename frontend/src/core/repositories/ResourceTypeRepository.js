// src/core/repositories/ResourceTypeRepository.js
// Tabla SQL: resource_types | Firestore: tipos_recurso

import { BaseRepository } from "./BaseRepository";
import { getProvider }    from "../providers/providerRegistry";

const COLLECTION = "resource_types";

class ResourceTypeRepositoryClass extends BaseRepository {

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

  /** Tipos activos — para selectores en CrearRecurso. */
  async getActivos() {
    return this.getAll({ estado: "activo" });
  }

  /** Todos incluyendo inactivos (panel admin). */
  async getTodos() {
    return this.getAll({}, { includeInactive: true });
  }

  /** Crear tipo de recurso. */
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

export const ResourceTypeRepository = new ResourceTypeRepositoryClass();
