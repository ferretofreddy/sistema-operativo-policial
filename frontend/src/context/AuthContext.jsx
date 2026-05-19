// frontend/src/context/AuthContext.jsx
//
// Contexto global de sesión.
//
// ANTES: importaba firebase/auth directamente
//   - onAuthStateChanged(auth, ...)
//   - import { auth } from '../services/firebase'
//
// AHORA: usa AuthService y UserRepository del core
//   - AuthService.onSessionChange(...)
//   - UserRepository.createIfNotExists()
//   - UserRepository.getById()
//
// Beneficio: AuthContext ya no sabe si la auth viene de
// Firebase, Supabase, o cualquier otro provider.
// Cuando migremos a Supabase Auth, solo cambia authAdapter.js.

import { createContext, useEffect, useState } from "react";
import { AuthService }    from "../core/adapters/authAdapter";
import { UserRepository } from "../core/repositories/UserRepository";

// =========================================
// CONTEXT
// =========================================

export const AuthContext = createContext();

// =========================================
// PROVIDER
// =========================================

export function AuthProvider({ children }) {
  // session = { uid, email, emailVerified } | null
  // Forma normalizada — no es el objeto Firebase User
  const [session,  setSession]  = useState(null);

  // userData = documento de Firestore/BD del usuario
  const [userData, setUserData] = useState(null);

  // loading = true mientras se resuelve la sesión inicial
  const [loading,  setLoading]  = useState(true);

  // =========================================
  // OBSERVER DE SESIÓN
  // =========================================

  useEffect(() => {
    // AuthService.onSessionChange reemplaza onAuthStateChanged(auth, ...)
    // El callback recibe AuthSession | null (ya normalizado)
    const unsubscribe = AuthService.onSessionChange(async (currentSession) => {
      try {
        if (currentSession) {
          // =========================================
          // USUARIO AUTENTICADO
          // =========================================

          // 1. Crear perfil en BD si es primer login
          //    (patrón existente centralizado en repository)
          await UserRepository.createIfNotExists(currentSession);

          // 2. Cargar datos del perfil institucional
          try {
            // getByAuthId busca por auth_id (UID de Auth), no por id interno de PostgreSQL
          const data = await UserRepository.getByAuthId(currentSession.uid);
            setUserData(data);
          } catch (profileError) {
            console.error("[AuthContext] Error cargando perfil:", profileError);
            setUserData(null);
          }
        } else {
          // =========================================
          // SESIÓN CERRADA
          // =========================================
          setUserData(null);
        }

        // Actualizar sesión normalizada
        setSession(currentSession);
      } catch (error) {
        console.error("[AuthContext] Error en observer:", error);
        setSession(null);
        setUserData(null);
      } finally {
        // Solo en la primera resolución
        setLoading(false);
      }
    });

    // Cleanup al desmontar
    return () => unsubscribe();
  }, []);

  // =========================================
  // CONTEXTO EXPUESTO
  // =========================================

  return (
    <AuthContext.Provider
      value={{
        // session = { uid, email, emailVerified } | null
        // Para compatibilidad con componentes que aún usan user.uid
        // se expone como "user" (mismo nombre que antes)
        user: session,

        // userData = documento completo del usuario en BD
        userData,

        // loading = resolución inicial de sesión
        loading,

        // Refrescar userData manualmente (útil tras editar perfil)
        refreshUserData: async () => {
          if (!session?.uid) return;
          try {
            const data = await UserRepository.getByAuthId(session.uid);
            setUserData(data);
          } catch (error) {
            console.error("[AuthContext] Error refrescando perfil:", error);
          }
        },
      }}
    >
      {/* Renderizar children solo cuando la sesión inicial ya se resolvió */}
      {!loading && children}
    </AuthContext.Provider>
  );
}
