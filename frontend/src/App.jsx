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
import CrearOrden from "./modules/unidad_operativa/ordenes/CrearOrden";
import ListaOrdenes from "./modules/unidad_operativa/ordenes/ListaOrdenes";
import CrearPlanificacion from "./modules/unidad_operativa/planificacion/CrearPlanificacion";
import VerPlanificacion from "./modules/unidad_operativa/planificacion/VerPlanificacion";
import CrearHojaServicio from "./modules/supervisor/hoja_servicio/CrearHojaServicio";
import ListaHojasHoy from "./modules/supervisor/hoja_servicio/ListaHojasHoy";
import VerHojaServicio from "./modules/supervisor/hoja_servicio/VerHojaServicio";
import CrearRegion from "./modules/administracion/regiones/CrearRegion";
import CrearDelegacion from "./modules/administracion/delegaciones/CrearDelegacion";
import CrearEscuadra from "./modules/administracion/escuadras/CrearEscuadra";
import CrearUsuario from "./modules/administracion/usuarios/CrearUsuario";
import GestionEscuadra from "./modules/administracion/escuadras/GestionEscuadra";
import CrearRecurso from "./modules/supervisor/recursos/CrearRecurso";
import GestionRecurso from "./modules/supervisor/recursos/GestionRecurso";
import GestionUsuarios from "./modules/administracion/usuarios/GestionUsuarios";
import GestionTiposRecurso from "./modules/administracion/configuracion/GestionTiposRecurso";
import GestionRangosUsuario from "./modules/administracion/configuracion/GestionRangosUsuario";
import GestionCondicionesUsuario from "./modules/administracion/configuracion/GestionCondicionesUsuario";

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
      {/* Rutas para agente */}
      <Route
        path="/agente"
        element={
          <ProtectedRoute userData={userData} allowedRoles="agente">
            <DashboardAgente />
          </ProtectedRoute>
        }
      />
      {/* Rutas para supervisor */}
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
      <Route path="/supervisor/recursos" element={<CrearRecurso />} />
      <Route path="/supervisor/gestion-recursos" element={<GestionRecurso />} />
      {/* Rutas para admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute userData={userData} allowedRoles={["admin"]}>
            <DashboardAdmin />
          </ProtectedRoute>
        }
      />
      <Route path="/admin" element={<DashboardAdmin />} />
      <Route path="/admin/regiones" element={<CrearRegion />} />
      <Route path="/admin/delegaciones" element={<CrearDelegacion />} />
      <Route path="/admin/escuadras" element={<CrearEscuadra />} />
      <Route path="/admin/usuarios" element={<CrearUsuario />} />
      <Route path="/admin/gestion-usuarios" element={<GestionUsuarios />} />
      <Route path="/admin/gestion-escuadras" element={<GestionEscuadra />} />
      <Route path="/admin/tipos-recurso" element={<GestionTiposRecurso />} />
      <Route path="/admin/rangos-usuario" element={<GestionRangosUsuario />} />
      <Route
        path="/admin/condiciones-usuario"
        element={<GestionCondicionesUsuario />}
      />
      {/* Rutas para unidad operativa */}
      <Route
        path="/unidad_operativa"
        element={
          <ProtectedRoute userData={userData} allowedRoles="unidad_operativa">
            <DashboardUnidadOperativa />
          </ProtectedRoute>
        }
      />
      <Route
        path="/unidad_operativa/ordenes/crear"
        element={
          <ProtectedRoute
            userData={userData}
            allowedRoles={["unidad_operativa"]}
          >
            <CrearOrden />
          </ProtectedRoute>
        }
      />
      <Route
        path="/unidad_operativa/ordenes"
        element={
          <ProtectedRoute
            userData={userData}
            allowedRoles={["unidad_operativa"]}
          >
            <ListaOrdenes />
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
      {/* Rutas para jefatura */}
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
