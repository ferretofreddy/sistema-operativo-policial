// frontend/src/App.jsx
import { useContext, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import { ProtectedRoute } from "./shared/components/ProtectedRoute";
import { LoadingFallback } from "./shared/components/LoadingFallback";
import { ErrorBoundary } from "./shared/components/ErrorBoundary";

// 🔹 Auth & Dashboards
const Login = lazy(() => import("./modules/auth/Login"));
const DashboardAgente = lazy(() => import("./modules/agente/DashboardAgente"));
const DashboardSupervisor = lazy(
  () => import("./modules/supervisor/DashboardSupervisor"),
);
const DashboardAdmin = lazy(() => import("./modules/admin/DashboardAdmin"));
const DashboardUnidadOperativa = lazy(
  () => import("./modules/unidad_operativa/DashboardUnidadOperativa"),
);
const DashboardJefatura = lazy(
  () => import("./modules/jefatura/DashboardJefatura"),
);

// 🔹 Módulos Supervisor
const CrearHojaServicio = lazy(
  () => import("./modules/supervisor/hoja_servicio/CrearHojaServicio"),
);
const ListaHojasHoy = lazy(
  () => import("./modules/supervisor/hoja_servicio/ListaHojasHoy"),
);
const VerHojaServicio = lazy(
  () => import("./modules/supervisor/hoja_servicio/VerHojaServicio"),
);
const CrearRecurso = lazy(
  () => import("./modules/supervisor/recursos/CrearRecurso"),
);
const GestionRecurso = lazy(
  () => import("./modules/supervisor/recursos/GestionRecurso"),
);

// 🔹 Módulos Unidad Operativa
const DetalleOrden = lazy(
  () => import("./modules/unidad_operativa/ordenes/DetalleOrden"),
);
const CrearOrden = lazy(
  () => import("./modules/unidad_operativa/ordenes/CrearOrden"),
);
const ListaOrdenes = lazy(
  () => import("./modules/unidad_operativa/ordenes/ListaOrdenes"),
);
const CrearPlanificacion = lazy(
  () => import("./modules/unidad_operativa/planificacion/CrearPlanificacion"),
);
const VerPlanificacion = lazy(
  () => import("./modules/unidad_operativa/planificacion/VerPlanificacion"),
);

// 🔹 Módulos Administración
const CrearRegion = lazy(
  () => import("./modules/administracion/regiones/CrearRegion"),
);
const CrearDelegacion = lazy(
  () => import("./modules/administracion/delegaciones/CrearDelegacion"),
);
const CrearEscuadra = lazy(
  () => import("./modules/administracion/escuadras/CrearEscuadra"),
);
const GestionEscuadra = lazy(
  () => import("./modules/administracion/escuadras/GestionEscuadra"),
);
const CrearUsuario = lazy(
  () => import("./modules/administracion/usuarios/CrearUsuario"),
);
const GestionUsuarios = lazy(
  () => import("./modules/administracion/usuarios/GestionUsuarios"),
);
const GestionTiposRecurso = lazy(
  () => import("./modules/administracion/configuracion/GestionTiposRecurso"),
);
const GestionRangosUsuario = lazy(
  () => import("./modules/administracion/configuracion/GestionRangosUsuario"),
);
const GestionCondicionesUsuario = lazy(
  () =>
    import("./modules/administracion/configuracion/GestionCondicionesUsuario"),
);

function App() {
  const { user, userData, loading } = useContext(AuthContext);

  // 1️⃣ Carga inicial de sesión
  if (loading) return <LoadingFallback />;

  // 2️⃣ No autenticado → Login (también lazy)
  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Login />
      </Suspense>
    );
  }

  // 3️⃣ Autenticado pero sin datos Firestore
  if (!userData) return <LoadingFallback />;

  // 4️⃣ Rutas + Suspense Global
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* 👤 AGENTE */}
          <Route
            path="/agente"
            element={
              <ProtectedRoute userData={userData} allowedRoles="agente">
                <DashboardAgente />
              </ProtectedRoute>
            }
          />

          {/* 👮 SUPERVISOR */}
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
          <Route
            path="/supervisor/recursos"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles={["supervisor", "unidad_operativa", "admin"]}
              >
                <CrearRecurso />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor/gestion-recursos"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles={["supervisor", "unidad_operativa", "admin"]}
              >
                <GestionRecurso />
              </ProtectedRoute>
            }
          />

          {/* 🏢 UNIDAD OPERATIVA */}
          <Route
            path="/unidad_operativa"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles="unidad_operativa"
              >
                <DashboardUnidadOperativa />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unidad_operativa/ordenes/crear"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles="unidad_operativa"
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
                allowedRoles="unidad_operativa"
              >
                <ListaOrdenes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unidad_operativa/orden/:id"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles="unidad_operativa"
              >
                <DetalleOrden />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unidad_operativa/planificacion/crear"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles="unidad_operativa"
              >
                <CrearPlanificacion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unidad_operativa/planificacion/:id"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles="unidad_operativa"
              >
                <VerPlanificacion />
              </ProtectedRoute>
            }
          />

          {/* 🛡️ ADMIN */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute userData={userData} allowedRoles="admin">
                <DashboardAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/regiones"
            element={
              <ProtectedRoute userData={userData} allowedRoles="admin">
                <CrearRegion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/delegaciones"
            element={
              <ProtectedRoute userData={userData} allowedRoles="admin">
                <CrearDelegacion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/escuadras"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles={["unidad_operativa", "admin"]}
              >
                <CrearEscuadra />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute userData={userData} allowedRoles="admin">
                <CrearUsuario />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/gestion-usuarios"
            element={
              <ProtectedRoute userData={userData} allowedRoles="admin">
                <GestionUsuarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/gestion-escuadras"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles={["unidad_operativa", "admin"]}
              >
                <GestionEscuadra />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tipos-recurso"
            element={
              <ProtectedRoute userData={userData} allowedRoles="admin">
                <GestionTiposRecurso />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rangos-usuario"
            element={
              <ProtectedRoute userData={userData} allowedRoles="admin">
                <GestionRangosUsuario />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/condiciones-usuario"
            element={
              <ProtectedRoute userData={userData} allowedRoles="admin">
                <GestionCondicionesUsuario />
              </ProtectedRoute>
            }
          />

          {/* 🌟 JEFATURA */}
          <Route
            path="/jefatura"
            element={
              <ProtectedRoute userData={userData} allowedRoles="jefatura">
                <DashboardJefatura />
              </ProtectedRoute>
            }
          />

          {/* 🔁 Redirección inteligente al dashboard del rol */}
          <Route
            path="*"
            element={<Navigate to={`/${userData.rol}`} replace />}
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
