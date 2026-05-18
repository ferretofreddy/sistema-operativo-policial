// src/core/index.js
//
// Barrel file — punto de entrada limpio para toda la capa core.
//
// CORRECTO:   import { UserRepository, AuthService, formatDate } from '@/core'
// INCORRECTO: import { UserRepository } from '../../core/repositories/UserRepository'
//
// Alias en vite.config.js:
//   resolve: { alias: { '@/core': path.resolve(__dirname, 'src/core') } }

// =========================================
// REPOSITORIES
// =========================================

export { UserRepository }         from "./repositories/UserRepository";
export { OrderRepository }        from "./repositories/OrderRepository";
export { PlanningRepository }     from "./repositories/PlanningRepository";
export { ServiceSheetRepository } from "./repositories/ServiceSheetRepository";
export { TerritorialRepository }  from "./repositories/TerritorialRepository";
export { CatalogRepository }      from "./repositories/CatalogRepository";

// =========================================
// PROVIDERS
// =========================================

export {
  getProvider,
  setProviderForTesting,
  resetProvider,
} from "./providers/providerRegistry";

// =========================================
// ADAPTERS — Auth
// =========================================

export { AuthService } from "./adapters/authAdapter";

// =========================================
// ADAPTERS — Fechas
// =========================================

export {
  toDate,
  formatDate,
  formatDateTime,
  formatTime,
  toInputDate,
  fromInputDate,
  isPast,
  isToday,
  todayString,
} from "./adapters/dateAdapter";

// =========================================
// ADAPTERS — Territorio
// =========================================

export {
  getTerritoryScope,
  scopeToFilters,
  getUserQueryFilters,
  canAccessEntity,
  resetDependentFields,
  getTerritoryDefaults,
  getTerritoryUIConfig,
} from "./adapters/territoryAdapter";

// =========================================
// ADAPTERS — Storage / Archivos
// =========================================

export {
  downloadBlob,
  downloadBuffer,
  getServiceSheetFilename,
  getPlanningFilename,
  MIME_TYPES,
} from "./adapters/storageAdapter";

// =========================================
// VALIDATORS
// =========================================

export {
  validateCrearUsuario,
  validateEditarUsuario,
} from "./validators/usuarioValidator";

export {
  validateRegion,
  validateDelegacion,
  validateEscuadra,
} from "./validators/territorialValidator";

export {
  validateOrden,
  validateHojaServicio,
  validateActividad,
} from "./validators/operativoValidator";
