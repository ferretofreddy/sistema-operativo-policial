// src/core/repositories/PlanningRepository.js
//
// Repository de planificaciones operativas.
// MIGRADO de Firebase — Mayo 2026
//
// Modelo relacional:
//   planning → planning_days → planning_activities
//
// CAMBIOS vs versión Firebase:
//   - Colección "planificaciones" → tabla "planning"
//   - dias[] array JSON → tabla planning_days
//   - actividades[] array JSON → tabla planning_activities
//   - Campos: delegacion_id → delegation_id, escuadra_id → squad_id
//   - supervisor_uid → supervisor_id

import { BaseRepository } from "./BaseRepository";
import { getProvider } from "../providers/providerRegistry";
import { supabase } from "../providers/supabase/SupabaseProvider";

const COLLECTION = "planning";

class PlanningRepositoryClass extends BaseRepository {

  // ──────────────────────────────────────
  // LECTURA
  // ──────────────────────────────────────

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

  /** Planificaciones activas (fecha_fin >= hoy) de una delegación */
  async getActivasByDelegacion(delegationId) {
    const todas = await this.getAll({ delegation_id: delegationId });
    const hoy = new Date().toISOString().split("T")[0];
    return todas.filter((p) => p.fecha_fin >= hoy);
  }

  /** Planificaciones activas de una escuadra — para CrearHojaServicio */
  async getActivasByEscuadra(squadId) {
    const todas = await this.getAll({ squad_id: squadId });
    const hoy = new Date().toISOString().split("T")[0];
    return todas.filter((p) => p.fecha_fin >= hoy);
  }

  // ──────────────────────────────────────
  // DÍAS — tabla planning_days
  // ──────────────────────────────────────

  /** Obtener días de una planificación ordenados */
  async getDias(planningId) {
    const { data, error } = await supabase
      .from("planning_days")
      .select("*")
      .eq("planning_id", planningId)
      .order("dia_numero", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Agregar un día a la planificación */
  async addDia(planningId, dia) {
    // Calcular número de día siguiente
    const dias = await this.getDias(planningId);
    const numero = dias.length + 1;

    const { data, error } = await supabase
      .from("planning_days")
      .insert({
        planning_id: planningId,
        fecha: dia.fecha,
        turno: dia.turno,
        dia_numero: numero,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id;
  }

  /** Eliminar un día y sus actividades */
  async removeDia(diaId) {
    // Eliminar actividades del día primero
    await supabase
      .from("planning_activities")
      .delete()
      .eq("planning_day_id", diaId);

    const { error } = await supabase
      .from("planning_days")
      .delete()
      .eq("id", diaId);
    if (error) throw new Error(error.message);
  }

  // ──────────────────────────────────────
  // ACTIVIDADES — tabla planning_activities
  // ──────────────────────────────────────

  /** Obtener actividades de un día ordenadas por posición */
  async getActividades(planningDayId) {
    const { data, error } = await supabase
      .from("planning_activities")
      .select("*")
      .eq("planning_day_id", planningDayId)
      .order("posicion", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Agregar actividad a un día */
  async addActividad(planningDayId, actividad) {
    const acts = await this.getActividades(planningDayId);
    const posicion = acts.length + 1;

    const { error } = await supabase
      .from("planning_activities")
      .insert({
        planning_day_id: planningDayId,
        order_id: actividad.order_id,
        order_action_id: actividad.order_action_id,
        hora_inicio: actividad.hora_inicio || null,
        hora_fin: actividad.hora_fin || null,
        sector: actividad.sector || null,
        detalle: actividad.detalle || null,
        turno: actividad.turno || null,
        sector_dinamico: actividad.sector_dinamico || null,
        posicion,
      });
    if (error) throw new Error(error.message);
  }

  /** Eliminar una actividad */
  async removeActividad(actividadId) {
    const { error } = await supabase
      .from("planning_activities")
      .delete()
      .eq("id", actividadId);
    if (error) throw new Error(error.message);
  }

  // ──────────────────────────────────────
  // ESCRITURA
  // ──────────────────────────────────────

  async create(data) {
    // Validar duplicado: misma escuadra + fecha_inicio
    const existente = await this._findDuplicado(data.squad_id, data.fecha_inicio);
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

  // ──────────────────────────────────────
  // INTERNOS
  // ──────────────────────────────────────

  async _findDuplicado(squadId, fechaInicio) {
    const resultados = await getProvider().fetchCollection(
      COLLECTION,
      { squad_id: squadId, fecha_inicio: fechaInicio },
      { includeInactive: true },
    );
    return resultados[0] ?? null;
  }
}

export const PlanningRepository = new PlanningRepositoryClass();
