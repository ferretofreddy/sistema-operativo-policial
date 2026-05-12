import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, userData, allowedRoles }) {
  if (!allowedRoles.includes(userData.rol)) {
    return <p>No autorizado</p>;
  }

  return children;
}

export default ProtectedRoute;
