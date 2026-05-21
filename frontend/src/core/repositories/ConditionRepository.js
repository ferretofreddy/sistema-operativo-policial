// src/core/repositories/ConditionRepository.js
// Tabla SQL: conditions | Firestore: condiciones_usuario

import { BaseRepository } from "./BaseRepository";
import { getProvider }    from "../providers/providerRegistry";

const COLLECTION = "conditions";

class ConditionRepositoryClass extends BaseRepository {

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

  /** Condiciones activas. */
  async getActivas() {
    return this.getAll({ estado: "activo" });
  }

  /** Condiciones que NO bloquean operaciones — personal disponible para hojas. */
  async getOperativas() {
    return this.getAll({ estado: "activo", bloquea_operaciones: false });
  }

  /** Todas incluyendo inactivas (panel admin). */
  async getTodas() {
    return this.getAll({}, { includeInactive: true });
  }

  /** Crear condición nueva. */
  async crear(data) {
    return getProvider().insert(COLLECTION, {
      ...data,
      estado:              data.estado              ?? "activo",
      bloquea_operaciones: data.bloquea_operaciones ?? false,
    });
  }

  /** Alias semántico. */
  async desactivar(id) {
    return this.softDelete(id);
  }
}

export const ConditionRepository = new ConditionRepositoryClass();
