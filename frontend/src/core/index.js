// src/core/index.js
// Barrel file — punto único de importación del core.
//
// USO CORRECTO en componentes:
//   import { UserRepository, RegionRepository } from "../../core";
//
// NUNCA importar Supabase o Firebase directamente en componentes.

// =========================================
// REPOSITORIES
// =========================================

export { UserRepository }         from "./repositories/UserRepository";
export { OrderRepository }        from "./repositories/OrderRepository";
export { PlanningRepository }     from "./repositories/PlanningRepository";
export { ServiceSheetRepository } from "./repositories/ServiceSheetRepository";

// Nuevos — FASE 1 migración
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

export { AuthService }            from "./adapters/authAdapter";
export { DateAdapter }            from "./adapters/dateAdapter";
export { StorageAdapter }         from "./adapters/storageAdapter";
export { getTerritoryScope,
         getUserQueryFilters }    from "./adapters/territoryAdapter";

// =========================================
// VALIDATORS
// =========================================

export { usuarioValidator }       from "./validators/usuarioValidator";
