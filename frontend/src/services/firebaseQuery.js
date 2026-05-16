import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc,
    getDoc,
    limit,
} from "firebase/firestore";

import { db } from "./firebase";

// =========================================
// 🔥 QUERY FILTRADA CENTRALIZADA
// =========================================

export const fetchCollectionFiltered = async (
    collectionName,
    filters = {},
    options = {},
) => {
    try {
        const {
            orderByField = "creado",
            orderByDir = "desc",
            limitToFirst = null,
            includeInactive = false,
        } = options;

        const constraints = [];

        // =========================================
        // 🔥 LIMPIAR FILTROS VACÍOS
        // =========================================

        const cleanedFilters = Object.fromEntries(
            Object.entries(filters).filter(
                ([_, value]) =>
                    value !== undefined &&
                    value !== null &&
                    value !== "",
            ),
        );

        // =========================================
        // 🔥 ESTADOS POR DEFECTO
        // =========================================

        const defaultEstados = {
            usuarios: {
                field: "estado_usuario",
                value: "activo",
            },

            escuadras: {
                field: "estado",
                value: "activo",
            },

            recursos_operativos: {
                field: "estado",
                value: "activo",
            },

            regiones: {
                field: "estado",
                value: "activo",
            },

            delegaciones: {
                field: "estado",
                value: "activo",
            },

            tipos_recurso: {
                field: "estado",
                value: "activo",
            },

            rangos_usuario: {
                field: "estado",
                value: "activo",
            },

            condiciones_usuario: {
                field: "estado",
                value: "activo",
            },
        };

        const estadoConfig =
            defaultEstados[collectionName];

        if (
            !includeInactive &&
            estadoConfig &&
            !cleanedFilters[estadoConfig.field]
        ) {
            constraints.push(
                where(
                    estadoConfig.field,
                    "==",
                    estadoConfig.value,
                ),
            );
        }

        // =========================================
        // 🔥 FILTROS DINÁMICOS
        // =========================================

        Object.entries(cleanedFilters).forEach(
            ([key, value]) => {
                constraints.push(
                    where(key, "==", value),
                );
            },
        );

        // =========================================
        // 🔥 ORDER BY
        // =========================================

        constraints.push(
            orderBy(
                orderByField,
                orderByDir,
            ),
        );

        // =========================================
        // 🔥 LIMIT
        // =========================================

        if (limitToFirst) {
            constraints.push(
                limit(limitToFirst),
            );
        }

        const q = query(
            collection(db, collectionName),
            ...constraints,
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(
            (docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }),
        );
    } catch (error) {
        console.error(
            `[Firestore] Error en ${collectionName}:`,
            error.message,
            "Código:",
            error.code,
            "Filtros:",
            filters,
        );

        throw error;
    }
};

// =========================================
// 🔥 DOCUMENTO POR ID
// =========================================

export const fetchDocumentById = async (
    collectionName,
    docId,
) => {
    try {
        const docRef = doc(
            db,
            collectionName,
            docId,
        );

        const docSnap =
            await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return {
            id: docSnap.id,
            ...docSnap.data(),
        };
    } catch (error) {
        console.error(
            `[Firestore] Error obteniendo ${collectionName}/${docId}:`,
            error.message,
        );

        throw error;
    }
};

// =========================================
// 🔥 CACHE CATÁLOGOS
// =========================================

const catalogCache = new Map();

const CACHE_TTL =
    5 * 60 * 1000;

// =========================================
// 🔥 FETCH CACHE
// =========================================

export const fetchCatalogCached = async (
    collectionName,
    additionalFilters = {},
) => {
    const cacheKey =
        `${collectionName}_${JSON.stringify(additionalFilters)}`;

    const cached =
        catalogCache.get(cacheKey);

    if (
        cached &&
        Date.now() - cached.timestamp <
        CACHE_TTL
    ) {
        return cached.data;
    }

    const filters = {
        estado: "activo",
        ...additionalFilters,
    };

    const data =
        await fetchCollectionFiltered(
            collectionName,
            filters,
            {
                orderByField: "nombre",
                orderByDir: "asc",
            },
        );

    catalogCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
    });

    return data;
};

// =========================================
// 🔥 LIMPIAR CACHE
// =========================================

export const clearCatalogCache = (
    collectionName,
) => {
    if (collectionName) {
        Array.from(
            catalogCache.keys(),
        ).forEach((key) => {
            if (
                key.startsWith(
                    collectionName,
                )
            ) {
                catalogCache.delete(key);
            }
        });

        return;
    }

    catalogCache.clear();
};