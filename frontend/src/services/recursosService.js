// frontend/src/services/recursosService.js
import { Timestamp } from "firebase/firestore";
import { fetchCollectionFiltered, fetchDocumentById } from "./firebaseQuery";
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";

// =========================================
// 🔥 RECURSOS POR TERRITORIO
// =========================================
export const getRecursosByTerritory = async (filters = {}, options = {}) => {
    return await fetchCollectionFiltered("recursos_operativos", filters, {
        ...options,
        orderByField: options.orderByField || "nombre_recurso",
        orderByDir: options.orderByDir || "asc",
    });
};

// =========================================
// 🔥 RECURSOS POR ESCUADRA
// =========================================
export const getRecursosByEscuadra = async (escuadraId) => {
    return await fetchCollectionFiltered("recursos_operativos", {
        escuadra_id: escuadraId,
    }, {
        orderByField: "nombre_recurso",
        orderByDir: "asc",
    });
};

// =========================================
// 🔥 ASIGNAR OFICIAL A RECURSO (bidireccional - CORREGIDO)
// =========================================
export const assignOficialToRecurso = async ({ recursoId, usuario, escuadraData }) => {
    // ✅ CORRECCIÓN: Cargar recurso PRIMERO para obtener nombre_recurso correcto
    const recursoSnap = await fetchDocumentById("recursos_operativos", recursoId);

    const oficialData = {
        uid: usuario.id,
        nombre: [usuario.nombre, usuario.apellido1, usuario.apellido2].filter(Boolean).join(" "),
        rol: usuario.rol,
        rango: usuario.rango_siglas || "",
        // ✅ CORRECCIÓN: Usar escuadraData para los campos de escuadra (no del usuario)
        escuadra_id: escuadraData?.id || "",
        escuadra_nombre: escuadraData?.nombre || "",
    };

    // 1️⃣ Actualizar usuario con nombre_recurso del recurso (no de escuadra)
    await updateDoc(doc(db, "usuarios", usuario.id), {
        recurso_id: recursoId,
        recurso_nombre: recursoSnap?.nombre_recurso || "", // ✅ CORRECCIÓN
        actualizado: Timestamp.now(),
    });

    // 2️⃣ Actualizar recurso
    const oficiales = [...(recursoSnap?.oficiales || []), oficialData];

    await updateDoc(doc(db, "recursos_operativos", recursoId), {
        oficiales,
        escuadra_id: escuadraData?.id || "",
        escuadra_nombre: escuadraData?.nombre || "",
        estado: oficiales.length > 0 ? "asignado" : "disponible",
        actualizado: Timestamp.now(),
    });

    return { success: true, oficiales };
};

// =========================================
// 🔥 REMOVER OFICIAL DE RECURSO (bidireccional)
// =========================================
export const removeOficialFromRecurso = async ({ recursoId, oficialUid }) => {
    // 1️⃣ Liberar usuario
    await updateDoc(doc(db, "usuarios", oficialUid), {
        recurso_id: "",
        recurso_nombre: "",
        actualizado: Timestamp.now(),
    });

    // 2️⃣ Actualizar recurso
    const recursoSnap = await fetchDocumentById("recursos_operativos", recursoId);
    const oficiales = (recursoSnap?.oficiales || []).filter(o => o.uid !== oficialUid);

    await updateDoc(doc(db, "recursos_operativos", recursoId), {
        oficiales,
        escuadra_id: oficiales.length > 0 ? recursoSnap.escuadra_id : "",
        escuadra_nombre: oficiales.length > 0 ? recursoSnap.escuadra_nombre : "",
        estado: oficiales.length > 0 ? "asignado" : "disponible",
        actualizado: Timestamp.now(),
    });

    return { success: true, oficiales };
};

// =========================================
// 🔥 LIBERAR RECURSO COMPLETO
// =========================================
export const liberarRecurso = async (recursoId) => {
    const recurso = await fetchDocumentById("recursos_operativos", recursoId);
    if (!recurso) return { success: false, error: "Recurso no encontrado" };

    // 1️⃣ Liberar todos los oficiales
    for (const oficial of recurso.oficiales || []) {
        await updateDoc(doc(db, "usuarios", oficial.uid), {
            recurso_id: "",
            recurso_nombre: "",
            actualizado: Timestamp.now(),
        });
    }

    // 2️⃣ Limpiar recurso
    await updateDoc(doc(db, "recursos_operativos", recursoId), {
        oficiales: [],
        escuadra_id: "",
        escuadra_nombre: "",
        estado: "disponible",
        actualizado: Timestamp.now(),
    });

    return { success: true };
};

// =========================================
// 🔥 LEGACY
// =========================================
export const getRecursos = async () => {
    console.warn("⚠️ getRecursos() está obsoleto. Usa getRecursosByTerritory().");
    return await fetchCollectionFiltered("recursos_operativos", {}, { includeInactive: true });
};

export const getRecursosActivos = async () => {
    return await getRecursosByTerritory({ estado: "activo" });
};