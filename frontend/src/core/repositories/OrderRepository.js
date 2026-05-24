// src/core/repositories/OrderRepository.js
//
// Repository de órdenes de ejecución (ORECPO).
// Tabla SQL: orders + order_actions
//
// MIGRADO de Firebase → Mayo 2026
// - Colección "ordenes" → tabla "orders"
// - Acciones: array Firestore → tabla "order_actions" relacional
// - Campos: delegacion_id → delegation_id, region_id eliminado (vía JOIN)
// - Estado calculado dinámicamente por fecha (no guardado en BD)

import { BaseRepository }  from "./BaseRepository";
import { getProvider }     from "../providers/providerRegistry";
import { supabase }        from "../providers/supabase/SupabaseProvider";

const COLLECTION = "orders";

// =========================================
// HELPERS
// =========================================

/**
 * Calcular estado operativo de una orden según fechas.
 * programada → fecha actual < fecha_inicio
 * vigente    → fecha_inicio ≤ fecha actual ≤ fecha_fin
 * vencida    → fecha actual > fecha_fin
 */
export function calcularEstadoOrden(fechaInicio, fechaFin) {
  const hoy    = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicio = new Date(fechaInicio);
  const fin    = new Date(fechaFin);
  if (hoy < inicio) return "programada";
  if (hoy > fin)    return "vencida";
  return "vigente";
}

// =========================================
// REPOSITORY
// =========================================

class OrderRepositoryClass extends BaseRepository {

  // ──────────────────────────────────────
  // LECTURA
  // ──────────────────────────────────────

  async getAll(filters = {}, options = {}) {
    const raw = await getProvider().fetchCollection(
      COLLECTION,
      this._cleanFilters(filters),
      {
        orderByField:    options.orderByField ?? "fecha_inicio",
        orderByDir:      options.orderByDir   ?? "desc",
        includeInactive: true,
      },
    );
    return raw.map((o) => ({
      ...o,
      estado_calculado: calcularEstadoOrden(o.fecha_inicio, o.fecha_fin),
    }));
  }

  async getById(id) {
    const raw = await getProvider().fetchById(COLLECTION, id);
    if (!raw) return null;
    return {
      ...raw,
      estado_calculado: calcularEstadoOrden(raw.fecha_inicio, raw.fecha_fin),
    };
  }

  /** Órdenes vigentes de una delegación → para CrearPlanificacion */
  async getVigentesByDelegacion(delegationId) {
    const todas = await this.getAll({ delegation_id: delegationId });
    return todas.filter((o) => o.estado_calculado === "vigente");
  }

  /** Órdenes vigentes y programadas → insumo para planificación */
  async getActivasYProgramadasByDelegacion(delegationId) {
    const todas = await this.getAll({ delegation_id: delegationId });
    return todas.filter((o) =>
      o.estado_calculado === "vigente" || o.estado_calculado === "programada"
    );
  }

  // ──────────────────────────────────────
  // ESCRITURA
  // ──────────────────────────────────────

  async create(data) {
    // Validar consecutivo único en delegación
    const existente = await this._findByConsecutivo(
      data.consecutivo,
      data.delegation_id,
    );
    if (existente) {
      throw new Error(
        `Ya existe una orden con el consecutivo "${data.consecutivo}" en esta delegación`,
      );
    }
    return getProvider().insert(COLLECTION, data);
  }

  async update(id, data) {
    return getProvider().patch(COLLECTION, id, data);
  }

  // ──────────────────────────────────────
  // ACCIONES → tabla order_actions relacional
  // ──────────────────────────────────────

  /** Obtener acciones de una orden ordenadas por posición */
  async getAcciones(ordenId) {
    const { data, error } = await supabase
      .from("order_actions")
      .select("*")
      .eq("order_id", ordenId)
      .order("posicion", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Agregar acción a una orden */
  async addAccion(ordenId, accion) {
    const acciones = await this.getAcciones(ordenId);
    const posicion = acciones.length + 1;
    const { error } = await supabase
      .from("order_actions")
      .insert({
        order_id: ordenId,
        nombre:   accion.nombre.trim().toUpperCase(),
        detalle:  accion.detalle?.trim() ?? null,
        posicion,
        creado:   new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
  }

  /** Actualizar nombre y detalle de una acción */
  async updateAccion(accionId, datos) {
    const { error } = await supabase
      .from("order_actions")
      .update({
        nombre:  datos.nombre.trim().toUpperCase(),
        detalle: datos.detalle?.trim() ?? null,
      })
      .eq("id", accionId);
    if (error) throw new Error(error.message);
  }

  /** Eliminar una acción */
  async removeAccion(accionId) {
    const { error } = await supabase
      .from("order_actions")
      .delete()
      .eq("id", accionId);
    if (error) throw new Error(error.message);
  }

  // ──────────────────────────────────────
  // INTERNOS
  // ──────────────────────────────────────

  async _findByConsecutivo(consecutivo, delegationId) {
    const resultados = await getProvider().fetchCollection(
      COLLECTION,
      { consecutivo, delegation_id: delegationId },
      { includeInactive: true },
    );
    return resultados[0] ?? null;
  }
}

export const OrderRepository = new OrderRepositoryClass();
