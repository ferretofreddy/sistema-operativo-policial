// src/core/providers/firebase/FirebaseProvider.js
//
// Implementación concreta de BaseProvider usando Firebase/Firestore.
// Este es el ÚNICO archivo que importa el SDK de Firebase para datos.
// Cuando migremos a Supabase, solo cambiamos el provider registrado
// en providerRegistry.js — los repositories y componentes no cambian.

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

import { db } from "../../../services/firebase";
import { BaseProvider } from "../BaseProvider";

// =========================================
// ESTADOS POR DEFECTO POR COLECCIÓN
// =========================================

const DEFAULT_ACTIVE_STATES = {
  usuarios: { field: "estado_usuario", value: "activo" },
  escuadras: { field: "estado", value: "activo" },
  recursos_operativos: { field: "estado", value: "activo" },
  regiones: { field: "estado", value: "activo" },
  delegaciones: { field: "estado", value: "activo" },
  tipos_recurso: { field: "estado", value: "activo" },
  rangos_usuario: { field: "estado", value: "activo" },
  condiciones_usuario: { field: "estado", value: "activo" },
};

// =========================================
// IMPLEMENTACIÓN
// =========================================

export class FirebaseProvider extends BaseProvider {
  // =========================================
  // FETCH COLECCIÓN
  // =========================================

  async fetchCollection(collectionName, filters = {}, options = {}) {
    try {
      const {
        orderByField = "creado",
        orderByDir = "desc",
        limitToFirst = null,
        includeInactive = false,
      } = options;

      const constraints = [];

      // Filtro de estado activo por defecto
      const estadoConfig = DEFAULT_ACTIVE_STATES[collectionName];
      if (!includeInactive && estadoConfig && !filters[estadoConfig.field]) {
        constraints.push(where(estadoConfig.field, "==", estadoConfig.value));
      }

      // Filtros dinámicos — limpiar vacíos
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(
          ([, v]) => v !== undefined && v !== null && v !== "",
        ),
      );

      Object.entries(cleanFilters).forEach(([key, value]) => {
        constraints.push(where(key, "==", value));
      });

      // Orden
      constraints.push(orderBy(orderByField, orderByDir));

      // Limit
      if (limitToFirst) constraints.push(limit(limitToFirst));

      const q = query(collection(db, collectionName), ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
    } catch (error) {
      console.error(
        `[FirebaseProvider] fetchCollection(${collectionName}):`,
        error.code,
        error.message,
      );
      throw error;
    }
  }

  // =========================================
  // FETCH POR ID
  // =========================================

  async fetchById(collectionName, id) {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
      console.error(
        `[FirebaseProvider] fetchById(${collectionName}, ${id}):`,
        error.message,
      );
      throw error;
    }
  }

  // =========================================
  // INSERT
  // =========================================

  async insert(collectionName, data) {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        creado: this.now(),
        actualizado: this.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error(
        `[FirebaseProvider] insert(${collectionName}):`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Insert con ID específico (para usuarios donde uid = docId).
   */
  async insertWithId(collectionName, id, data) {
    try {
      await setDoc(doc(db, collectionName, id), {
        ...data,
        creado: this.now(),
        actualizado: this.now(),
      });
      return id;
    } catch (error) {
      console.error(
        `[FirebaseProvider] insertWithId(${collectionName}, ${id}):`,
        error.message,
      );
      throw error;
    }
  }

  // =========================================
  // PATCH (actualización parcial)
  // =========================================

  async patch(collectionName, id, data) {
    try {
      await updateDoc(doc(db, collectionName, id), {
        ...data,
        actualizado: this.now(),
      });
    } catch (error) {
      console.error(
        `[FirebaseProvider] patch(${collectionName}, ${id}):`,
        error.message,
      );
      throw error;
    }
  }

  // =========================================
  // REPLACE (reemplazo completo)
  // =========================================

  async replace(collectionName, id, data) {
    try {
      await setDoc(doc(db, collectionName, id), {
        ...data,
        actualizado: this.now(),
      });
    } catch (error) {
      console.error(
        `[FirebaseProvider] replace(${collectionName}, ${id}):`,
        error.message,
      );
      throw error;
    }
  }

  // =========================================
  // REMOVE (eliminación física — uso limitado)
  // =========================================

  async remove(collectionName, id) {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error(
        `[FirebaseProvider] remove(${collectionName}, ${id}):`,
        error.message,
      );
      throw error;
    }
  }

  // =========================================
  // TIMESTAMP
  // =========================================

  now() {
    return Timestamp.now();
  }

  /**
   * Convertir Date nativa a Timestamp de Firebase.
   * SupabaseProvider retornará ISO string.
   */
  fromDate(date) {
    return Timestamp.fromDate(date);
  }
}
