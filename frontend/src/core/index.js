// src/core/index.js
// Barrel file — punto único de importación del core.
//
// USO CORRECTO en componentes:
//   import { UserRepository, RegionRepository } from "../../core";
//   import { formatDate, toDate } from "../../core";
//
// NUNCA importar Supabase o Firebase directamente en componentes.

// =========================================
// REPOSITORIES
// =========================================

export { UserRepository }         from "./repositories/UserRepository";
export { OrderRepository }        from "./repositories/OrderRepository";
export { PlanningRepository }     from "./repositories/PlanningRepository";
export { ServiceSheetRepository } from "./repositories/ServiceSheetRepository";
export { ResourceRepository }     from "./repositories/ResourceRepository";
export { RegionRepository }       from "./repositories/RegionRepository";
export { DelegationRepository }   from "./repositories/DelegationRepository";
export { SquadRepository }        from "./repositories/SquadRepository";
export { RankRepository }         from "./repositories/RankRepository";
export { ConditionRepository }    from "./repositories/ConditionRepository";
export { ResourceTypeRepository } from "./repositories/ResourceTypeRepository";

// =========================================
// ADAPTERS
// =========================================

// Auth
export { AuthService } from "./adapters/authAdapter";

// Fechas — funciones individuales (no hay objeto DateAdapter)
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

// Storage — exportar cuando se necesite en componentes
// (estrategia actual: descarga local en cliente, sin Firebase Storage)
export * from "./adapters/storageAdapter";

// Territory — exportar cuando se confirmen los nombres exactos de export
export * from "./adapters/territoryAdapter";

// =========================================
// VALIDATORS
// =========================================

export { validateCrearUsuario } from "./validators/usuarioValidator";