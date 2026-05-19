// frontend/src/context/AuthContext.jsx
//
// Contexto global de sesión.
// Usa AuthService (authAdapter) y UserRepository del core.
// No importa Firebase ni Supabase directamente.

import { createContext, useEffect, useState } from "react";
import { AuthService }    from "../core/adapters/authAdapter";
import { UserRepository } from "../core/repositories/UserRepository";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // session = { uid, email, emailVerified } | null
  // En Supabase: uid = auth.users.id (UUID real)
  // En Firebase: uid = Firebase UID (string)
  const [session,  setSession]  = useState(null);

  // userData = fila de public.users con el perfil institucional
  const [userData, setUserData] = useState(null);

  // loading = true mientras se resuelve la sesión inicial
  const [loading,  setLoading]  = useState(true);

  // =========================================
  // OBSERVER DE SESIÓN
  // =========================================

  useEffect(() => {
    const unsubscribe = AuthService.onSessionChange(async (currentSession) => {
      try {
        if (currentSession) {
          // Cargar perfil institucional por auth_id
          // getByAuthId busca en public.users WHERE auth_id = currentSession.uid
          try {
            const data = await UserRepository.getByAuthId(currentSession.uid);

            if (!data) {
              // El usuario existe en Auth pero no tiene perfil institucional todavía.
              // En Supabase: el admin debe crear el perfil desde el panel.
              // En Firebase: createIfNotExists lo creaba automáticamente.
              // Por ahora: logueamos el aviso y dejamos userData = null.
              // El frontend mostrará un estado de "perfil no configurado".
              console.warn(
                "[AuthContext] Usuario autenticado sin perfil institucional.",
                "UID:", currentSession.uid,
                "Email:", currentSession.email,
              );
              setUserData(null);
            } else {
              setUserData(data);
            }
          } catch (profileError) {
            console.error("[AuthContext] Error cargando perfil:", profileError.message);
            setUserData(null);
          }
        } else {
          setUserData(null);
        }

        setSession(currentSession);
      } catch (error) {
        console.error("[AuthContext] Error en observer:", error.message);
        setSession(null);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // =========================================
  // CONTEXTO EXPUESTO
  // =========================================

  return (
    <AuthContext.Provider
      value={{
        user: session,           // { uid, email, emailVerified } | null
        userData,                // fila de public.users | null
        loading,

        // Refrescar perfil manualmente (tras editar usuario)
        refreshUserData: async () => {
          if (!session?.uid) return;
          try {
            const data = await UserRepository.getByAuthId(session.uid);
            setUserData(data);
          } catch (error) {
            console.error("[AuthContext] Error refrescando perfil:", error.message);
          }
        },
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}
