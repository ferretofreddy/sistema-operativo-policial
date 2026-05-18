// src/core/index.js
//
// Barrel file — punto de entrada limpio para toda la capa core.
// Los componentes y services importan desde aquí, nunca desde rutas profundas.
//
// CORRECTO:   import { UserRepository } from '@/core'
// INCORRECTO: import { UserRepository } from '../../core/repositories/UserRepository'

// =========================================
// REPOSITORIES
// =========================================
export { UserRepository } from "./repositories/UserRepository";
export { OrderRepository } from "./repositories/OrderRepository";
export { PlanningRepository } from "./repositories/PlanningRepository";
export {
  ServiceSheetRepository,
  TerritorialRepository,
  CatalogRepository,
} from "./repositories/repositories";

// =========================================
// PROVIDERS
// =========================================
export {
  getProvider,
  setProviderForTesting,
  resetProvider,
} from "./providers/providerRegistry";

// =========================================
// VALIDATORS
// =========================================
export {
  validateCrearUsuario,
  validateEditarUsuario,
} from "./validators/validators";

export {
  validateRegion,
  validateDelegacion,
  validateEscuadra,
} from "./validators/validators";

export {
  validateOrden,
  validateHojaServicio,
  validateActividad,
} from "./validators/validators";
