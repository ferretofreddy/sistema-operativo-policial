import {
    collection,
    getDocs,
} from "firebase/firestore";

import { db } from "./firebase";

// =========================================
// 🔥 TIPOS RECURSO
// =========================================

export const getTiposRecurso =
    async () => {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "tipos_recurso",
                ),
            );

        return snapshot.docs
            .map((d) => ({
                id: d.id,
                ...d.data(),
            }))
            .filter(
                (t) =>
                    t.estado ===
                    "activo",
            )
            .sort((a, b) =>
                a.nombre.localeCompare(
                    b.nombre,
                ),
            );
    };

// =========================================
// 🔥 RANGOS
// =========================================

export const getRangosUsuario =
    async () => {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "rangos_usuario",
                ),
            );

        return snapshot.docs
            .map((d) => ({
                id: d.id,
                ...d.data(),
            }))
            .filter(
                (r) =>
                    r.estado ===
                    "activo",
            )
            .sort(
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

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "condiciones_usuario",
                ),
            );

        return snapshot.docs
            .map((d) => ({
                id: d.id,
                ...d.data(),
            }))
            .filter(
                (c) =>
                    c.estado ===
                    "activo",
            )
            .sort((a, b) =>
                a.nombre.localeCompare(
                    b.nombre,
                ),
            );
    };