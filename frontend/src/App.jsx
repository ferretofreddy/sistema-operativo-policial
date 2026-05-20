// frontend/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// Auth
import Login from "./modules/auth/Login";

// Dashboards
import DashboardAdmin from "./modules/admin/DashboardAdmin";
import DashboardSupervisor from "./modules/supervisor/DashboardSupervisor";
import DashboardUnidadOperativa from "./modules/unidad_operativa/DashboardUnidadOperativa";
import DashboardJefatura from "./modules/jefatura/DashboardJefatura";
import DashboardAgente from "./modules/agente/DashboardAgente";

function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Dashboards */}
      <Route path="/admin" element={<DashboardAdmin />} />
      <Route path="/supervisor" element={<DashboardSupervisor />} />
      <Route path="/unidad-operativa" element={<DashboardUnidadOperativa />} />
      <Route path="/jefatura" element={<DashboardJefatura />} />
      <Route path="/agente" element={<DashboardAgente />} />

      {/* Default */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
