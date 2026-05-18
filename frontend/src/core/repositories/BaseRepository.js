// src/core/repositories/BaseRepository.js
//
// Contrato base que todos los repositories deben implementar.
// Ningún componente React toca esto directamente.
// Los services llaman repositories.
// Los repositories delegan en providers.
//
// HOY: FirebaseProvider implementa esto.
// MAÑANA: SupabaseProvider implementa esto.
// React no cambia.

export class BaseRepository {
  // =========================================
  // LECTURA
  // =========================================

  /**
   * Obtener todos los documentos de una colección/tabla.
   * @param {object} filters - Filtros de campo/valor
   * @param {object} options - orderBy, limit, includeInactive
   * @returns {Promise<Array>}
   */
  async getAll(filters = {}, options = {}) {
    throw new Error(`${this.constructor.name}.getAll() no implementado`);
  }

  /**
   * Obtener un documento/registro por ID.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async getById(id) {
    throw new Error(`${this.constructor.name}.getById() no implementado`);
  }

  // =========================================
  // ESCRITURA
  // =========================================

  /**
   * Crear un nuevo documento/registro.
   * @param {object} data
   * @returns {Promise<string>} ID del documento creado
   */
  async create(data) {
    throw new Error(`${this.constructor.name}.create() no implementado`);
  }

  /**
   * Actualizar un documento/registro existente.
   * @param {string} id
   * @param {object} data - Campos a actualizar (merge parcial)
   * @returns {Promise<void>}
   */
  async update(id, data) {
    throw new Error(`${this.constructor.name}.update() no implementado`);
  }

  /**
   * Eliminar lógicamente (estado inactivo).
   * NO elimina físicamente — solo cambia estado.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async softDelete(id) {
    throw new Error(`${this.constructor.name}.softDelete() no implementado`);
  }

  // =========================================
  // HELPERS DE IMPLEMENTACIÓN
  // =========================================

  /**
   * Limpiar filtros vacíos antes de enviar al provider.
   * @param {object} filters
   * @returns {object}
   */
  _cleanFilters(filters = {}) {
    return Object.fromEntries(
      Object.entries(filters).filter(
        ([, value]) =>
          value !== undefined && value !== null && value !== "",
      ),
    );
  }
}
