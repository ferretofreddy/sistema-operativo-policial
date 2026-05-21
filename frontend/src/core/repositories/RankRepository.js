// src/core/repositories/RankRepository.js
//
// Repository de rangos institucionales.
// Tabla SQL: ranks
// En Firestore era: rangos_usuario
//
// Es un catálogo read-heavy — candidato a caché.
// Cambios muy infrecuentes.

import { BaseRepository } from "./BaseRepository";

const COLLECTION = "ranks";

class RankRepositoryClass extends BaseRepository {
  constructor() {
    super(COLLECTION);
  }

  /**
   * Todos los rangos activos, ordenados jerárquicamente.
   * Usado en selectores de CrearUsuario y GestionUsuarios.
   */
  async getActivos() {
    return this.getAll(
      { estado: "activo" },
      { orderBy: "orden_jerarquico", direction: "asc" },
    );
  }

  /**
   * Todos los rangos (incluyendo inactivos).
   * Solo para panel admin de gestión de catálogo.
   */
  async getTodos() {
    return this.getAll({}, { orderBy: "orden_jerarquico", direction: "asc" });
  }

  /**
   * Crear rango.
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

export const RankRepository = new RankRepositoryClass();
