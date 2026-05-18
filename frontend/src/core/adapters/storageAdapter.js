// src/core/adapters/storageAdapter.js
//
// Adaptador de storage y generación de archivos.
//
// PROBLEMA que resuelve:
// Hoy los PDFs y Excel se generan directamente en el cliente
// (jsPDF, xlsx, file-saver) dentro de componentes como
// VerHojaServicio.jsx y VerPlanificacion.jsx.
//
// Esto es correcto HOY (no hay Firebase Storage en uso).
// Mañana puede cambiar a:
//   - Supabase Storage (subir PDF generado)
//   - Edge Function que genera el PDF en servidor
//   - S3/MinIO en infraestructura propia
//
// Este adapter centraliza la decisión de "cómo se guarda/descarga un archivo"
// sin que los componentes sepan si es cliente o servidor.

// =========================================
// DOWNLOAD LOCAL (estrategia actual)
// =========================================

/**
 * Descargar un Blob como archivo en el navegador.
 * Funciona sin Firebase Storage — todo en cliente.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Descargar un ArrayBuffer como archivo.
 * Usado por xlsx (SheetJS).
 * @param {ArrayBuffer} buffer
 * @param {string} filename
 * @param {string} mimeType
 */
export function downloadBuffer(buffer, filename, mimeType = "application/octet-stream") {
  const blob = new Blob([buffer], { type: mimeType });
  downloadBlob(blob, filename);
}

// =========================================
// NAMING CONVENTIONS (institucional)
// =========================================

/**
 * Generar nombre de archivo para hojas de servicio.
 * Centralizar el formato evita inconsistencias entre componentes.
 * @param {{ numero_hoja?: string, fecha?: string }} hoja
 * @returns {string}
 */
export function getServiceSheetFilename(hoja) {
  const numero = (hoja.numero_hoja ?? hoja.fecha ?? "sin-numero")
    .replace(/[^a-zA-Z0-9\-_]/g, "_");
  return `Hoja_Servicio_${numero}.pdf`;
}

/**
 * Generar nombre de archivo para planificaciones.
 * @param {{ escuadra_nombre?: string, fecha_inicio?: string }} plan
 * @returns {string}
 */
export function getPlanningFilename(plan) {
  const escuadra = (plan.escuadra_nombre ?? "SIN_ESCUADRA")
    .replace(/\s+/g, "_")
    .toUpperCase();
  const fecha = plan.fecha_inicio ?? "sin-fecha";
  return `PLANIFICACION_${escuadra}_${fecha}.xlsx`;
}

// =========================================
// MIME TYPES
// =========================================

export const MIME_TYPES = {
  PDF: "application/pdf",
  EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  CSV: "text/csv",
  JSON: "application/json",
};

// =========================================
// FUTURO — Supabase Storage (placeholder)
// =========================================

/**
 * Subir archivo a storage remoto.
 * HOY: no implementado (solo descarga local).
 * FUTURO: supabase.storage.from('documents').upload(path, file)
 *
 * @param {Blob} blob
 * @param {string} path - Ruta en el bucket (ej: "hojas/2026/HS-001.pdf")
 * @returns {Promise<string>} URL pública del archivo
 */
export async function uploadFile(blob, path) {
  // TODO: implementar cuando tengamos Supabase Storage
  throw new Error(
    "uploadFile() no implementado. Usa downloadBlob() para descarga local.",
  );
}

/**
 * Obtener URL de un archivo remoto.
 * HOY: no implementado.
 * FUTURO: supabase.storage.from('documents').getPublicUrl(path)
 *
 * @param {string} path
 * @returns {Promise<string>}
 */
export async function getFileUrl(path) {
  // TODO: implementar cuando tengamos Supabase Storage
  throw new Error("getFileUrl() no implementado.");
}
