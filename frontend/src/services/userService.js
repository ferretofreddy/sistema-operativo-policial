import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

import { db } from "./firebase";

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

      datos,
    );
  };