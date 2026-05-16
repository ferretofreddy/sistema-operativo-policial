// frontend/src/services/hojasServicioService.js
import {
    collection,
    getDocs,
    getDoc,
    doc,
} from "firebase/firestore";

import { db } from "./firebase";

// =========================================
// 🔥 HOJAS
// =========================================

export const getHojasServicio =
    async () => {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "hojas_servicio",
                ),
            );

        return snapshot.docs.map(
            (d) => ({
                id: d.id,
                ...d.data(),
            }),
        );
    };

// =========================================
// 🔥 HOJA POR ID
// =========================================

export const getHojaServicioById =
    async (id) => {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    "hojas_servicio",
                    id,
                ),
            );

        if (!snapshot.exists()) {

            return null;
        }

        return {
            id: snapshot.id,
            ...snapshot.data(),
        };
    };