// src/core/repositories/ResourceRepository.js
//
// Repository de recursos operativos (patrullas, motos, etc.)
// Tabla SQL: resources
// En Firestore era: recursos_operativos

import { BaseRepository } from "./BaseRepository";

const COLLECTION = "resources";

class ResourceRepositoryClass extends BaseRepository {
  constructor() {
    super(COLLECTION);
  }

  // =========================================
  // QUERIES TERRITORIALES
  // =========================================

  /**
   * Recursos de una delegación.
   * El filtro territorial más frecuente en el sistema.
   */
  async getByDelegation(delegationId, options = {}) {
    return this.getAll({ delegation_id: delegationId }, options);
  }

  /**
   * Recursos de una escuadra específica.
   */
  async getBySquad(squadId, options = {}) {
    return this.getAll({ squad_id: squadId }, options);
  }

  /**
   * Recursos activos de una delegación.
   * Los estados válidos son: activo, asignado, mantenimiento, inactivo.
   */
  async getActivosByDelegation(delegationId) {
    return this.getAll(
      { delegation_id: delegationId, estado: "activo" },
      {},
    );
  }

  /**
   * Recursos disponibles (activos + no asignados) de una delegación.
   * Usados en selectores de CrearHojaServicio.
   */
  async getDisponiblesByDelegation(delegationId) {
    return this.getAll(
      { delegation_id: delegationId, estado: "activo" },
      {},
    );
  }

  // =========================================
  // CRUD ESPECÍFICO
  // =========================================

  /**
   * Crear recurso operativo.
   * @param {Object} data - Campos del recurso (sin id ni auth_id)
   */
  async crear(data) {
    return this.create(null, {
      ...data,
      estado: data.estado ?? "activo",
    });
  }

  /**
   * Actualizar estado de un recurso.
   * Estados: activo | asignado | mantenimiento | inactivo
   */
  async actualizarEstado(id, estado) {
    return this.update(id, { estado });
  }

  /**
   * Soft delete — implementa contrato de BaseRepository.
   * Nunca DELETE físico. Solo cambia estado a inactivo.
   */
  async softDelete(id) {
    return this.update(id, { estado: "inactivo" });
  }

  /** Alias semántico en español para softDelete(). */
  async desactivar(id) {
    return this.softDelete(id);
  }
}

export const ResourceRepository = new ResourceRepositoryClass();
