import {
    Timestamp,
    doc,
    updateDoc,
} from "firebase/firestore";

import {
    fetchCollectionFiltered,
    fetchDocumentById,
} from "./firebaseQuery";

import { db } from "./firebase";

// =========================================
// 🔥 ESCUADRAS TERRITORIO
// =========================================

export const getEscuadrasByTerritory =
    async (
        filters = {},
        options = {},
    ) => {
        return await fetchCollectionFiltered(
            "escuadras",
            filters,
            {
                ...options,

                orderByField:
                    options.orderByField ||
                    "nombre",

                orderByDir:
                    options.orderByDir ||
                    "asc",
            },
        );
    };

// =========================================
// 🔥 ESCUADRAS DISPONIBLES
// =========================================

export const getEscuadrasDisponibles =
    async (
        territoryFilters = {},
    ) => {
        return await fetchCollectionFiltered(
            "escuadras",
            {
                estado: "activo",
                ...territoryFilters,
            },
            {
                orderByField:
                    "nombre",

                orderByDir: "asc",
            },
        );
    };

// =========================================
// 🔥 ESCUADRA POR ID
// =========================================

export const getEscuadraById =
    async (escuadraId) => {
        return await fetchDocumentById(
            "escuadras",
            escuadraId,
        );
    };

// =========================================
// 🔥 ASIGNAR USUARIO
// =========================================

export const assignUsuarioToEscuadra =
    async ({
        escuadraId,
        usuario,
    }) => {
        const escuadra =
            await fetchDocumentById(
                "escuadras",
                escuadraId,
            );

        await updateDoc(
            doc(
                db,
                "usuarios",
                usuario.id,
            ),
            {
                escuadra_id:
                    escuadraId,

                escuadra_nombre:
                    escuadra?.nombre || "",

                actualizado:
                    Timestamp.now(),
            },
        );

        const oficiales = [
            ...(escuadra?.oficiales ||
                []),

            {
                uid: usuario.id,

                nombre: [
                    usuario.nombre,
                    usuario.apellido1,
                    usuario.apellido2,
                ]
                    .filter(Boolean)
                    .join(" "),

                rol: usuario.rol,
            },
        ];

        await updateDoc(
            doc(
                db,
                "escuadras",
                escuadraId,
            ),
            {
                oficiales,

                actualizado:
                    Timestamp.now(),
            },
        );

        return {
            success: true,
            oficiales,
        };
    };

// =========================================
// 🔥 REMOVER USUARIO
// =========================================

export const removeUsuarioFromEscuadra =
    async ({
        escuadraId,
        usuarioUid,
    }) => {
        await updateDoc(
            doc(
                db,
                "usuarios",
                usuarioUid,
            ),
            {
                escuadra_id: "",
                escuadra_nombre: "",

                actualizado:
                    Timestamp.now(),
            },
        );

        const escuadra =
            await fetchDocumentById(
                "escuadras",
                escuadraId,
            );

        const oficiales = (
            escuadra?.oficiales ||
            []
        ).filter(
            (o) =>
                o.uid !== usuarioUid,
        );

        const supervisor_uid =
            escuadra?.supervisor_uid ===
                usuarioUid
                ? ""
                : escuadra?.supervisor_uid;

        const supervisor_nombre =
            escuadra?.supervisor_uid ===
                usuarioUid
                ? ""
                : escuadra?.supervisor_nombre;

        await updateDoc(
            doc(
                db,
                "escuadras",
                escuadraId,
            ),
            {
                oficiales,

                supervisor_uid,

                supervisor_nombre,

                actualizado:
                    Timestamp.now(),
            },
        );

        return {
            success: true,
            oficiales,
            supervisor_uid,
            supervisor_nombre,
        };
    };

// =========================================
// 🔥 ACTUALIZAR SUPERVISOR
// =========================================

export const updateSupervisor =
    async ({
        escuadraId,
        supervisorUid,
    }) => {
        const escuadra =
            await fetchDocumentById(
                "escuadras",
                escuadraId,
            );

        const supervisor =
            escuadra?.oficiales?.find(
                (o) =>
                    o.uid ===
                    supervisorUid,
            );

        await updateDoc(
            doc(
                db,
                "escuadras",
                escuadraId,
            ),
            {
                supervisor_uid:
                    supervisor?.uid || "",

                supervisor_nombre:
                    supervisor?.nombre ||
                    "",

                actualizado:
                    Timestamp.now(),
            },
        );

        return {
            success: true,
        };
    };

// =========================================
// 🔥 LEGACY
// =========================================

export const getEscuadras =
    async () => {
        console.warn(
            "⚠️ getEscuadras() obsoleto",
        );

        return await fetchCollectionFiltered(
            "escuadras",
            {
                estado: "activo",
            },
            {
                orderByField:
                    "nombre",

                orderByDir: "asc",
            },
        );
    };