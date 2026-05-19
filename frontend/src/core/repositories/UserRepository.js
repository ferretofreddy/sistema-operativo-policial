// src/core/repositories/UserRepository.js
//
// Repository de usuarios.
// Toda operación sobre la colección "usuarios" pasa por aquí.
// No conoce Firebase, Supabase ni ningún SDK — solo getProvider().
//
// Reemplaza gradualmente a: services/userService.js

import { BaseRepository } from "./BaseRepository";
import { getProvider } from "../providers/providerRegistry";

const COLLECTION = "usuarios";

// =========================================
// REPOSITORY
// =========================================

class UserRepositoryClass extends BaseRepository {
  // =========================================
  // LECTURA
  // =========================================

  /**
   * Obtener usuarios filtrados por territorio y rol.
   * @param {object} filters - { region_id, delegacion_id, rol, estado_usuario, ... }
   * @param {object} options - { includeInactive, orderByField, orderByDir }
   */
  async getAll(filters = {}, options = {}) {
    return getProvider().fetchCollection(COLLECTION, this._cleanFilters(filters), {
      orderByField: options.orderByField ?? "nombre",
      orderByDir: options.orderByDir ?? "asc",
      includeInactive: options.includeInactive ?? false,
    });
  }

  /**
   * Obtener usuario por ID interno de PostgreSQL (users.id).
   * En Firestore era equivalente al UID de Auth porque el docId = uid.
   * En Supabase/PostgreSQL son campos distintos — usar getByAuthId() para sesiones.
   * @param {string} id - UUID interno de PostgreSQL
   */
  async getById(id) {
    return getProvider().fetchById(COLLECTION, id);
  }

  /**
   * Obtener usuario por auth_id (UUID de Supabase Auth / Firebase UID).
   * Este es el método correcto para lookups de sesión en AuthContext.
   * @param {string} authId - UID de Supabase Auth
   */
  async getByAuthId(authId) {
    const results = await getProvider().fetchCollection(
      COLLECTION,
      { auth_id: authId },
      { includeInactive: true, limitToFirst: 1 },
    );
    return results[0] ?? null;
  }

  /**
   * Obtener usuarios de un territorio específico.
   * Abstracción semántica sobre getAll para claridad en los servicios.
   */
  async getByTerritory(territoryFilters = {}, options = {}) {
    return this.getAll(territoryFilters, options);
  }

  /**
   * Obtener supervisores activos de una delegación.
   * Usado en CrearHojaServicio para el selector de jefatura.
   */
  async getSupervisoresByDelegacion(regionId, delegacionId) {
    return this.getAll({
      region_id: regionId,
      delegacion_id: delegacionId,
      rol: "supervisor",
    });
  }

  /**
   * Obtener jefaturas activas de una delegación.
   */
  async getJefaturasByDelegacion(regionId, delegacionId) {
    return this.getAll({
      region_id: regionId,
      delegacion_id: delegacionId,
      rol: "jefatura",
    });
  }

  // =========================================
  // ESCRITURA
  // =========================================

  /**
   * Crear usuario en Firestore con UID de Firebase Auth.
   * @param {string} uid - Firebase Auth UID
   * @param {object} data - Datos del usuario
   */
  async create(uid, data) {
    return getProvider().insertWithId(COLLECTION, uid, {
      uid,
      ...data,
    });
  }

  /**
   * Actualizar campos parciales de un usuario.
   * @param {string} uid
   * @param {object} data
   */
  async update(uid, data) {
    return getProvider().patch(COLLECTION, uid, data);
  }

  /**
   * Soft delete — cambia estado_usuario a "inactivo".
   * @param {string} uid
   */
  async softDelete(uid) {
    return getProvider().patch(COLLECTION, uid, {
      estado_usuario: "inactivo",
    });
  }

  // =========================================
  // OPERACIONES DE DOMINIO
  // =========================================

  /**
   * Crear usuario si no existe (primer login).
   * Patrón actual en AuthContext.
   * @param {{ uid, email }} firebaseUser
   */
  async createIfNotExists(session) {
    // CRÍTICO: buscar por auth_id, no por id interno de PostgreSQL.
    // session.uid = UUID de Supabase Auth (auth.users.id)
    //            = columna auth_id en la tabla users
    // session.uid ≠ columna id (UUID interno generado por PostgreSQL)
    const existing = await this.getByAuthId(session.uid);
    if (existing) return existing;

    await this.create(session.uid, {
      email: session.email ?? "",
      nombre: "",
      apellido1: "",
      apellido2: "",
      cedula: "",
      telefono: "",
      domicilio: "",
      fecha_nacimiento: null,
      fecha_alta: null,
      rol: "agente",
      estado_usuario: "activo",
      delegation_id: null,
      squad_id: null,
      rank_id: null,
      condition_id: null,
      ultimo_login: getProvider().now(),
    });

    return this.getById(firebaseUser.uid);
  }

  /**
   * Actualizar último login.
   * @param {string} uid
   */
  async updateLastLogin(uid) {
    return getProvider().patch(COLLECTION, uid, {
      ultimo_login: getProvider().now(),
    });
  }

  /**
   * Asignar recurso a usuario (bidireccional — coordinado desde RecursoRepository).
   * @param {string} uid
   * @param {{ id, nombre_recurso }} recurso
   */
  async assignRecurso(uid, recurso) {
    return getProvider().patch(COLLECTION, uid, {
      recurso_id: recurso.id,
      recurso_nombre: recurso.nombre_recurso ?? "",
    });
  }

  /**
   * Liberar recurso de usuario.
   * @param {string} uid
   */
  async releaseRecurso(uid) {
    return getProvider().patch(COLLECTION, uid, {
      recurso_id: "",
      recurso_nombre: "",
    });
  }

  /**
   * Asignar escuadra a usuario.
   * @param {string} uid
   * @param {{ id, nombre }} escuadra
   */
  async assignEscuadra(uid, escuadra) {
    return getProvider().patch(COLLECTION, uid, {
      escuadra_id: escuadra.id,
      escuadra_nombre: escuadra.nombre ?? "",
    });
  }

  /**
   * Liberar escuadra de usuario.
   * @param {string} uid
   */
  async releaseEscuadra(uid) {
    return getProvider().patch(COLLECTION, uid, {
      escuadra_id: "",
      escuadra_nombre: "",
    });
  }
}

// =========================================
// SINGLETON EXPORTADO
// =========================================

export const UserRepository = new UserRepositoryClass();
