// src/core/validators/usuarioValidator.js
//
// Validaciones de dominio para usuarios.
// Extraído de: CrearUsuario.jsx, GestionUsuarios.jsx
// Los componentes llaman estas funciones — no contienen lógica de validación propia.
import { validateRangeInTurno } from "../../utils/timeUtils";

/**
 * Resultado de validación estándar.
 * @typedef {{ valid: boolean, errors: string[] }} ValidationResult
 */

/**
 * Validar datos para crear un usuario nuevo.
 * @param {object} data
 * @param {object[]} usuariosExistentes - Para detectar duplicados
 * @returns {ValidationResult}
 */
export function validateCrearUsuario(data, usuariosExistentes = []) {
  const errors = [];

  // Campos obligatorios
  if (!data.email?.trim()) errors.push("El email es obligatorio");
  if (!data.password) errors.push("La contraseña es obligatoria");
  if (!data.nombre?.trim()) errors.push("El nombre es obligatorio");
  if (!data.apellido1?.trim()) errors.push("El primer apellido es obligatorio");
  if (!data.cedula?.trim()) errors.push("La cédula es obligatoria");
  if (!data.rangoId) errors.push("Seleccione un rango");
  if (!data.condicionId) errors.push("Seleccione una condición");

  // Formato email
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.push("Formato de email inválido");
  }

  // Duplicados
  if (data.cedula) {
    const cedulaExiste = usuariosExistentes.find(
      (u) => u.cedula === data.cedula.trim(),
    );
    if (cedulaExiste) errors.push("La cédula ya está registrada");
  }

  if (data.email) {
    const emailExiste = usuariosExistentes.find(
      (u) => u.email === data.email.trim(),
    );
    if (emailExiste) errors.push("El email ya está registrado");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validar datos para editar un usuario existente.
 * @param {object} data
 * @returns {ValidationResult}
 */
export function validateEditarUsuario(data) {
  const errors = [];

  if (!data.nombre?.trim()) errors.push("El nombre es obligatorio");
  if (!data.apellido1?.trim()) errors.push("El primer apellido es obligatorio");
  if (!data.cedula?.trim()) errors.push("La cédula es obligatoria");
  if (!data.rol) errors.push("Seleccione un rol");

  return { valid: errors.length === 0, errors };
}


// =============================================================================
// src/core/validators/territorialValidator.js
// Validaciones para entidades territoriales.
// =============================================================================

/**
 * Validar región.
 * @param {object} data - { nombre, codigo }
 * @param {object[]} existentes
 * @param {string|null} editandoId
 * @returns {ValidationResult}
 */
export function validateRegion(data, existentes = [], editandoId = null) {
  const errors = [];
  const nombre = data.nombre?.trim().toUpperCase();
  const codigo = data.codigo?.trim().toUpperCase();

  if (!nombre) errors.push("El nombre de la región es obligatorio");
  if (!codigo) errors.push("El código es obligatorio");

  if (nombre) {
    const duplicado = existentes.find(
      (r) => r.nombre === nombre && r.id !== editandoId,
    );
    if (duplicado) errors.push("Ya existe una región con ese nombre");
  }

  if (codigo) {
    const duplicadoCod = existentes.find(
      (r) => r.codigo === codigo && r.id !== editandoId,
    );
    if (duplicadoCod) errors.push("Ya existe una región con ese código");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validar delegación.
 */
export function validateDelegacion(data, existentes = [], editandoId = null) {
  const errors = [];
  const nombre = data.nombre?.trim().toUpperCase();
  const codigo = data.codigo?.trim().toUpperCase();

  if (!data.region_id) errors.push("Seleccione una región");
  if (!nombre) errors.push("El nombre es obligatorio");
  if (!codigo) errors.push("El código es obligatorio");

  if (nombre && data.region_id) {
    const dup = existentes.find(
      (d) => d.nombre === nombre && d.region_id === data.region_id && d.id !== editandoId,
    );
    if (dup) errors.push("Ya existe una delegación con ese nombre en esa región");
  }

  if (codigo) {
    const dupCod = existentes.find(
      (d) => d.codigo === codigo && d.id !== editandoId,
    );
    if (dupCod) errors.push("Ese código ya existe");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validar escuadra.
 */
export function validateEscuadra(data, existentes = [], editandoId = null) {
  const errors = [];

  if (!data.region_id) errors.push("Seleccione una región");
  if (!data.delegacion_id) errors.push("Seleccione una delegación");
  if (!data.nombre?.trim()) errors.push("El nombre es obligatorio");
  if (!data.codigo?.trim()) errors.push("El código es obligatorio");

  const nombre = data.nombre?.trim().toUpperCase();
  const codigo = data.codigo?.trim().toUpperCase();

  if (codigo) {
    const dupCod = existentes.find(
      (e) => e.codigo === codigo && e.id !== editandoId,
    );
    if (dupCod) errors.push("Ese código ya existe");
  }

  if (nombre && data.delegacion_id) {
    const dup = existentes.find(
      (e) =>
        e.nombre === nombre &&
        e.delegacion_id === data.delegacion_id &&
        e.id !== editandoId,
    );
    if (dup) errors.push("Ya existe una escuadra con ese nombre en esa delegación");
  }

  return { valid: errors.length === 0, errors };
}


// =============================================================================
// src/core/validators/operativoValidator.js
// Validaciones para entidades operativas.
// =============================================================================

/**
 * Validar orden de ejecución.
 */
export function validateOrden(data, existentes = [], editandoId = null) {
  const errors = [];

  if (!data.consecutivo?.trim()) errors.push("El consecutivo es obligatorio");
  if (!data.nombre?.trim()) errors.push("El nombre es obligatorio");
  if (!data.fechaInicio) errors.push("La fecha de inicio es obligatoria");
  if (!data.fechaFin) errors.push("La fecha de fin es obligatoria");
  if (!data.region_id || !data.delegacion_id)
    errors.push("Territorio no configurado para este usuario");

  if (data.fechaInicio && data.fechaFin && data.fechaFin < data.fechaInicio) {
    errors.push("La fecha final no puede ser menor a la inicial");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validar hoja de servicio.
 */
export function validateHojaServicio(data) {
  const errors = [];

  if (!data.planSeleccionado) errors.push("Seleccione una planificación");
  if (data.diaSeleccionado === null) errors.push("Seleccione un día");
  if (!data.actividadesSeleccionadas?.length) errors.push("Seleccione al menos una actividad");
  if (!data.recursosSeleccionados?.length) errors.push("Seleccione al menos un recurso");
  if (!data.horaInicio) errors.push("Defina la hora de inicio");
  if (!data.horaFin) errors.push("Defina la hora de fin");
  if (data.horaInicio && data.horaFin) {
    const turno = data.turnoOperativo || "00:00-23:59";
    const rango = validateRangeInTurno(data.horaInicio, data.horaFin, turno);
    if (!rango.valid) {
      errors.push("Rango horario inválido para el turno operativo");
    }
  }
  if (!data.numeroHoja?.trim()) errors.push("El número de hoja es obligatorio");
  if (!data.turnoOperativo?.trim()) errors.push("El turno operativo es obligatorio");
  if (!data.mision?.trim()) errors.push("La misión es obligatoria");
  if (!data.entregadoA) errors.push("Seleccione el agente encargado");

  return { valid: errors.length === 0, errors };
}

/**
 * Validar actividad de planificación.
 */
export function validateActividad(form) {
  const errors = [];

  if (!form.orden_id) errors.push("Seleccione una orden");
  if (!form.accion_id) errors.push("Seleccione una acción");
  if (!form.hora_inicio) errors.push("Defina la hora de inicio");
  if (!form.hora_fin) errors.push("Defina la hora de fin");
  if (form.hora_inicio && form.hora_fin) {
    const turno = form.turno || "00:00-23:59";
    const rango = validateRangeInTurno(form.hora_inicio, form.hora_fin, turno);
    if (!rango.valid) {
      errors.push("La actividad tiene un rango horario inválido para el turno");
    }
  }
  if (!form.sector?.trim()) errors.push("El sector es obligatorio");
  if (!form.detalle?.trim()) errors.push("El detalle es obligatorio");

  return { valid: errors.length === 0, errors };
}
