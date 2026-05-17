// frontend/src/services/territorialService.js
import {
    fetchCatalogCached,
    clearCatalogCache,
} from "./firebaseQuery";

// =========================================
// REGIONES
// =========================================

export const getRegiones =
    async () => {
        const data =
            await fetchCatalogCached(
                "regiones",
            );

        return data.sort((a, b) =>
            a.nombre.localeCompare(
                b.nombre,
            ),
        );
    };

// =========================================
// DELEGACIONES
// =========================================

export const getDelegaciones =
    async (regionId = null) => {
        const filters = regionId
            ? { region_id: regionId }
            : {};

        const data =
            await fetchCatalogCached(
                "delegaciones",
                filters,
            );

        return data.sort((a, b) =>
            a.nombre.localeCompare(
                b.nombre,
            ),
        );
    };

// =========================================
// LIMPIAR CACHE
// =========================================

export const clearTerritorialCache =
    () => {
        clearCatalogCache(
            "regiones",
        );

        clearCatalogCache(
            "delegaciones",
        );
    };