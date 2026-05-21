// src/core/repositories/DelegationRepository.js
//
// Repository de delegaciones territoriales.
// Tabla SQL: delegations
// En Firestore era: delegaciones
//
// RELACIÓN: delegations.region_id → regions.id
// region_id NO existe en users — se obtiene vía JOIN

import { BaseRepository } from "./BaseRepository";

const COLLECTION = "delegations";

class DelegationRepositoryClass extends BaseRepository {
  constructor() {
    super(COLLECTION);
  }

  /**
   * Delegaciones de una región específica.
   * Usado en selectores cuando el usuario selecciona una región primero.
   */
  async getByRegion(regionId, options = {}) {
    return this.getAll({ region_id: regionId, estado: "activo" }, options);
  }

  /**
   * Todas las delegaciones activas.
   * Usado en panel admin para ver todo el territorio.
   */
  async getActivas() {
    return this.getAll({ estado: "activo" }, {});
  }

  /**
   * Crear delegación.
   */
  async crear(data) {
    return this.create(null, {
      ...data,
      estado: data.estado ?? "activo",
    });
  }

  /**
   * Soft delete — implementa contrato de BaseRepository.
   * Nunca DELETE físico. Solo cambia estado a inactivo.
   * Alias semántico: desactivar() → softDelete()
   */
  async softDelete(id) {
    return this.update(id, { estado: "inactivo" });
  }

  /** Alias semántico en español para softDelete(). */
  async desactivar(id) {
    return this.softDelete(id);
  }
}

export const DelegationRepository = new DelegationRepositoryClass();
