import { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import Login from "./modules/auth/Login";
import DashboardAgente from "./modules/agente/DashboardAgente";
import DashboardSupervisor from "./modules/supervisor/DashboardSupervisor";
import DashboardAdmin from "./modules/admin/DashboardAdmin";
import DashboardUnidadOperativa from "./modules/unidad_operativa/DashboardUnidadOperativa";
import DashboardJefatura from "./modules/jefatura/DashboardJefatura";
import ProtectedRoute from "./components/ProtectedRoute";
import DetalleOrden from "./modules/unidad_operativa/ordenes/DetalleOrden";
import CrearPlanificacion from "./modules/unidad_operativa/planificacion/CrearPlanificacion";
import VerPlanificacion from "./modules/unidad_operativa/planificacion/VerPlanificacion";
import CrearHojaServicio from "./modules/supervisor/hoja_servicio/CrearHojaServicio";
import ListaHojasHoy from "./modules/supervisor/hoja_servicio/ListaHojasHoy";
import VerHojaServicio from "./modules/supervisor/hoja_servicio/VerHojaServicio";

function App() {
  const { user, userData } = useContext(AuthContext);

  if (!user) {
    return <Login />;
  }

  if (!userData) {
    return <p>Cargando...</p>;
  }

  return (
    <Routes>
      // Rutas para agente
      <Route
        path="/agente"
        element={
          <ProtectedRoute userData={userData} allowedRoles="agente">
            <DashboardAgente />
          </ProtectedRoute>
        }
      />
      // Rutas para supervisor
      <Route
        path="/supervisor"
        element={
          <ProtectedRoute userData={userData} allowedRoles="supervisor">
            <DashboardSupervisor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supervisor/hoja-servicio"
        element={
          <ProtectedRoute
            userData={userData}
            allowedRoles={["supervisor", "unidad_operativa"]}
          >
            <CrearHojaServicio />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supervisor/hojas-hoy"
        element={
          <ProtectedRoute
            userData={userData}
            allowedRoles={["supervisor", "unidad_operativa"]}
          >
            <ListaHojasHoy />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supervisor/hoja-servicio/:id"
        element={
          <ProtectedRoute
            userData={userData}
            allowedRoles={["supervisor", "unidad_operativa"]}
          >
            <VerHojaServicio />
          </ProtectedRoute>
        }
      />
      // Rutas para admin
      <Route
        path="/admin"
        element={
          <ProtectedRoute userData={userData} allowedRoles={["admin"]}>
            <DashboardAdmin />
          </ProtectedRoute>
        }
      />
      // Rutas para unidad operativa
      <Route
        path="/unidad_operativa"
        element={
          <ProtectedRoute userData={userData} allowedRoles="unidad_operativa">
            <DashboardUnidadOperativa />
          </ProtectedRoute>
        }
      />
      <Route path="/unidad_operativa/orden/:id" element={<DetalleOrden />} />
      <Route
        path="/unidad_operativa/planificacion/crear"
        element={<CrearPlanificacion />}
      />
      <Route
        path="/unidad_operativa/planificacion/:id"
        element={<VerPlanificacion />}
      />
      // Rutas para jefatura
      <Route
        path="/jefatura"
        element={
          <ProtectedRoute userData={userData} allowedRoles="jefatura">
            <DashboardJefatura />
          </ProtectedRoute>
        }
      />
      {/* Redirección automática */}
      <Route path="*" element={<Navigate to={`/${userData.rol}`} />} />
    </Routes>
  );
}

export default App;
