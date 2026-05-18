// src/core/adapters/dateAdapter.js
//
// Adaptador de fechas y timestamps.
//
// PROBLEMA que resuelve:
// Firebase usa Timestamp { seconds, nanoseconds }
// Supabase/PostgreSQL usa ISO strings "2026-05-18T10:00:00Z"
// El frontend necesita Date nativa o strings legibles
//
// Sin este adapter, cada componente tiene que saber qué tipo
// de timestamp está recibiendo — eso es acoplamiento invisible.
//
// REGLA: el frontend NUNCA recibe ni envía Timestamp de Firebase
// directamente. Todo pasa por este adapter.

// =========================================
// NORMALIZACIÓN — cualquier formato → Date nativa
// =========================================

/**
 * Convertir cualquier formato de fecha a Date nativa.
 * Acepta: Firebase Timestamp, ISO string, Date, null/undefined.
 * @param {*} value
 * @returns {Date|null}
 */
export function toDate(value) {
  if (!value) return null;

  // Firebase Timestamp { toDate() }
  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  // Ya es Date
  if (value instanceof Date) {
    return value;
  }

  // ISO string o timestamp numérico
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // Timestamp-like object con seconds (Firebase serializado)
  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  return null;
}

// =========================================
// FORMATEO — Date → string legible
// =========================================

/**
 * Formatear fecha para mostrar al usuario.
 * @param {*} value - Cualquier formato soportado por toDate()
 * @param {Intl.DateTimeFormatOptions} options
 * @returns {string}
 */
export function formatDate(value, options = {}) {
  const date = toDate(value);
  if (!date) return "—";

  const defaults = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };

  return date.toLocaleDateString("es-CR", { ...defaults, ...options });
}

/**
 * Formatear fecha y hora.
 * @param {*} value
 * @returns {string}
 */
export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return "—";

  return date.toLocaleString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatear solo la hora.
 * @param {*} value
 * @returns {string}
 */
export function formatTime(value) {
  const date = toDate(value);
  if (!date) return "—";

  return date.toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Convertir a string ISO YYYY-MM-DD (para inputs type="date").
 * @param {*} value
 * @returns {string}
 */
export function toInputDate(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

// =========================================
// CREACIÓN — string/Date → formato del provider
// =========================================

/**
 * Convertir string de input type="date" a timestamp del provider activo.
 * El provider sabe qué tipo retornar (Timestamp vs ISO string).
 * @param {string} dateString - "YYYY-MM-DD"
 * @returns {*} Timestamp del provider
 */
export function fromInputDate(dateString) {
  if (!dateString) return null;
  // Construir en UTC para evitar off-by-one por timezone
  const date = new Date(`${dateString}T00:00:00`);
  return date;
}

/**
 * Calcular si una fecha ya pasó.
 * @param {*} value
 * @returns {boolean}
 */
export function isPast(value) {
  const date = toDate(value);
  if (!date) return false;
  return date < new Date();
}

/**
 * Calcular si una fecha es hoy.
 * @param {*} value
 * @returns {boolean}
 */
export function isToday(value) {
  const date = toDate(value);
  if (!date) return false;
  const hoy = new Date().toISOString().split("T")[0];
  return date.toISOString().split("T")[0] === hoy;
}

/**
 * Obtener fecha de hoy como string YYYY-MM-DD.
 * @returns {string}
 */
export function todayString() {
  return new Date().toISOString().split("T")[0];
}
