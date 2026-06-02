// frontend/src/App.jsx
import { useContext, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
const DashboardJefaturaDistrital = lazy(
  () => import("./modules/jefatura_distrital/DashboardJefaturaDistrital"),
);
const DashboardUnidadOperativaDistrital = lazy(
  () =>
    import("./modules/unidad_operativa_distrital/DashboardUnidadOperativaDistrital"),
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
const GestionDelegacionesDistritales = lazy(
  () =>
    import("./modules/administracion/delegaciones/GestionDelegacionesDistritales"),
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
const GestionPersonal = lazy(
  () => import("./modules/administracion/usuarios/GestionPersonal"),
);

// =========================================
// WILDCARD SEGURO — sin loop infinito
//
// El problema con <Navigate to={`/${userData.rol}`} replace /> en el wildcard:
// cuando el usuario está en /admin, el wildcard también matchea y redirige
// a /admin de nuevo → re-render → redirige → loop infinito.
//
// La solución: verificar si ya estamos en la ruta correcta antes de redirigir.
// Si location.pathname ya empieza con el target, no hacer nada.
// =========================================
function RolRedirect({ rol }) {
  const location = useLocation();
  const target = `/${rol}`;

  // Ya está en la ruta correcta o en una subruta → no redirigir
  if (location.pathname.startsWith(target)) return null;

  return <Navigate to={target} replace />;
}

// =========================================
// APP
// =========================================
function App() {
  const { user, userData, loading } = useContext(AuthContext);

  // 1️⃣ Carga inicial de sesión
  if (loading) return <LoadingFallback />;

  // 2️⃣ No autenticado → Login
  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Login />
      </Suspense>
    );
  }

  // 3️⃣ Autenticado pero sin perfil institucional todavía
  if (!userData) return <LoadingFallback />;

  // 4️⃣ Rutas protegidas
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
                allowedRoles={["supervisor", "unidad_operativa", "jefatura"]}
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
                allowedRoles={["supervisor", "unidad_operativa", "jefatura"]}
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
                allowedRoles={["supervisor", "unidad_operativa", "jefatura"]}
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
                allowedRoles={[
                  "admin",
                  "jefatura",
                  "unidad_operativa",
                  "jefatura_distrital",
                  "unidad_operativa_distrital",
                ]}
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
                allowedRoles={[
                  "admin",
                  "jefatura",
                  "unidad_operativa",
                  "jefatura_distrital",
                  "unidad_operativa_distrital",
                  "supervisor",
                ]}
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
                allowedRoles={[
                  "admin",
                  "jefatura",
                  "unidad_operativa",
                  "jefatura_distrital",
                  "unidad_operativa_distrital",
                  "supervisor",
                ]}
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
                allowedRoles={[
                  "admin",
                  "jefatura",
                  "unidad_operativa",
                  "jefatura_distrital",
                  "unidad_operativa_distrital",
                  "supervisor",
                ]}
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
                allowedRoles={["unidad_operativa", "supervisor"]}
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
                allowedRoles={["unidad_operativa", "supervisor"]}
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
            path="/admin/delegaciones-distritales"
            element={
              <ProtectedRoute userData={userData} allowedRoles="admin">
                <GestionDelegacionesDistritales />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/escuadras"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles={[
                  "admin",
                  "jefatura",
                  "unidad_operativa",
                  "jefatura_distrital",
                  "unidad_operativa_distrital",
                ]}
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
                allowedRoles={[
                  "admin",
                  "jefatura",
                  "unidad_operativa",
                  "jefatura_distrital",
                  "unidad_operativa_distrital",
                  "supervisor",
                ]}
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

          {/* 🌟 JEFATURA DISTRITAL */}
          <Route
            path="/jefatura_distrital"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles="jefatura_distrital"
              >
                <DashboardJefaturaDistrital />
              </ProtectedRoute>
            }
          />

          {/* 🏢 UNIDAD OPERATIVA DISTRITAL */}
          <Route
            path="/unidad_operativa_distrital"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles="unidad_operativa_distrital"
              >
                <DashboardUnidadOperativaDistrital />
              </ProtectedRoute>
            }
          />

          <Route
            path="/gestion-personal"
            element={
              <ProtectedRoute
                userData={userData}
                allowedRoles={[
                  "unidad_operativa",
                  "jefatura",
                  "unidad_operativa_distrital",
                  "jefatura_distrital",
                ]}
              >
                <GestionPersonal />
              </ProtectedRoute>
            }
          />

          {/* 🔁 Wildcard seguro — no causa loop */}
          <Route path="*" element={<RolRedirect rol={userData.rol} />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
