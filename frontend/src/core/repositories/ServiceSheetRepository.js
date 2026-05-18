// src/core/repositories/ServiceSheetRepository.js
//
// Repository de hojas de servicio.
// Reemplaza acceso directo en:
//   - CrearHojaServicio.jsx
//   - ListaHojasHoy.jsx
//   - VerHojaServicio.jsx

import { BaseRepository } from "./BaseRepository";
import { getProvider } from "../providers/providerRegistry";

const COLLECTION = "hojas_servicio";

class ServiceSheetRepositoryClass extends BaseRepository {
  async getAll(filters = {}, options = {}) {
    return getProvider().fetchCollection(
      COLLECTION,
      this._cleanFilters(filters),
      {
        orderByField: options.orderByField ?? "creado",
        orderByDir: options.orderByDir ?? "desc",
        includeInactive: true,
      },
    );
  }

  async getById(id) {
    return getProvider().fetchById(COLLECTION, id);
  }

  /**
   * Obtener hojas del día actual para una escuadra.
   * Usado en ListaHojasHoy.
   */
  async getHoyByEscuadra(escuadraId, regionId, delegacionId) {
    const hoy = new Date().toISOString().split("T")[0];
    const todas = await this.getAll({
      region_id: regionId,
      delegacion_id: delegacionId,
      escuadra_id: escuadraId,
    });
    return todas.filter((h) => h.fecha === hoy);
  }

  /**
   * Obtener hojas del día actual para una delegación completa.
   * Usado por unidad_operativa.
   */
  async getHoyByDelegacion(regionId, delegacionId) {
    const hoy = new Date().toISOString().split("T")[0];
    const todas = await this.getAll({
      region_id: regionId,
      delegacion_id: delegacionId,
    });
    return todas.filter((h) => h.fecha === hoy);
  }

  async create(data) {
    return getProvider().insert(COLLECTION, data);
  }

  async update(id, data) {
    return getProvider().patch(COLLECTION, id, data);
  }

  async softDelete(id) {
    return getProvider().patch(COLLECTION, id, { estado: "inactivo" });
  }
}

export const ServiceSheetRepository = new ServiceSheetRepositoryClass();


// =============================================================================
// src/core/repositories/TerritorialRepository.js
// Repository de entidades territoriales: regiones, delegaciones, escuadras.
// =============================================================================

class TerritorialRepositoryClass extends BaseRepository {
  // REGIONES
  async getRegiones(filters = {}) {
    const data = await getProvider().fetchCollection("regiones", filters, {
      orderByField: "nombre",
      orderByDir: "asc",
    });
    return data.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async getRegionById(id) {
    return getProvider().fetchById("regiones", id);
  }

  async createRegion(data) {
    return getProvider().insert("regiones", { ...data, estado: "activo" });
  }

  async updateRegion(id, data) {
    return getProvider().patch("regiones", id, data);
  }

  // DELEGACIONES
  async getDelegaciones(filters = {}) {
    const data = await getProvider().fetchCollection("delegaciones", filters, {
      orderByField: "nombre",
      orderByDir: "asc",
    });
    return data.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async getDelegacionesByRegion(regionId) {
    return this.getDelegaciones({ region_id: regionId });
  }

  async getDelegacionById(id) {
    return getProvider().fetchById("delegaciones", id);
  }

  async createDelegacion(data) {
    return getProvider().insert("delegaciones", data);
  }

  async updateDelegacion(id, data) {
    return getProvider().patch("delegaciones", id, data);
  }

  // ESCUADRAS
  async getEscuadras(filters = {}) {
    return getProvider().fetchCollection("escuadras", filters, {
      orderByField: "nombre",
      orderByDir: "asc",
    });
  }

  async getEscuadrasByTerritory(territory) {
    return this.getEscuadras(this._cleanFilters(territory));
  }

  async getEscuadraById(id) {
    return getProvider().fetchById("escuadras", id);
  }

  async createEscuadra(data) {
    return getProvider().insert("escuadras", { ...data, estado: "activo", oficiales: [] });
  }

  async updateEscuadra(id, data) {
    return getProvider().patch("escuadras", id, data);
  }

  // Arrays oficiales de escuadra (futuro: tabla squad_members en SQL)
  async updateOficialesEscuadra(escuadraId, oficiales, supervisorData = {}) {
    return getProvider().patch("escuadras", escuadraId, {
      oficiales,
      supervisor_uid: supervisorData.uid ?? "",
      supervisor_nombre: supervisorData.nombre ?? "",
    });
  }
}

export const TerritorialRepository = new TerritorialRepositoryClass();


// =============================================================================
// src/core/repositories/CatalogRepository.js
// Repository de catálogos: tipos_recurso, rangos_usuario, condiciones_usuario.
// Incluye cache en memoria con TTL.
// =============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const _cache = new Map();

function _getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function _setCache(key, data) {
  _cache.set(key, { data, timestamp: Date.now() });
}

class CatalogRepositoryClass extends BaseRepository {
  async _getCatalog(collectionName, filters = {}) {
    const cacheKey = `${collectionName}_${JSON.stringify(filters)}`;
    const cached = _getCached(cacheKey);
    if (cached) return cached;

    const data = await getProvider().fetchCollection(collectionName, filters, {
      orderByField: "nombre",
      orderByDir: "asc",
    });

    _setCache(cacheKey, data);
    return data;
  }

  async getTiposRecurso() {
    return this._getCatalog("tipos_recurso");
  }

  async getRangos() {
    const data = await this._getCatalog("rangos_usuario");
    return data.sort(
      (a, b) => (a.orden_jerarquico ?? 0) - (b.orden_jerarquico ?? 0),
    );
  }

  async getCondiciones() {
    return this._getCatalog("condiciones_usuario");
  }

  async createTipoRecurso(data) {
    _cache.clear();
    return getProvider().insert("tipos_recurso", data);
  }

  async updateTipoRecurso(id, data) {
    _cache.clear();
    return getProvider().patch("tipos_recurso", id, data);
  }

  async createRango(data) {
    _cache.clear();
    return getProvider().insert("rangos_usuario", data);
  }

  async updateRango(id, data) {
    _cache.clear();
    return getProvider().patch("rangos_usuario", id, data);
  }

  async createCondicion(data) {
    _cache.clear();
    return getProvider().insert("condiciones_usuario", data);
  }

  async updateCondicion(id, data) {
    _cache.clear();
    return getProvider().patch("condiciones_usuario", id, data);
  }

  clearCache() {
    _cache.clear();
  }
}

export const CatalogRepository = new CatalogRepositoryClass();
