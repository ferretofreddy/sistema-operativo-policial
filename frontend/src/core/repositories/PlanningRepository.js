// src/core/repositories/PlanningRepository.js
//
// Repository de planificaciones operativas.
// Reemplaza acceso directo a Firestore en:
//   - CrearPlanificacion.jsx
//   - VerPlanificacion.jsx

import { BaseRepository } from "./BaseRepository";
import { getProvider } from "../providers/providerRegistry";

const COLLECTION = "planificaciones";

class PlanningRepositoryClass extends BaseRepository {
  // =========================================
  // LECTURA
  // =========================================

  async getAll(filters = {}, options = {}) {
    return getProvider().fetchCollection(
      COLLECTION,
      this._cleanFilters(filters),
      {
        orderByField: options.orderByField ?? "fecha_inicio",
        orderByDir: options.orderByDir ?? "desc",
        includeInactive: true,
      },
    );
  }

  async getById(id) {
    return getProvider().fetchById(COLLECTION, id);
  }

  /**
   * Obtener planificaciones activas (fecha_fin >= hoy) por territorio.
   * @param {object} territory - { region_id, delegacion_id }
   */
  async getActivasByTerritory(territory) {
    const todas = await this.getAll(territory);
    const hoy = new Date().toISOString().split("T")[0];
    return todas.filter((p) => p.fecha_fin >= hoy);
  }

  /**
   * Obtener planificaciones activas para una escuadra específica.
   * Usado en CrearHojaServicio.
   */
  async getActivasByEscuadra(escuadraId, territory) {
    const activas = await this.getActivasByTerritory(territory);
    return activas.filter((p) => p.escuadra_id === escuadraId);
  }

  // =========================================
  // ESCRITURA
  // =========================================

  /**
   * Crear planificación con validación de duplicado.
   * @param {object} data
   */
  async create(data) {
    const existente = await this._findDuplicado(
      data.escuadra_id,
      data.fecha_inicio,
    );

    if (existente) {
      throw new Error(
        "Ya existe una planificación para esta escuadra en esa fecha de inicio",
      );
    }

    return getProvider().insert(COLLECTION, data);
  }

  async update(id, data) {
    return getProvider().patch(COLLECTION, id, data);
  }

  // =========================================
  // ACTIVIDADES (arrays anidados — futuro: tabla planning_activities)
  // =========================================

  /**
   * Agregar actividad a un día de la planificación.
   * @param {string} planId
   * @param {number} diaIndex
   * @param {object} actividad
   * @param {Array} diasActuales - Estado actual del array dias[]
   */
  async addActividad(planId, diaIndex, actividad, diasActuales) {
    const nuevosDias = diasActuales.map((dia, i) => {
      if (i !== diaIndex) return dia;
      return { ...dia, actividades: [...dia.actividades, actividad] };
    });

    return getProvider().patch(COLLECTION, planId, { dias: nuevosDias });
  }

  /**
   * Eliminar actividad de un día.
   * @param {string} planId
   * @param {number} diaIndex
   * @param {number} actividadIndex
   * @param {Array} diasActuales
   */
  async removeActividad(planId, diaIndex, actividadIndex, diasActuales) {
    const nuevosDias = diasActuales.map((dia, i) => {
      if (i !== diaIndex) return dia;
      return {
        ...dia,
        actividades: dia.actividades.filter((_, ai) => ai !== actividadIndex),
      };
    });

    return getProvider().patch(COLLECTION, planId, { dias: nuevosDias });
  }

  // =========================================
  // INTERNOS
  // =========================================

  async _findDuplicado(escuadraId, fechaInicio) {
    const resultados = await getProvider().fetchCollection(
      COLLECTION,
      { escuadra_id: escuadraId, fecha_inicio: fechaInicio },
      { includeInactive: true },
    );
    return resultados[0] ?? null;
  }
}

export const PlanningRepository = new PlanningRepositoryClass();
