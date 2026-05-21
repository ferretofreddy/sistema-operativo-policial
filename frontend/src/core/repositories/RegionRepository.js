// src/core/repositories/RegionRepository.js
//
// Repository de regiones territoriales.
// Tabla SQL: regions
// En Firestore era: regiones

import { BaseRepository } from "./BaseRepository";

const COLLECTION = "regions";

class RegionRepositoryClass extends BaseRepository {
  constructor() {
    super(COLLECTION);
  }

  /**
   * Todas las regiones activas.
   * Usado en selectores territoriales de cualquier módulo.
   */
  async getActivas() {
    return this.getAll({ estado: "activo" }, {});
  }

  /**
   * Crear región.
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

export const RegionRepository = new RegionRepositoryClass();
