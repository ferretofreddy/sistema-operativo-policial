// src/core/repositories/SquadRepository.js
//
// Repository de escuadras operativas.
// Tabla SQL: squads
// En Firestore era: escuadras
//
// RELACIONES:
//   squads.delegation_id → delegations.id
//   squads.supervisor_id → users.id (FK circular, DEFERRABLE)

import { BaseRepository } from "./BaseRepository";

const COLLECTION = "squads";

class SquadRepositoryClass extends BaseRepository {
  constructor() {
    super(COLLECTION);
  }

  /**
   * Escuadras de una delegación.
   * El filtro territorial más frecuente para escuadras.
   */
  async getByDelegation(delegationId, options = {}) {
    return this.getAll(
      { delegation_id: delegationId, estado: "activo" },
      options,
    );
  }

  /**
   * Todas las escuadras activas.
   * Usado en panel admin.
   */
  async getActivas() {
    return this.getAll({ estado: "activo" }, {});
  }

  /**
   * Crear escuadra.
   * supervisor_id puede ser null al crear — se asigna después.
   */
  async crear(data) {
    return this.create(null, {
      ...data,
      estado: data.estado ?? "activo",
    });
  }

  /**
   * Asignar supervisor a una escuadra.
   * @param {string} squadId
   * @param {string} supervisorUserId - ID interno de users (no auth_id)
   */
  async asignarSupervisor(squadId, supervisorUserId) {
    return this.update(squadId, { supervisor_id: supervisorUserId });
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

export const SquadRepository = new SquadRepositoryClass();
