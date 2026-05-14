import {
    collection,
    getDocs,
} from "firebase/firestore";

import { db } from "./firebase";

// =========================================
// 🔥 RECURSOS
// =========================================

export const getRecursos =
    async () => {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "recursos_operativos",
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
// 🔥 RECURSOS ACTIVOS
// =========================================

export const getRecursosActivos =
    async () => {

        const recursos =
            await getRecursos();

        return recursos.filter(
            (r) =>
                r.estado ===
                "activo",
        );
    };