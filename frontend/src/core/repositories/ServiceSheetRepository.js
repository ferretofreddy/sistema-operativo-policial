// src/core/repositories/ServiceSheetRepository.js
// MIGRADO — Fase 6A.1 — Mayo 2026
//
// Tabla SQL: service_sheets + sheet_activities
// Snapshots completos desde Fase 6A.1:
//   - accion_nombre_snapshot
//   - accion_detalle_snapshot
//   - orden_consecutivo_snapshot
//   - orden_nombre_snapshot

import { BaseRepository } from "./BaseRepository";
import { getProvider }    from "../providers/providerRegistry";
import { supabase }       from "../providers/supabase/SupabaseProvider";

const COLLECTION = "service_sheets";

class ServiceSheetRepositoryClass extends BaseRepository {

  // ── LECTURA ──────────────────────────────────────────────
  async getAll(filters = {}, options = {}) {
    return getProvider().fetchCollection(
      COLLECTION,
      this._cleanFilters(filters),
      {
        orderByField:    options.orderByField ?? "creado",
        orderByDir:      options.orderByDir   ?? "desc",
        includeInactive: true,
      },
    );
  }

  async getById(id) {
    return getProvider().fetchById(COLLECTION, id);
  }

  /**
   * Hojas de una fecha específica para una delegación.
   * Si squadId se provee, filtra por escuadra (para supervisor).
   */
  async getByFecha(delegationId, fecha, squadId = null) {
    const todas = await this.getAll({
      delegation_id: delegationId,
      ...(squadId ? { squad_id: squadId } : {}),
    });
    return todas.filter(h => h.fecha === fecha);
  }

  /**
   * Hojas activas (pendientes) de una escuadra — para el agente.
   */
  async getPendientesByEscuadra(squadId) {
    const todas = await this.getAll({ squad_id: squadId });
    return todas.filter(h => h.estado_operativo === "pendiente");
  }

  // ── ACTIVIDADES — tabla sheet_activities ─────────────────

  /**
   * Obtener actividades de una hoja ordenadas por posición.
   * Desde Fase 6A.1 incluye columnas de snapshot.
   */
  async getActividades(sheetId) {
    const { data, error } = await supabase
      .from("sheet_activities")
      .select(`
        id,
        service_sheet_id,
        order_id,
        order_action_id,
        planning_activity_id,
        hora_inicio,
        hora_fin,
        sector,
        sector_dinamico,
        posicion,
        accion_nombre_snapshot,
        accion_detalle_snapshot,
        orden_consecutivo_snapshot,
        orden_nombre_snapshot
      `)
      .eq("service_sheet_id", sheetId)
      .order("posicion", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /**
   * Agregar actividad a una hoja.
   * Requiere snapshots desde Fase 6A.1.
   *
   * @param {string} sheetId
   * @param {Object} actividad
   * @param {string} actividad.order_id
   * @param {string} actividad.order_action_id
   * @param {string} actividad.hora_inicio
   * @param {string} actividad.hora_fin
   * @param {string} actividad.sector
   * @param {string} actividad.sector_dinamico
   * @param {number} actividad.posicion
   * @param {string} actividad.accion_nombre      → accion_nombre_snapshot
   * @param {string} actividad.accion_detalle     → accion_detalle_snapshot
   * @param {string} actividad.orden_consecutivo  → orden_consecutivo_snapshot
   * @param {string} actividad.orden_nombre       → orden_nombre_snapshot
   */
  async addActividad(sheetId, actividad) {
    const { error } = await supabase
      .from("sheet_activities")
      .insert({
        service_sheet_id:            sheetId,
        order_id:                    actividad.order_id           ?? null,
        order_action_id:             actividad.order_action_id    ?? null,
        hora_inicio:                 actividad.hora_inicio        ?? null,
        hora_fin:                    actividad.hora_fin           ?? null,
        sector:                      actividad.sector             ?? "",
        sector_dinamico:             actividad.sector_dinamico    ?? "",
        posicion:                    actividad.posicion,
        // Snapshots inmutables — Fase 6A.1
        accion_nombre_snapshot:      actividad.accion_nombre      ?? "",
        accion_detalle_snapshot:     actividad.accion_detalle     ?? "",
        orden_consecutivo_snapshot:  actividad.orden_consecutivo  ?? "",
        orden_nombre_snapshot:       actividad.orden_nombre       ?? "",
      });
    if (error) throw new Error(error.message);
  }

  /** Eliminar una actividad de la hoja */
  async removeActividad(actividadId) {
    const { error } = await supabase
      .from("sheet_activities")
      .delete()
      .eq("id", actividadId);
    if (error) throw new Error(error.message);
  }

  // ── ESCRITURA ────────────────────────────────────────────

  async create(data) {
    return getProvider().insert(COLLECTION, data);
  }

  async update(id, data) {
    return getProvider().patch(COLLECTION, id, data);
  }

  /** Cerrar hoja — cambia estado_operativo a "cerrada" */
  async cerrar(id) {
    return getProvider().patch(COLLECTION, id, {
      estado_operativo: "cerrada",
      actualizado:      new Date().toISOString(),
    });
  }

  async softDelete(id) {
    return getProvider().patch(COLLECTION, id, { estado: "inactivo" });
  }
}

export const ServiceSheetRepository = new ServiceSheetRepositoryClass();
