// frontend/src/shared/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";

export const ProtectedRoute = ({ children, userData, allowedRoles }) => {
  const location = useLocation();

  // 1️⃣ Verificar autenticación
  if (!userData?.uid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2️⃣ Si no hay restricción de rol, permitir acceso (autenticación pura)
  if (!allowedRoles) {
    return children;
  }

  // 3️⃣ Verificar permisos por rol
  const userRol = userData.rol;
  const rolesArray = Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRoles];
  const isAllowed = rolesArray.includes(userRol);

  if (!isAllowed) {
    return <Navigate to={`/${userRol}?error=unauthorized`} replace />;
  }

  return children;
};
