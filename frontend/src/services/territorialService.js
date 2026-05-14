import {
    collection,
    getDocs,
} from "firebase/firestore";

import { db } from "./firebase";

// =========================================
// 🔥 REGIONES
// =========================================

export const getRegiones =
    async () => {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "regiones",
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
            .sort((a, b) =>
                a.nombre.localeCompare(
                    b.nombre,
                ),
            );
    };

// =========================================
// 🔥 DELEGACIONES
// =========================================

export const getDelegaciones =
    async () => {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "delegaciones",
                ),
            );

        return snapshot.docs
            .map((d) => ({
                id: d.id,
                ...d.data(),
            }))
            .filter(
                (d) =>
                    d.estado ===
                    "activo",
            )
            .sort((a, b) =>
                a.nombre.localeCompare(
                    b.nombre,
                ),
            );
    };

// =========================================
// 🔥 ESCUADRAS
// =========================================

export const getEscuadras =
    async () => {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "escuadras",
                ),
            );

        return snapshot.docs
            .map((d) => ({
                id: d.id,
                ...d.data(),
            }))
            .filter(
                (e) =>
                    e.estado ===
                    "activa",
            )
            .sort((a, b) =>
                a.nombre.localeCompare(
                    b.nombre,
                ),
            );
    };