// frontend/src/modules/supervisor/DashboardSupervisor.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../core";
import { AuthContext } from "../../context/AuthContext";
import { useResponsive } from "../../hooks/useResponsive";
import { usePerfilUsuario } from "../../hooks/usePerfilUsuario";
import { TarjetaPerfil } from "../../shared/components/TarjetaPerfil";
import DesktopLayout from "../../shared/layouts/DesktopLayout";
import MobileLayout from "../../shared/layouts/MobileLayout";

function DashboardSupervisor() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);
  const { isMobile } = useResponsive();
  const { perfil, loadingPerfil } = usePerfilUsuario(userData);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate("/login");
  };

  const menuItems = [
    { label: "📊 Dashboard",       onClick: () => navigate("/supervisor"),                           active: true },
    { label: "📋 Hojas Servicio",  onClick: () => navigate("/supervisor/hojas-hoy") },
    { label: "➕ Crear Hoja",       onClick: () => navigate("/supervisor/hoja-servicio") },
    { label: "🚓 Gestión Recursos", onClick: () => navigate("/supervisor/gestion-recursos") },
    { label: "🗓️ Planificación",    onClick: () => navigate("/unidad_operativa/planificacion") },
    { label: "👥 Gestión Escuadra", onClick: () => navigate("/admin/gestion-escuadras") },
    { label: "🚪 Cerrar Sesión",    onClick: handleLogout },
  ];

  const DashboardContent = () => (
    <div style={containerStyle}>
      {/* Tarjeta de perfil institucional */}
      <TarjetaPerfil
        perfil={perfil}
        loadingPerfil={loadingPerfil}
        mostrarEscuadra={true}
      />

      {/* Módulos operativos */}
      <div style={modulesGridStyle}>
        <ModuleCard
          title="📋 Hojas de Servicio"
          description="Gestión diaria de la operación"
          color="#1e293b"
          actions={[
            { label: "Crear Hoja",    onClick: () => navigate("/supervisor/hoja-servicio") },
            { label: "Hojas del Día", onClick: () => navigate("/supervisor/hojas-hoy") },
          ]}
        />
        <ModuleCard
          title="🚓 Recursos"
          description="Recursos operativos y asignaciones"
          color="#0369a1"
          actions={[
            { label: "Gestión Recursos", onClick: () => navigate("/supervisor/gestion-recursos") },
            { label: "Gestión Escuadra", onClick: () => navigate("/admin/gestion-escuadras") },
          ]}
        />
        <ModuleCard
          title="🗓️ Planificación"
          description="Consulta de planificación operativa"
          color="#0f766e"
          actions={[
            { label: "Mis Planificaciones", onClick: () => navigate("/unidad_operativa/planificacion") },
          ]}
        />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout title="Supervisor" menuItems={menuItems} user={userData} onLogout={handleLogout}>
        <DashboardContent />
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout title="Supervisor" menuItems={menuItems} user={userData} onLogout={handleLogout}>
      <DashboardContent />
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Componentes y estilos
// ─────────────────────────────────────────
const containerStyle = { padding: "20px" };

const modulesGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
};

const ModuleCard = ({ title, description, color = "#1e293b", actions = [] }) => (
  <div style={cardStyle}>
    <div style={{ ...cardAccentStyle, background: color }} />
    <div style={cardBodyStyle}>
      <h2 style={cardTitleStyle}>{title}</h2>
      <p style={cardDescStyle}>{description}</p>
      <div style={actionsStyle}>
        {actions.map((action, i) => (
          <button key={i} onClick={action.onClick} style={{ ...actionBtnStyle, background: color }}>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const cardStyle = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const cardAccentStyle = { height: "4px", width: "100%" };

const cardBodyStyle = {
  padding: "18px 20px 20px 20px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  flex: 1,
};

const cardTitleStyle = { margin: 0, fontSize: "15px", fontWeight: "600", color: "#1e293b" };
const cardDescStyle  = { margin: 0, fontSize: "13px", color: "#64748b" };

const actionsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginTop: "auto",
  paddingTop: "8px",
};

const actionBtnStyle = {
  width: "100%",
  padding: "11px 14px",
  border: "none",
  borderRadius: "8px",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "13px",
  textAlign: "left",
};

export default DashboardSupervisor;
