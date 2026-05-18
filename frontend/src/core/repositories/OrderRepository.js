// src/core/repositories/OrderRepository.js
//
// Repository de órdenes de ejecución.
// Reemplaza el acceso directo a Firestore en:
//   - CrearOrden.jsx
//   - ListaOrdenes.jsx
//   - DetalleOrden.jsx

import { BaseRepository } from "./BaseRepository";
import { getProvider } from "../providers/providerRegistry";

const COLLECTION = "ordenes";

// =========================================
// HELPERS
// =========================================

/**
 * Calcular estado de una orden según fechas.
 * Lógica extraída de ListaOrdenes.jsx.
 */
function calcularEstado(fechaInicio, fechaFin) {
  const hoy = new Date();
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  if (hoy < inicio) return "programada";
  if (hoy > fin) return "finalizada";
  return "activa";
}

// =========================================
// REPOSITORY
// =========================================

class OrderRepositoryClass extends BaseRepository {
  // =========================================
  // LECTURA
  // =========================================

  /**
   * Obtener órdenes filtradas por territorio.
   * @param {object} filters - { region_id, delegacion_id, estado }
   * @param {object} options
   */
  async getAll(filters = {}, options = {}) {
    const raw = await getProvider().fetchCollection(
      COLLECTION,
      this._cleanFilters(filters),
      {
        orderByField: options.orderByField ?? "fecha_inicio",
        orderByDir: options.orderByDir ?? "desc",
        includeInactive: true, // Órdenes no tienen campo estado activo/inactivo
      },
    );

    // Calcular estado dinámico
    return raw.map((orden) => ({
      ...orden,
      estado: calcularEstado(orden.fecha_inicio, orden.fecha_fin),
    }));
  }

  /**
   * Obtener orden por ID.
   * @param {string} id
   */
  async getById(id) {
    const raw = await getProvider().fetchById(COLLECTION, id);
    if (!raw) return null;
    return {
      ...raw,
      estado: calcularEstado(raw.fecha_inicio, raw.fecha_fin),
    };
  }

  /**
   * Obtener órdenes activas de un territorio en un período.
   * Usado en CrearPlanificacion y VerPlanificacion.
   * @param {object} territory - { region_id, delegacion_id }
   * @param {{ inicio: string, fin: string }} periodo
   */
  async getActivasByTerritoryAndPeriodo(territory, periodo) {
    const todas = await this.getAll({
      region_id: territory.region_id,
      delegacion_id: territory.delegacion_id,
    });

    return todas.filter((orden) => {
      const dentroPeriodo =
        orden.fecha_fin >= periodo.inicio &&
        orden.fecha_inicio <= periodo.fin;
      return dentroPeriodo && orden.estado === "activa";
    });
  }

  // =========================================
  // ESCRITURA
  // =========================================

  /**
   * Crear nueva orden.
   * @param {object} data
   * @returns {Promise<string>} ID
   */
  async create(data) {
    // Validar consecutivo único en delegación antes de crear
    const existente = await this._findByConsecutivo(
      data.consecutivo,
      data.region_id,
      data.delegacion_id,
    );

    if (existente) {
      throw new Error(
        `Ya existe una orden con el consecutivo "${data.consecutivo}" en esta delegación`,
      );
    }

    return getProvider().insert(COLLECTION, data);
  }

  /**
   * Actualizar orden.
   * @param {string} id
   * @param {object} data
   */
  async update(id, data) {
    return getProvider().patch(COLLECTION, id, data);
  }

  // =========================================
  // ACCIONES (arrays anidados — futuro SQL)
  // =========================================

  /**
   * Agregar acción a una orden.
   * Nota: en Firestore esto actualiza el array.
   * En PostgreSQL será un INSERT en order_actions.
   * @param {string} ordenId
   * @param {object} accion - { id, nombre }
   * @param {Array} accionesActuales - Estado actual del array
   */
  async addAccion(ordenId, accion, accionesActuales = []) {
    const nuevasAcciones = [...accionesActuales, accion];
    return getProvider().patch(COLLECTION, ordenId, {
      acciones: nuevasAcciones,
    });
  }

  /**
   * Actualizar una acción existente.
   * @param {string} ordenId
   * @param {string} accionId
   * @param {string} nuevoNombre
   * @param {Array} accionesActuales
   */
  async updateAccion(ordenId, accionId, nuevoNombre, accionesActuales = []) {
    const nuevasAcciones = accionesActuales.map((a) =>
      a.id === accionId ? { ...a, nombre: nuevoNombre } : a,
    );
    return getProvider().patch(COLLECTION, ordenId, {
      acciones: nuevasAcciones,
    });
  }

  /**
   * Eliminar una acción.
   * @param {string} ordenId
   * @param {string} accionId
   * @param {Array} accionesActuales
   */
  async removeAccion(ordenId, accionId, accionesActuales = []) {
    const nuevasAcciones = accionesActuales.filter((a) => a.id !== accionId);
    return getProvider().patch(COLLECTION, ordenId, {
      acciones: nuevasAcciones,
    });
  }

  // =========================================
  // INTERNOS
  // =========================================

  async _findByConsecutivo(consecutivo, regionId, delegacionId) {
    const resultados = await getProvider().fetchCollection(
      COLLECTION,
      { consecutivo, region_id: regionId, delegacion_id: delegacionId },
      { includeInactive: true },
    );
    return resultados[0] ?? null;
  }
}

// =========================================
// SINGLETON
// =========================================

export const OrderRepository = new OrderRepositoryClass();
