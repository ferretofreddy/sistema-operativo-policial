// frontend/src/services/catalogosService.js
import {
    fetchCatalogCached,
    clearCatalogCache,
} from "./firebaseQuery";

// =========================================
// 🔥 TIPOS RECURSO
// =========================================

export const getTiposRecurso =
    async () => {
        return await fetchCatalogCached(
            "tipos_recurso",
        );
    };

// =========================================
// 🔥 RANGOS USUARIO
// =========================================

export const getRangosUsuario =
    async () => {
        const data =
            await fetchCatalogCached(
                "rangos_usuario",
            );

        return data.sort(
            (a, b) =>
                (a.orden_jerarquico ||
                    0) -
                (b.orden_jerarquico ||
                    0),
        );
    };

// =========================================
// 🔥 CONDICIONES
// =========================================

export const getCondicionesUsuario =
    async () => {
        return await fetchCatalogCached(
            "condiciones_usuario",
        );
    };

// =========================================
// 🔥 LIMPIAR CACHE
// =========================================

export const clearCatalogsCache =
    () => {
        clearCatalogCache(
            "tipos_recurso",
        );

        clearCatalogCache(
            "rangos_usuario",
        );

        clearCatalogCache(
            "condiciones_usuario",
        );
    };