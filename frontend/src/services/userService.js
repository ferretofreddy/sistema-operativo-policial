import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";

import { db } from "./firebase";

// =========================================
// 🔥 CREAR USER SI NO EXISTE
// =========================================

export const createUserIfNotExists =
  async (user) => {

    try {

      const ref =
        doc(
          db,
          "usuarios",
          user.uid,
        );

      const snapshot =
        await getDoc(ref);

      // =========================================
      // 🔥 YA EXISTE
      // =========================================

      if (snapshot.exists()) {

        return;
      }

      // =========================================
      // 🔥 CREAR BASE USER
      // =========================================

      await setDoc(ref, {

        uid: user.uid,

        email:
          user.email || "",

        nombre: "",

        apellido1: "",

        apellido2: "",

        cedula: "",

        telefono: "",

        domicilio: "",

        fecha_nacimiento:
          null,

        fecha_alta:
          null,

        rol: "agente",

        estado_usuario:
          "activo",

        region_id: "",
        region_nombre: "",

        delegacion_id: "",
        delegacion_nombre:
          "",

        escuadra_id: "",
        escuadra_nombre:
          "",

        recurso_id: "",
        recurso_nombre:
          "",

        rango_id: "",
        rango_nombre: "",

        condicion_id: "",
        condicion_nombre:
          "",

        creado:
          Timestamp.now(),

        actualizado:
          Timestamp.now(),

        ultimo_login:
          Timestamp.now(),
      });

    } catch (error) {

      console.error(
        "Error createUserIfNotExists:",
        error,
      );

      throw error;
    }
  };

// =========================================
// 🔥 OBTENER USER DATA
// =========================================

export const getUserData =
  async (uid) => {

    try {

      const snapshot =
        await getDoc(
          doc(
            db,
            "usuarios",
            uid,
          ),
        );

      if (!snapshot.exists()) {

        return null;
      }

      return {
        id: snapshot.id,
        ...snapshot.data(),
      };

    } catch (error) {

      console.error(
        "Error getUserData:",
        error,
      );

      throw error;
    }
  };

// =========================================
// 🔥 OBTENER USUARIOS
// =========================================

export const getUsuarios =
  async () => {

    const snapshot =
      await getDocs(
        collection(
          db,
          "usuarios",
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
// 🔥 OBTENER USUARIO
// =========================================

export const getUsuarioById =
  async (uid) => {

    const snapshot =
      await getDoc(
        doc(
          db,
          "usuarios",
          uid,
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

// =========================================
// 🔥 ACTUALIZAR USUARIO
// =========================================

export const updateUsuario =
  async (uid, datos) => {

    await updateDoc(
      doc(
        db,
        "usuarios",
        uid,
      ),

      {
        ...datos,

        actualizado:
          Timestamp.now(),
      },
    );
  };