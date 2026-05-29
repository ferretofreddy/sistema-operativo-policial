// frontend/src/shared/components/ProtectedRoute.jsx
//
// Guarda de rutas — verifica autenticación y permisos por rol.
//
// CAMPO CORRECTO: userData.id (UUID interno de PostgreSQL)
// userData viene de public.users — NO de Supabase Auth directamente.
// El campo uid NO existe en public.users — usar id o auth_id.
//
// Campos disponibles en userData (public.users):
//   id            → UUID interno de PostgreSQL (PK)
//   auth_id       → UUID de Supabase Auth
//   email         → correo institucional
//   rol           → admin | supervisor | unidad_operativa | jefatura | agente
//   delegation_id → UUID de la delegación
//   squad_id      → UUID de la escuadra
//   rank_id       → UUID del rango
//   condition_id  → UUID de la condición

import { Navigate, useLocation } from "react-router-dom";

export const ProtectedRoute = ({ children, userData, allowedRoles }) => {
  const location = useLocation();

  // 1️⃣ Sin perfil institucional → redirigir a login
  // Usar userData.id (PK de public.users) o userData.auth_id
  // NO usar userData.uid — ese campo no existe en PostgreSQL
  if (!userData?.id && !userData?.auth_id) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2️⃣ Sin restricción de rol → acceso libre (solo autenticación)
  if (!allowedRoles) {
    return children;
  }

  // 3️⃣ Verificar permiso por rol
  const userRol    = userData.rol;
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const isAllowed  = rolesArray.includes(userRol);

  if (!isAllowed) {
    // Redirigir al dashboard del rol sin query string — evita loops
    return <Navigate to={`/${userRol}`} replace />;
  }

  return children;
};
