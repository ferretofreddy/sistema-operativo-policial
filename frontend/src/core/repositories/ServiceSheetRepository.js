// src/core/repositories/ServiceSheetRepository.js
//
// Repository de hojas de servicio.
// MIGRADO de Firebase — Mayo 2026
//
// Tabla SQL: service_sheets + sheet_activities
// Snapshots históricos en JSONB — nunca reconstruir desde tablas vivas.
//
// CAMBIOS vs versión Firebase:
//   - Colección "hojas_servicio" → tabla "service_sheets"
//   - delegacion_id → delegation_id, escuadra_id → squad_id
//   - Nuevos métodos: getByFecha, getActividades, addActividad
//   - Los datos de personal/recursos vienen de snapshots JSONB

import { BaseRepository } from "./BaseRepository";
import { getProvider }    from "../providers/providerRegistry";
import { supabase }       from "../providers/supabase/SupabaseProvider";

const COLLECTION = "service_sheets";

class ServiceSheetRepositoryClass extends BaseRepository {

  // ──────────────────────────────────────
  // LECTURA
  // ──────────────────────────────────────

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

  // ──────────────────────────────────────
  // ACTIVIDADES — tabla sheet_activities
  // ──────────────────────────────────────

  /** Obtener actividades de una hoja ordenadas por posición */
  async getActividades(sheetId) {
    const { data, error } = await supabase
      .from("sheet_activities")
      .select("*")
      .eq("service_sheet_id", sheetId)
      .order("posicion", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Agregar actividad a una hoja */
  async addActividad(sheetId, actividad) {
    const acts     = await this.getActividades(sheetId);
    const posicion = acts.length + 1;

    const { error } = await supabase
      .from("sheet_activities")
      .insert({
        service_sheet_id:  sheetId,
        order_id:          actividad.order_id          ?? null,
        order_action_id:   actividad.order_action_id   ?? null,
        hora_inicio:       actividad.hora_inicio        ?? null,
        hora_fin:          actividad.hora_fin           ?? null,
        sector:            actividad.sector             ?? null,
        posicion,
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

  // ──────────────────────────────────────
  // ESCRITURA
  // ──────────────────────────────────────

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
