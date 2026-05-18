// src/core/providers/BaseProvider.js
//
// Contrato de acceso a datos puro.
// FirebaseProvider implementa esto con Firestore SDK.
// SupabaseProvider implementa esto con Supabase JS SDK.
// Los repositories no saben cuál están usando.

export class BaseProvider {
  // =========================================
  // LECTURA
  // =========================================

  /**
   * Obtener colección/tabla con filtros y opciones.
   * @param {string} collection - Nombre de colección o tabla
   * @param {object} filters - Campos exactos { field: value }
   * @param {object} options
   * @param {string} options.orderByField
   * @param {'asc'|'desc'} options.orderByDir
   * @param {number|null} options.limitToFirst
   * @param {boolean} options.includeInactive
   * @returns {Promise<Array<{id: string, ...rest}>>}
   */
  async fetchCollection(collection, filters = {}, options = {}) {
    throw new Error(`${this.constructor.name}.fetchCollection() no implementado`);
  }

  /**
   * Obtener documento/registro por ID.
   * @param {string} collection
   * @param {string} id
   * @returns {Promise<{id: string, ...rest}|null>}
   */
  async fetchById(collection, id) {
    throw new Error(`${this.constructor.name}.fetchById() no implementado`);
  }

  // =========================================
  // ESCRITURA
  // =========================================

  /**
   * Crear documento/registro nuevo.
   * @param {string} collection
   * @param {object} data
   * @returns {Promise<string>} ID generado
   */
  async insert(collection, data) {
    throw new Error(`${this.constructor.name}.insert() no implementado`);
  }

  /**
   * Actualizar campos parciales de un documento/registro.
   * @param {string} collection
   * @param {string} id
   * @param {object} data
   * @returns {Promise<void>}
   */
  async patch(collection, id, data) {
    throw new Error(`${this.constructor.name}.patch() no implementado`);
  }

  /**
   * Reemplazar documento/registro completo.
   * @param {string} collection
   * @param {string} id
   * @param {object} data
   * @returns {Promise<void>}
   */
  async replace(collection, id, data) {
    throw new Error(`${this.constructor.name}.replace() no implementado`);
  }

  /**
   * Eliminar físicamente (solo para datos no críticos).
   * Para datos institucionales usar softDelete en el repository.
   * @param {string} collection
   * @param {string} id
   * @returns {Promise<void>}
   */
  async remove(collection, id) {
    throw new Error(`${this.constructor.name}.remove() no implementado`);
  }

  // =========================================
  // TIMESTAMPS
  // =========================================

  /**
   * Obtener timestamp del provider actual.
   * Firebase usa Timestamp.now(), Supabase usa new Date().toISOString().
   * @returns {*}
   */
  now() {
    throw new Error(`${this.constructor.name}.now() no implementado`);
  }
}
