// frontend/src/utils/constants.js 
export const ROLES = {
    ADMIN: "admin",
    UNIDAD_OPERATIVA: "unidad_operativa",
    SUPERVISOR: "supervisor",
    AGENTE: "agente",
    JEFATURA: "jefatura"
};

export const ESTADOS = {
    ACTIVO: "activo",
    INACTIVO: "inactivo",
    PENDIENTE: "pendiente",
    EN_CURSO: "en_curso",
    FINALIZADO: "finalizado"
};

export const LIMITES = {
    PAGE_SIZE_DESKTOP: 25,
    PAGE_SIZE_MOBILE: 10,
    DEBOUNCE_SEARCH: 300,
    CACHE_TTL_MS: 5 * 60 * 1000 // 5 minutos
};