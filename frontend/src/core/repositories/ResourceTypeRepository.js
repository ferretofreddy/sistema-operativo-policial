// src/core/repositories/ResourceTypeRepository.js
//
// Repository de tipos de recurso operativo.
// Tabla SQL: resource_types
// En Firestore era: tipos_recurso
//
// Catálogo read-heavy (patrulla, moto, cuadraciclo, etc.)

import { BaseRepository } from "./BaseRepository";

const COLLECTION = "resource_types";

class ResourceTypeRepositoryClass extends BaseRepository {
  constructor() {
    super(COLLECTION);
  }

  /**
   * Tipos activos.
   * Usado en selectores de CrearRecurso.
   */
  async getActivos() {
    return this.getAll({ estado: "activo" }, {});
  }

  /**
   * Todos los tipos (incluyendo inactivos).
   * Solo para panel admin de gestión de catálogo.
   */
  async getTodos() {
    return this.getAll({}, {});
  }

  /**
   * Crear tipo de recurso.
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

export const ResourceTypeRepository = new ResourceTypeRepositoryClass();
