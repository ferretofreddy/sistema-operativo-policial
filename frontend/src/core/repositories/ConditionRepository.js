// src/core/repositories/ConditionRepository.js
//
// Repository de condiciones operativas del personal.
// Tabla SQL: conditions
// En Firestore era: condiciones_usuario
//
// Catálogo read-heavy. Incluye campo bloquea_operaciones
// que determina si el personal puede asignarse a hojas de servicio.

import { BaseRepository } from "./BaseRepository";

const COLLECTION = "conditions";

class ConditionRepositoryClass extends BaseRepository {
  constructor() {
    super(COLLECTION);
  }

  /**
   * Condiciones activas.
   * Usado en selectores de CrearUsuario y GestionUsuarios.
   */
  async getActivas() {
    return this.getAll({ estado: "activo" }, {});
  }

  /**
   * Condiciones que NO bloquean operaciones.
   * Usado en selectores de personal disponible para hojas de servicio.
   */
  async getOperativas() {
    return this.getAll(
      { estado: "activo", bloquea_operaciones: false },
      {},
    );
  }

  /**
   * Todas las condiciones (incluyendo inactivas).
   * Solo para panel admin de gestión de catálogo.
   */
  async getTodas() {
    return this.getAll({}, {});
  }

  /**
   * Crear condición.
   */
  async crear(data) {
    return this.create(null, {
      ...data,
      estado:              data.estado              ?? "activo",
      bloquea_operaciones: data.bloquea_operaciones ?? false,
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

export const ConditionRepository = new ConditionRepositoryClass();
