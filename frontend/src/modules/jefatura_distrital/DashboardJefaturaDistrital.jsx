// frontend/src/modules/jefatura_distrital/DashboardJefaturaDistrital.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../core";
import { AuthContext } from "../../context/AuthContext";
import { useResponsive } from "../../hooks/useResponsive";
import { usePerfilUsuario } from "../../hooks/usePerfilUsuario";
import { TarjetaPerfil } from "../../shared/components/TarjetaPerfil";
import DesktopLayout from "../../shared/layouts/DesktopLayout";
import MobileLayout from "../../shared/layouts/MobileLayout";

function DashboardJefaturaDistrital() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);
  const { isMobile } = useResponsive();
  const { perfil, loadingPerfil } = usePerfilUsuario(userData);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate("/login");
  };

  const menuItems = [
    { label: "📊 Dashboard",          onClick: () => navigate("/jefatura_distrital"),                  active: true },
    { label: "📈 Reportes",            onClick: () => navigate("/jefatura_distrital/reportes") },
    { label: "📋 Hojas Servicio",      onClick: () => navigate("/supervisor/hojas-hoy") },
    { label: "🗓️ Planificación",       onClick: () => navigate("/unidad_operativa/planificacion/crear") },
    { label: "🏛️ Escuadras",           onClick: () => navigate("/admin/escuadras") },
    { label: "👥 Gestión Escuadra",    onClick: () => navigate("/admin/gestion-escuadras") },
    { label: "👤 Gestión Personal",    onClick: () => navigate("/gestion-personal") },
    { label: "🚓 Recursos",            onClick: () => navigate("/supervisor/gestion-recursos") },
    { label: "🚪 Cerrar Sesión",       onClick: handleLogout },
  ];

  const DashboardContent = () => (
    <div style={containerStyle}>
      <TarjetaPerfil
        perfil={perfil}
        loadingPerfil={loadingPerfil}
        mostrarEscuadra={false}
      />

      <div style={metricsGridStyle}>
        <MetricCard label="Operativos Activos"   value="—" />
        <MetricCard label="Recursos Disponibles" value="—" />
        <MetricCard label="Órdenes Hoy"          value="—" />
        <MetricCard label="Reportes Pendientes"  value="—" alerta />
      </div>

      <div style={modulesGridStyle}>
        <ModuleCard
          title="📈 Reportes"
          description="Reportes del distrito"
          color="#1e40af"
          actions={[
            { label: "Generar Reporte", onClick: () => navigate("/jefatura_distrital/reportes") },
          ]}
        />
        <ModuleCard
          title="📋 Hojas de Servicio"
          description="Supervisión de operación diaria"
          color="#1e293b"
          actions={[
            { label: "Ver Hojas del Día", onClick: () => navigate("/supervisor/hojas-hoy") },
            { label: "Ver Órdenes",       onClick: () => navigate("/unidad_operativa/ordenes") },
          ]}
        />
        <ModuleCard
          title="🏛️ Escuadras"
          description="Administración de escuadras del distrito"
          color="#4f46e5"
          actions={[
            { label: "Crear / Editar Escuadras", onClick: () => navigate("/admin/escuadras") },
            { label: "Gestión Operativa",        onClick: () => navigate("/admin/gestion-escuadras") },
          ]}
        />
        <ModuleCard
          title="👥 Personal y Recursos"
          description="Administración operativa del distrito"
          color="#0369a1"
          actions={[
            { label: "Gestionar Personal",   onClick: () => navigate("/gestion-personal") },
            { label: "Administrar Recursos", onClick: () => navigate("/supervisor/gestion-recursos") },
          ]}
        />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout title="Jefatura Distrital" menuItems={menuItems} user={userData} onLogout={handleLogout}>
        <DashboardContent />
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout title="Jefatura Distrital" menuItems={menuItems} user={userData} onLogout={handleLogout}>
      <DashboardContent />
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Componentes y estilos
// ─────────────────────────────────────────
const containerStyle   = { padding: "20px" };

const metricsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "14px",
  marginBottom: "20px",
};

const modulesGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
};

const MetricCard = ({ label, value, alerta = false }) => (
  <div style={{ padding: "16px", borderRadius: "10px", background: alerta ? "#fef2f2" : "#f8fafc", display: "flex", flexDirection: "column", gap: "6px" }}>
    <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: alerta ? "#dc2626" : "#64748b" }}>{label}</span>
    <span style={{ fontSize: "26px", fontWeight: "700", color: "#1e293b" }}>{value}</span>
  </div>
);

const ModuleCard = ({ title, description, color = "#1e293b", actions = [] }) => (
  <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
    <div style={{ height: "4px", background: color }} />
    <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
      <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>{title}</h2>
      <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{description}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto", paddingTop: "8px" }}>
        {actions.map((a, i) => (
          <button key={i} onClick={a.onClick} style={{ width: "100%", padding: "11px 14px", border: "none", borderRadius: "8px", background: color, color: "white", cursor: "pointer", fontWeight: "500", fontSize: "13px", textAlign: "left" }}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default DashboardJefaturaDistrital;
