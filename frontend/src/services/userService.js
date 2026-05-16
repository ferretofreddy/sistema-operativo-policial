// frontend/src/services/userService.js
import { Timestamp } from "firebase/firestore";
import { fetchCollectionFiltered, fetchDocumentById } from "./firebaseQuery";
import { db } from "./firebase";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";

// =========================================
// 🔥 CREAR USER SI NO EXISTE (sin cambios)
// =========================================
export const createUserIfNotExists = async (user) => {
  try {
    const ref = doc(db, "usuarios", user.uid);
    const snapshot = await getDoc(ref);

    if (snapshot.exists()) return;

    await setDoc(ref, {
      uid: user.uid,
      email: user.email || "",
      nombre: "",
      apellido1: "",
      apellido2: "",
      cedula: "",
      telefono: "",
      domicilio: "",
      fecha_nacimiento: null,
      fecha_alta: null,
      rol: "agente",
      estado_usuario: "activo",
      region_id: "",
      region_nombre: "",
      delegacion_id: "",
      delegacion_nombre: "",
      escuadra_id: "",
      escuadra_nombre: "",
      recurso_id: "",
      recurso_nombre: "",
      rango_id: "",
      rango_nombre: "",
      condicion_id: "",
      condicion_nombre: "",
      creado: Timestamp.now(),
      actualizado: Timestamp.now(),
      ultimo_login: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error createUserIfNotExists:", error);
    throw error;
  }
};

// =========================================
// 🔥 OBTENER USER DATA (sin cambios)
// =========================================
export const getUserData = async (uid) => {
  return await fetchDocumentById("usuarios", uid);
};

// =========================================
// 🔥 OBTENER USUARIOS POR TERRITORIO (NUEVO - PRINCIPAL)
// =========================================
export const getUsuariosByTerritory = async (filters = {}, options = {}) => {
  // Opción para incluir inactivos (útil para admin)
  const { includeInactive = false } = options;

  return await fetchCollectionFiltered("usuarios", filters, {
    ...options,
    includeInactive,
    orderByField: options.orderByField || "nombre",
    orderByDir: options.orderByDir || "asc",
  });
};

// =========================================
// 🔥 OBTENER USUARIO POR ID (alias)
// =========================================
export const getUsuarioById = async (uid) => {
  return await fetchDocumentById("usuarios", uid);
};

// =========================================
// 🔥 ACTUALIZAR USUARIO (sin cambios)
// =========================================
export const updateUsuario = async (uid, datos) => {
  await updateDoc(doc(db, "usuarios", uid), {
    ...datos,
    actualizado: Timestamp.now(),
  });
};

// =========================================
// 🔥 LEGACY: getUsuarios() para compatibilidad (DEPRECATED)
// =========================================
export const getUsuarios = async () => {
  console.warn("⚠️ getUsuarios() está obsoleto. Usa getUsuariosByTerritory() con filtros.");
  return await fetchCollectionFiltered("usuarios", {}, {
    orderByField: "nombre",
    orderByDir: "asc",
    includeInactive: true
  });
};