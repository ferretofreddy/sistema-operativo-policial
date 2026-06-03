// frontend/src/core/repositories/ShiftRepository.js
// V2.2B — Turnos operacionales por delegación cantonal
// Tabla: delegation_shifts

import { supabase } from "../providers/supabase/SupabaseProvider";

class ShiftRepositoryClass {

  async getByDelegacion(delegationId) {
    const { data, error } = await supabase
      .from("delegation_shifts")
      .select("*")
      .eq("delegation_id", delegationId)
      .eq("activo", true)
      .order("tipo")
      .order("hora_inicio");
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  // Obtener turnos de la cantonal padre (para distritales y supervisor)
  async getByCantonalPadre(delegationId) {
    const { data: deleg } = await supabase
      .from("delegations")
      .select("parent_delegation_id, delegation_type")
      .eq("id", delegationId)
      .single();

    const cantonalId = deleg?.delegation_type === "cantonal"
      ? delegationId
      : deleg?.parent_delegation_id;

    if (!cantonalId) return [];
    return this.getByDelegacion(cantonalId);
  }

  async getById(id) {
    const { data, error } = await supabase
      .from("delegation_shifts")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // Crear turno — valida unicidad de diurno/nocturno en aplicación
  async create(data) {
    const { data: result, error } = await supabase
      .from("delegation_shifts")
      .insert({
        delegation_id: data.delegation_id,
        nombre:        data.nombre.trim(),
        tipo:          data.tipo,
        hora_inicio:   data.hora_inicio,
        hora_fin:      data.hora_fin,
        activo:        true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return result.id;
  }

  async update(id, data) {
    const { error } = await supabase
      .from("delegation_shifts")
      .update({
        nombre:      data.nombre?.trim(),
        hora_inicio: data.hora_inicio,
        hora_fin:    data.hora_fin,
        activo:      data.activo,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async desactivar(id) {
    const { error } = await supabase
      .from("delegation_shifts")
      .update({ activo: false })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  // Retorna string "HH:MM-HH:MM" para uso en timeUtils
  formatTurnoString(shift) {
    if (!shift) return "";
    const hi = shift.hora_inicio?.substring(0, 5) ?? "00:00";
    const hf = shift.hora_fin?.substring(0, 5)    ?? "23:59";
    return `${hi}-${hf}`;
  }
}

export const ShiftRepository = new ShiftRepositoryClass();
